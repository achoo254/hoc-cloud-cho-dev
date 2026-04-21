# Phase 1 — Backend (DB + firebase-admin + routes)

**Priority:** P1 | **Status:** pending | **Effort:** 3-4h

## Context Links

- Plan: [plan.md](plan.md)
- Current: `server/auth/github-oauth.js`, `server/auth/session-middleware.js`, `server/db/migrations/002-auth-tables.sql`

## Requirements

- DB schema mới: `users(firebase_uid, email, display_name, photo_url)` + `sessions` giữ shape cũ
- `firebase-admin` singleton init từ env
- Route mới `POST /auth/firebase/session` thay cho `GET /auth/github*`
- `session-middleware.js` expose `{ id, firebaseUid, email, displayName, photoUrl }`
- `leaderboard-routes.js` đổi select `github_id` → `firebase_uid`, `avatar_url` giữ tên cột `photo_url`
- `progress-routes.js`, `require-auth.js`: chỉ phụ thuộc `user.id` → check không bị ảnh hưởng

## Related Code Files

| File | Action |
|------|--------|
| `server/db/migrations/003-firebase-auth.sql` | Create |
| `server/auth/firebase-admin.js` | Create (singleton init) |
| `server/auth/firebase-auth.js` | Create (routes) |
| `server/auth/session-middleware.js` | Modify |
| `server/auth/github-oauth.js` | Delete ở phase 3 |
| `server/api/leaderboard-routes.js` | Modify |
| `server/server.js` | Modify import |
| `package.json` | Add `firebase-admin` dep |

## Implementation Steps

### 1. Install firebase-admin
```bash
npm i firebase-admin
```

### 2. Create migration `003-firebase-auth.sql`
```sql
-- Drop legacy GitHub-based auth, recreate for Firebase.
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

**Note:** `progress.user_id` FK vẫn trỏ `users.id` → không cần đổi.

### 3. Create `server/auth/firebase-admin.js`
```js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let _auth = null;

export function getFirebaseAuth() {
  if (_auth) return _auth;
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
    // Support both base64 and raw JSON for convenience
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({
      credential: cert(JSON.parse(json)),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  _auth = getAuth();
  return _auth;
}
```

### 4. Create `server/auth/firebase-auth.js`
```js
import { Hono } from 'hono';
import { randomBytes, createHash } from 'node:crypto';
import db from '../db/sqlite-client.js';
import { getFirebaseAuth } from './firebase-admin.js';

const app = new Hono();
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

const parseCookies = (header) => { /* copy từ github-oauth.js */ };
const setCookie = (c, name, value, maxAge) => { /* copy */ };

// Rate limit 10/min/IP (copy pattern từ github-oauth.js)
const rateLimit = /* ... */;
app.use('/auth/*', rateLimit);

app.post('/auth/firebase/session', async (c) => {
  const { idToken } = await c.req.json().catch(() => ({}));
  if (!idToken) return c.json({ error: 'missing_id_token' }, 400);

  let decoded;
  try {
    decoded = await getFirebaseAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error('[firebase-auth] verify failed:', err.code);
    return c.json({ error: 'invalid_id_token' }, 401);
  }

  const { uid, email, name, picture } = decoded;
  const cookies = parseCookies(c.req.header('cookie'));
  const anonUuid = cookies.hcl_uid;
  const mergeWindowStart = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  const sessionToken = randomBytes(32).toString('hex');
  const tokenHash = sha256(sessionToken);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (firebase_uid, email, display_name, photo_url)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(firebase_uid) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        photo_url = excluded.photo_url
    `).run(uid, email ?? null, name ?? null, picture ?? null);

    const user = db.prepare('SELECT id FROM users WHERE firebase_uid = ?').get(uid);

    if (anonUuid) {
      db.prepare(`
        UPDATE progress SET user_id = ?
        WHERE user_uuid = ? AND user_id IS NULL AND last_updated > ?
      `).run(user.id, anonUuid, mergeWindowStart);
    }

    db.prepare(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenHash, user.id, expiresAt);

    return user;
  });
  tx();

  setCookie(c, 'sid', sessionToken, SESSION_MAX_AGE);
  return c.json({ ok: true });
});

app.post('/auth/logout', (c) => {
  const cookies = parseCookies(c.req.header('cookie'));
  const sid = cookies.sid;
  if (sid) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(sid));
  setCookie(c, 'sid', '', 0);
  return c.json({ ok: true });
});

export const authRoutes = app;
```

**DRY note:** `parseCookies` / `setCookie` / `rateLimit` đang dup từ `github-oauth.js`. Sau khi xoá file kia (phase 3), cân nhắc extract vào `server/auth/http-helpers.js`. Hoặc để inline — YAGNI, file < 200 lines.

### 5. Update `server/auth/session-middleware.js`
```js
const selectSession = db.prepare(`
  SELECT u.id, u.firebase_uid, u.email, u.display_name, u.photo_url, s.expires_at
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ?
`);

// trong middleware:
c.set('user', {
  id: row.id,
  firebaseUid: row.firebase_uid,
  email: row.email,
  displayName: row.display_name,
  photoUrl: row.photo_url,
});
```

### 6. Update `server/api/leaderboard-routes.js`
```js
const selectLeaderboard = db.prepare(`
  SELECT
    u.firebase_uid,
    u.display_name,
    u.photo_url,
    COUNT(DISTINCT CASE WHEN p.completed_at IS NOT NULL THEN p.lab_slug END) as completed_count,
    AVG(CASE WHEN p.quiz_score IS NOT NULL THEN p.quiz_score END) as avg_score,
    MAX(p.last_updated) as last_active
  FROM users u
  LEFT JOIN progress p ON p.user_id = u.id
  GROUP BY u.id
  HAVING completed_count > 0
  ORDER BY completed_count DESC, avg_score DESC NULLS LAST
  LIMIT 10
`);
// mapping: githubId → firebaseUid, username → displayName, avatarUrl → photoUrl
```

Check `/api/me` response shape — tìm route trả `user` object (trong `server.js` hoặc `progress-routes.js`), update field names tương ứng.

### 7. Update `server/server.js`
```js
const { authRoutes } = await import('./auth/firebase-auth.js'); // was github-oauth.js
```

## Todo

- [ ] `npm i firebase-admin`
- [ ] Tạo `003-firebase-auth.sql`
- [ ] Tạo `firebase-admin.js`
- [ ] Tạo `firebase-auth.js` (port rate limit + cookie helpers)
- [ ] Update `session-middleware.js`
- [ ] Update `leaderboard-routes.js`
- [ ] Update `/api/me` nếu có
- [ ] Update `server.js` import
- [ ] `npm run build:server` pass
- [ ] Manual test: gửi fake ID token → 401

## Success Criteria

- [ ] Migration chạy clean trên DB empty
- [ ] `firebase-admin` init thành công với env hợp lệ
- [ ] `POST /auth/firebase/session` với token giả → 401
- [ ] Build server pass

## Status

**DONE_WITH_CONCERNS** điều kiện: cần FE phase 2 để test end-to-end
