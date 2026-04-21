# Phase 3 — Cleanup + Deploy Config + Smoke Test

**Priority:** P1 | **Status:** pending | **Effort:** 1-2h | **Depends on:** phase-01, phase-02

## Context Links

- Plan: [plan.md](plan.md)

## Requirements

- Xoá code GitHub OAuth
- Xoá env GitHub khỏi `.env*` + CI
- Thêm env Firebase vào deploy config
- Firebase Console: authorized domains + enable Google provider
- Smoke test end-to-end
- Update docs nếu có

## Related Code Files

| File | Action |
|------|--------|
| `server/auth/github-oauth.js` | Delete |
| `server/db/migrations/002-auth-tables.sql` | Keep (historical) |
| `.env*` | Remove GITHUB_*, add FIREBASE_* |
| `.github/workflows/*.yml` | Update secrets |
| `deploy/nginx*` hoặc deploy scripts | Verify `/auth/*` proxy vẫn work |
| `docs/codebase-summary.md` | Update auth section (nếu tồn tại) |
| `CLAUDE.md` | Update nếu có nhắc GitHub OAuth |

## Implementation Steps

### 1. Firebase Console checklist
- [ ] Authentication → Sign-in method → enable Google provider
- [ ] Authentication → Settings → Authorized domains: thêm `localhost` (đã có sẵn), prod domain
- [ ] Project Settings → Service accounts → Generate new private key → lưu JSON an toàn
- [ ] Project Settings → General → Your apps → Web app → copy config (apiKey, authDomain, projectId, appId)

### 2. Encode service account
```bash
# Linux/Mac
base64 -w0 service-account.json > sa.b64
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

### 3. Update `.env` files (dev + prod)
```
# Remove
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# Add
FIREBASE_PROJECT_ID=your-project
FIREBASE_SERVICE_ACCOUNT_JSON=<base64-encoded>

# FE (dev only, build-time inlined):
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:...:web:...
```

### 4. Update CI/CD
- Xoá secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Thêm secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `VITE_FIREBASE_*`
- Verify build step truyền `VITE_FIREBASE_*` vào lúc `npm run build --prefix app`

### 5. Delete `server/auth/github-oauth.js`

### 6. Update CLAUDE.md / docs
- Search: `grep -ri "github.*oauth\|GITHUB_CLIENT" docs/ CLAUDE.md README.md 2>/dev/null`
- Replace mô tả auth flow

### 7. Smoke test
- [ ] Fresh DB: `rm data/hoccloud.db` → khởi động server → migrations chạy clean
- [ ] Browser: truy cập guest → làm 1 lab → mở quiz (nếu được phép guest)
- [ ] Click Login → Google popup → chọn account
- [ ] Verify: redirect về `/`, avatar hiện, cookie `sid` set, không còn cookie `oauth_state`
- [ ] Check DB: `SELECT * FROM users; SELECT * FROM sessions;` có row mới
- [ ] Check progress merge: guest progress đã gắn `user_id`
- [ ] Logout → avatar mất → Firebase `currentUser` = null
- [ ] Reload sau login → vẫn đăng nhập (cookie sid)
- [ ] Test popup blocker: disable popup trong browser → click Login → rơi vào `signInWithRedirect`
- [ ] Leaderboard: hiện user mới với displayName + photo
- [ ] `curl -X POST http://localhost:8387/auth/firebase/session -d '{"idToken":"fake"}' -H "Content-Type: application/json"` → 401

### 8. Final checks
- [ ] `npm run typecheck --prefix app` pass
- [ ] `npm run build --prefix app` pass
- [ ] `npm run build:server` pass
- [ ] `git grep -i "github_id\|GITHUB_CLIENT\|github-oauth"` → chỉ còn trong migration 002 (historical) hoặc 0 kết quả
- [ ] Service account JSON không có trong `git status`

## Todo

- [ ] Firebase Console setup
- [ ] Update `.env` + `.env.example` + `.env.production`
- [ ] Update CI secrets
- [ ] Xoá `github-oauth.js`
- [ ] Update docs/README/CLAUDE.md
- [ ] Smoke test full flow
- [ ] Test popup fallback
- [ ] Grep verify no GitHub refs

## Success Criteria

- [ ] Không còn code hoặc env reference đến GitHub OAuth
- [ ] Full login/logout/reload flow work
- [ ] Anonymous progress merge work
- [ ] Leaderboard hiển thị đúng
- [ ] Build + deploy pipeline green
- [ ] Service account JSON secure (không commit, không log)

## Status

Pending phase-02 hoàn thành.
