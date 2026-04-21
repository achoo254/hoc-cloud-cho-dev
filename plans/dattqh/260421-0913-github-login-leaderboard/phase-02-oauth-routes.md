# Phase 2: OAuth Routes

**Priority:** P0 | **Status:** completed | **Effort:** 4h

## Context Links
- [Phase 1: Database Migration](phase-01-database-migration.md)
- [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)

## Overview

Implement GitHub OAuth flow: redirect to GitHub, handle callback, create session, auto-merge anonymous progress.

## Key Insights

- Use `state` param for CSRF protection (random string, verify on callback)
- Exchange code for access_token, then fetch user profile
- Auto-merge: link `hcl_uid` cookie to new user_id before creating session

## Requirements

**Functional:**
- `GET /auth/github` — redirect to GitHub authorize
- `GET /auth/github/callback` — exchange code, create user, create session
- `POST /auth/logout` — delete session, clear cookie

**Non-functional:**
- CSRF protection via `state` param
- Rate limit: 10 req/min/IP on /auth/*

## OAuth Flow

```
1. User clicks "Login with GitHub"
2. GET /auth/github
   → Generate random state, store in short-lived cookie
   → Redirect to: github.com/login/oauth/authorize?client_id=...&state=...
3. User authorizes on GitHub
4. GitHub redirects to: /auth/github/callback?code=...&state=...
5. GET /auth/github/callback
   → Verify state matches cookie
   → POST github.com/login/oauth/access_token (exchange code)
   → GET api.github.com/user (fetch profile)
   → Upsert users table
   → Auto-merge: UPDATE progress SET user_id=? WHERE user_uuid=? AND user_id IS NULL
   → Create session: INSERT sessions(token_hash, user_id, expires_at)
   → Set cookie: sid=<token>
   → Redirect to /
```

## Related Code Files

**Create:**
- `server/auth/github-oauth.js` — OAuth routes

**Modify:**
- `server/server.js` — mount auth routes

## Implementation Steps

1. Install dependency:
   ```bash
   npm install @hono/oauth-providers
   ```

2. Create `server/auth/github-oauth.js`:
   ```js
   import { Hono } from 'hono';
   import { randomBytes, createHash } from 'node:crypto';
   import db from '../db/sqlite-client.js';

   const app = new Hono();

   const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
   const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
   // [VALIDATION] Changed from 7 to 30 days per user preference
   const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

   // Helper: SHA-256 hash
   const sha256 = (str) => createHash('sha256').update(str).digest('hex');

   // Helper: parse cookies
   const parseCookies = (header) => {
     const out = {};
     if (!header) return out;
     for (const pair of header.split(';')) {
       const idx = pair.indexOf('=');
       if (idx < 0) continue;
       out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
     }
     return out;
   };

   // Helper: set cookie
   const setCookie = (c, name, value, maxAge) => {
     const secure = c.req.header('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
     const parts = [`${name}=${value}`, 'Path=/', `Max-Age=${maxAge}`, 'HttpOnly', 'SameSite=Lax'];
     if (secure) parts.push('Secure');
     c.header('Set-Cookie', parts.join('; '), { append: true });
   };

   // GET /auth/github — initiate OAuth
   app.get('/auth/github', (c) => {
     const state = randomBytes(16).toString('hex');
     // [RED TEAM FIX] Increase TTL to 10 min for slow MFA flows
     setCookie(c, 'oauth_state', state, 600); // 10 min expiry

     const params = new URLSearchParams({
       client_id: GITHUB_CLIENT_ID,
       redirect_uri: `${process.env.PUBLIC_BASE_URL}/auth/github/callback`,
       scope: 'read:user',
       state,
     });

     return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
   });

   // GET /auth/github/callback — handle OAuth callback
   app.get('/auth/github/callback', async (c) => {
     const { code, state } = c.req.query();
     const cookies = parseCookies(c.req.header('cookie'));

     // Verify state
     if (!state || state !== cookies.oauth_state) {
       return c.redirect('/?error=invalid_state');
     }

     // Clear state cookie
     setCookie(c, 'oauth_state', '', 0);

     try {
       // Exchange code for token
       const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           Accept: 'application/json',
         },
         body: JSON.stringify({
           client_id: GITHUB_CLIENT_ID,
           client_secret: GITHUB_CLIENT_SECRET,
           code,
         }),
       });
       const tokenData = await tokenRes.json();

       if (!tokenData.access_token) {
         return c.redirect('/?error=token_failed');
       }

       // Fetch user profile
       const userRes = await fetch('https://api.github.com/user', {
         headers: { Authorization: `Bearer ${tokenData.access_token}` },
       });
       // [RED TEAM FIX] Validate GitHub API response
       if (!userRes.ok) {
         console.error('[oauth] GitHub API error:', userRes.status);
         return c.redirect('/?error=github_api_failed');
       }
       const ghUser = await userRes.json();
       if (!ghUser.id || !ghUser.login) {
         console.error('[oauth] Invalid GitHub user response');
         return c.redirect('/?error=invalid_github_user');
       }

       // [RED TEAM FIX] Wrap all DB operations in transaction
       const sessionToken = randomBytes(32).toString('hex');
       const tokenHash = sha256(sessionToken);
       const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
       const anonUuid = cookies.hcl_uid;
       // [VALIDATION] Changed from 24h to 7 days per user preference
       const mergeWindowStart = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

       const completeLogin = db.transaction(() => {
         // Upsert user
         db.prepare(`
           INSERT INTO users (github_id, username, avatar_url)
           VALUES (?, ?, ?)
           ON CONFLICT(github_id) DO UPDATE SET
             username = excluded.username,
             avatar_url = excluded.avatar_url
         `).run(ghUser.id, ghUser.login, ghUser.avatar_url);

         const user = db.prepare('SELECT id FROM users WHERE github_id = ?').get(ghUser.id);

         // Auto-merge anonymous progress (only recent, to mitigate shared device)
         if (anonUuid) {
           db.prepare(`
             UPDATE progress SET user_id = ?
             WHERE user_uuid = ? AND user_id IS NULL AND last_updated > ?
           `).run(user.id, anonUuid, mergeWindowStart);
         }

         // Create session
         db.prepare(`
           INSERT INTO sessions (token_hash, user_id, expires_at)
           VALUES (?, ?, ?)
         `).run(tokenHash, user.id, expiresAt);

         return user;
       });

       const user = completeLogin();

       // Set session cookie
       setCookie(c, 'sid', sessionToken, SESSION_MAX_AGE);

       return c.redirect('/');
     } catch (err) {
       console.error('[oauth] callback error:', err);
       return c.redirect('/?error=oauth_failed');
     }
   });

   // POST /auth/logout — clear session
   app.post('/auth/logout', (c) => {
     const cookies = parseCookies(c.req.header('cookie'));
     const sid = cookies.sid;

     if (sid) {
       const hash = sha256(sid);
       db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
     }

     setCookie(c, 'sid', '', 0);
     return c.json({ ok: true });
   });

   export const authRoutes = app;
   ```

3. Mount in `server/server.js`:
   ```js
   const { authRoutes } = await import('./auth/github-oauth.js');
   // ...
   app.route('/', authRoutes);
   ```

4. Add env vars to `.env.example`

## Todo List

- [x] Install `@hono/oauth-providers` (optional, we do manual)
- [x] Create `server/auth/github-oauth.js`
- [x] Mount routes in `server/server.js`
- [x] Update `.env.example` with GitHub OAuth vars
- [x] Test: login flow end-to-end
- [x] Test: logout clears session
- [x] Test: auto-merge anonymous progress

## Success Criteria

- Login redirects to GitHub, returns with session cookie
- User created in `users` table
- Session created in `sessions` table
- Anonymous progress linked to user_id
- Logout clears cookie and deletes session row

## Security Considerations

- State param prevents CSRF on OAuth flow
- Session token is 32 random bytes (256 bits)
- Only hash stored in DB
- Cookie: HttpOnly, SameSite=Lax, Secure in prod
