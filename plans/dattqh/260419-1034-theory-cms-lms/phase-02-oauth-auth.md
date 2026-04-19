# Phase 2: GitHub OAuth + Admin Guard

**Priority:** P1 | **Status:** pending | **Effort:** 1d

## Goal
Login qua GitHub, whitelist check, session cookie. Non-whitelisted user bị 403.

## Requirements
- Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ADMIN_WHITELIST` (comma-separated), `SESSION_SECRET`
- Cookie: httpOnly, Secure (prod), SameSite=Lax, expiry 7 ngày
- OAuth state param để chống CSRF

## Implementation Steps

### 1. Install
```bash
npm i @hono/oauth-providers
```

### 2. `server/auth/github-oauth.js`
- Route `GET /auth/github` → redirect GitHub với `state` (random, lưu vào short-lived cookie)
- Route `GET /auth/github/callback` → verify state → exchange code → fetch user → check whitelist → tạo session
- Session: sha256(token) → insert `admin_sessions(token_hash, github_user, expires_at)`, set cookie `sid=token`

### 3. `server/auth/session-middleware.js`
```js
export const sessionMiddleware = async (c, next) => {
  const sid = getCookie(c, 'sid');
  if (!sid) return next();
  const hash = sha256(sid);
  const row = db.prepare('SELECT github_user, expires_at FROM admin_sessions WHERE token_hash=?').get(hash);
  if (row && row.expires_at > Date.now()) {
    c.set('user', { github: row.github_user });
  }
  return next();
};
```

### 4. `server/auth/admin-guard.js`
```js
export const adminGuard = (c, next) => {
  const u = c.get('user');
  const whitelist = (process.env.GITHUB_ADMIN_WHITELIST || '').split(',').map(s => s.trim());
  if (!u || !whitelist.includes(u.github)) {
    return c.redirect('/admin/login');
  }
  return next();
};
```

### 5. CSRF token middleware cho admin POST/PUT/DELETE
- GET `/admin/*` render token vào meta tag
- POST/PUT/DELETE check header `X-CSRF-Token` khớp session-derived token

### 6. Logout route `POST /auth/logout`
- Delete session row, clear cookie

## CSP Middleware (thêm cùng phase này)
```js
// server/lib/csp-middleware.js
export const cspMiddleware = (c, next) => {
  c.header('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'"
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  return next();
};
```
Apply global cho mọi response.

## Security Checklist
- [ ] OAuth `state` random 32 bytes, single-use
- [ ] Session token từ `crypto.randomBytes(32).toString('hex')`
- [ ] DB lưu `sha256(token)`, không lưu plaintext
- [ ] Cookie `Secure` trong prod (check `NODE_ENV`)
- [ ] Rate limit `/auth/*` (10 req/min/IP)
- [ ] Cron xóa expired sessions: `DELETE FROM admin_sessions WHERE expires_at < ?`

## Tasks
- [ ] Install deps
- [ ] Implement github-oauth.js
- [ ] Implement session-middleware + admin-guard
- [ ] CSRF token helper
- [ ] Login page HTML (`server/admin/views/login.html`)
- [ ] Logout route
- [ ] Test flow: login → whitelist miss → 403; whitelist hit → `/admin` OK
- [ ] Test expired session → redirect login

## Acceptance
- User trong whitelist login được, thấy `/admin` dashboard
- User không trong whitelist bị redirect login với error message
- Session hết hạn → auto logout
- CSRF token verify đúng
