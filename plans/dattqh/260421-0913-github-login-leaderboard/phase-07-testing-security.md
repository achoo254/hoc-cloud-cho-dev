# Phase 7: Testing & Security

**Priority:** P1 | **Status:** completed | **Effort:** 2h

## Context Links
- [All previous phases](plan.md)
- [Security requirements](../reports/brainstorm-260421-0913-github-login-leaderboard.md#security)

## Overview

Comprehensive testing of auth flow, progress tracking, and leaderboard. Security hardening: rate limiting, session cleanup cron, CSP updates.

## Key Insights

- Test both happy path and error scenarios
- Rate limit auth endpoints to prevent abuse
- Cron job to clean expired sessions (prevent DB bloat)
- Update CSP for GitHub avatar images

## Requirements

**Functional:**
- All auth flows work correctly
- Progress syncs for logged users
- Leaderboard displays correctly

**Non-functional:**
- Rate limit: 10 req/min/IP on /auth/*
- Session cleanup runs periodically
- Security headers properly set

## Test Cases

### Auth Flow Tests

| Test | Expected |
|------|----------|
| Click Login → GitHub redirect | Redirects to github.com/login/oauth/authorize |
| Complete OAuth → callback | Creates user, session, redirects to / |
| Invalid state on callback | Redirects to /?error=invalid_state |
| Login when already logged | Works (session refreshed) |
| Logout | Clears session cookie, deletes DB row |
| Expired session access | Returns 401, clears cookie |

### Progress Tests

| Test | Expected |
|------|----------|
| Guest GET /api/progress | Returns empty array |
| Guest POST /api/progress | Returns 401 |
| Logged GET /api/progress | Returns user's progress |
| Logged POST /api/progress | Saves with user_id |
| First login with anon progress | Anon data linked to user_id |

### Leaderboard Tests

| Test | Expected |
|------|----------|
| No users with completions | Empty state message |
| Multiple users | Sorted by completed DESC |
| Current user in list | Row highlighted |

## Implementation Steps

1. Add rate limiting to auth routes in `server/auth/github-oauth.js`:
   ```js
   // Simple in-memory rate limiter
   const rateLimitMap = new Map();
   const RATE_LIMIT = 10; // requests
   const RATE_WINDOW = 60 * 1000; // 1 minute

   // [RED TEAM FIX] Trim IP, add cleanup interval
   const rateLimit = (c, next) => {
     // [RED TEAM FIX] Trim whitespace from XFF header
     const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
     const now = Date.now();
     const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

     if (now > entry.resetAt) {
       entry.count = 0;
       entry.resetAt = now + RATE_WINDOW;
     }

     entry.count++;
     rateLimitMap.set(ip, entry);

     if (entry.count > RATE_LIMIT) {
       return c.json({ error: 'rate_limited' }, 429);
     }

     return next();
   };

   // [RED TEAM FIX] Cleanup stale entries every 5 minutes to prevent memory leak
   setInterval(() => {
     const now = Date.now();
     for (const [ip, entry] of rateLimitMap) {
       if (entry.resetAt < now) rateLimitMap.delete(ip);
     }
   }, 5 * 60 * 1000);

   // Apply to all auth routes
   app.use('/auth/*', rateLimit);
   ```

2. Add session cleanup cron in `server/server.js`:
   ```js
   // Clean expired sessions every hour
   const cleanupSessions = () => {
     const now = Math.floor(Date.now() / 1000);
     const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
     if (result.changes > 0) {
       console.log(`[session-cleanup] deleted ${result.changes} expired sessions`);
     }
   };

   // Run on boot and every hour
   cleanupSessions();
   setInterval(cleanupSessions, 60 * 60 * 1000);
   ```

3. Update CSP in `server/lib/csp-middleware.js`:
   ```js
   // Add GitHub avatars to img-src
   "img-src 'self' data: https://avatars.githubusercontent.com; " +
   ```

4. Manual test checklist (execute in browser):
   - [x] Fresh browser → Click Login → Complete GitHub OAuth → See avatar
   - [x] Refresh page → Still logged in
   - [x] Click avatar → Logout → Returns to guest state
   - [x] Complete a quiz while logged → Progress saves
   - [x] Check leaderboard → See your entry
   - [x] Open incognito → Guest state, no progress POST

## Todo List

- [x] Add rate limiting to auth routes
- [x] Add session cleanup interval
- [x] Update CSP for GitHub avatars
- [x] Run manual test checklist
- [x] Test error scenarios (invalid state, expired session)
- [x] Verify security headers in browser DevTools

## Success Criteria

- All test cases pass
- Rate limiting returns 429 after 10 requests
- Expired sessions cleaned automatically
- CSP allows GitHub avatar images
- No security warnings in browser console

## Security Checklist

- [x] OAuth state param (CSRF protection)
- [x] Session token 256-bit random
- [x] Token hashed before DB storage
- [x] Cookie: HttpOnly, SameSite=Lax, Secure (prod)
- [x] Rate limit on /auth/* (this phase)
- [x] Session cleanup cron (this phase)
- [x] CSP img-src includes GitHub (this phase)
- [ ] No sensitive data in logs
- [ ] Error messages don't leak internal details

## Known Limitations (from Red Team)

- **Rate limiter resets on server restart** — In-memory Map, not persisted. For production with high traffic, consider SQLite-backed or nginx-level rate limiting.
- **X-Forwarded-For trust** — Current impl trusts XFF header. If not behind reverse proxy, attacker can spoof IP. Document trusted proxy setup.
- **Multi-tab login** — Opening login in multiple tabs causes state cookie overwrite. Second tab's callback will fail. UX improvement: show clear error message with retry button.

## Deployment Notes

1. Create GitHub OAuth App in production
2. Set env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`
3. Run migration (automatic on boot)
4. Monitor logs for OAuth errors
5. Check leaderboard query performance (add index if slow)
