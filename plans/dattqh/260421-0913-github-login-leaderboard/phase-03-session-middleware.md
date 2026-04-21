# Phase 3: Session Middleware

**Priority:** P0 | **Status:** completed | **Effort:** 2h

## Context Links
- [Phase 2: OAuth Routes](phase-02-oauth-routes.md)
- [Current anon-uuid-cookie.js](../../../server/lib/anon-uuid-cookie.js)

## Overview

Create middleware to load authenticated user from session cookie. Create guard middleware to protect routes requiring authentication.

## Key Insights

- Middleware sets `c.get('user')` if valid session exists
- Guard middleware returns 401 if no user
- Keep anon UUID middleware for guests (they still get UUID cookie)

## Requirements

**Functional:**
- Session middleware: load user from `sid` cookie
- Require-auth middleware: 401 if not authenticated
- Expired sessions auto-cleaned on check

**Non-functional:**
- Single DB query per request (join users + sessions)
- Don't block if no session (just don't set user)

## Related Code Files

**Create:**
- `server/auth/session-middleware.js`
- `server/auth/require-auth.js`

## Implementation Steps

1. Create `server/auth/session-middleware.js`:
   ```js
   import { createHash } from 'node:crypto';
   import db from '../db/sqlite-client.js';

   const sha256 = (str) => createHash('sha256').update(str).digest('hex');

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

   const selectSession = db.prepare(`
     SELECT u.id, u.github_id, u.username, u.avatar_url, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
   `);

   const deleteExpired = db.prepare('DELETE FROM sessions WHERE token_hash = ?');

   export const sessionMiddleware = async (c, next) => {
     const cookies = parseCookies(c.req.header('cookie'));
     const sid = cookies.sid;

     if (sid) {
       const hash = sha256(sid);
       const row = selectSession.get(hash);

       if (row) {
         const now = Math.floor(Date.now() / 1000);
         if (row.expires_at > now) {
           // Valid session — set user context
           c.set('user', {
             id: row.id,
             githubId: row.github_id,
             username: row.username,
             avatarUrl: row.avatar_url,
           });
         } else {
           // Expired — clean up
           deleteExpired.run(hash);
         }
       }
     }

     await next();
   };
   ```

2. Create `server/auth/require-auth.js`:
   ```js
   export const requireAuth = (c, next) => {
     const user = c.get('user');
     if (!user) {
       return c.json({ error: 'unauthorized' }, 401);
     }
     return next();
   };
   ```

3. Mount session middleware globally in `server/server.js`:
   ```js
   const { sessionMiddleware } = await import('./auth/session-middleware.js');
   // ...
   app.use('*', sessionMiddleware);
   ```

## Todo List

- [x] Create `server/auth/session-middleware.js`
- [x] Create `server/auth/require-auth.js`
- [x] Mount session middleware in `server/server.js`
- [x] Test: valid session sets user context
- [x] Test: expired session auto-deletes
- [x] Test: no session = no user (but request continues)

## Success Criteria

- Valid session → `c.get('user')` returns user object
- Expired session → deleted, no user set
- No session → no user set, request continues
- `requireAuth` middleware returns 401 if no user

## Security Considerations

- Only hash compared, never plaintext token
- Expired sessions cleaned on access (eventual cleanup)
- Add cron job for bulk cleanup (Phase 7)
