---
title: "Replace GitHub OAuth with Firebase Auth (Google)"
description: "Swap GitHub OAuth server-flow for Firebase Auth (Google provider) using hybrid pattern: Firebase SDK on FE + firebase-admin verify + existing session cookie on BE."
status: implemented
priority: P1
effort: 0.5-1d
branch: feat/firebase-auth
tags: [auth, firebase, google, migration, breaking-change]
created: 2026-04-21
blockedBy: []
blocks: []
supersedes:
  - 260421-0913-github-login-leaderboard
relatedReports: []
---

## Goal

Thay GitHub OAuth bằng Firebase Auth (Google provider). Giữ kiến trúc session cookie BE (httpOnly `sid`) — chỉ đổi lớp provider. Giữ logic merge anonymous progress (`hcl_uid`, 7-day window).

## Success Criteria

- [ ] User click "Login with Google" → Firebase popup → redirect về `/` đã đăng nhập
- [ ] Reload page giữ session (cookie `sid` còn hiệu lực 30 ngày)
- [ ] Logout xoá cả Firebase state + BE session
- [ ] Guest progress 7 ngày merge vào user account sau login lần đầu
- [ ] Leaderboard hiển thị `displayName` + `photoUrl` từ Google
- [ ] `npm run typecheck --prefix app` pass
- [ ] `npm run build --prefix app` + `npm run build:server` pass
- [ ] Xoá hết code GitHub OAuth + env `GITHUB_CLIENT_*`
- [ ] Service account JSON KHÔNG commit vào repo

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth pattern | Hybrid (Firebase FE + session cookie BE) | Giữ httpOnly cookie chống XSS, ít đổi code, verify token 1 lần |
| User schema | Drop & recreate | Dev project, chưa có user thật; tránh schema nullable dư thừa |
| Anonymous merge | Giữ nguyên logic 7-day window | Đã hoạt động tốt, không cần đổi |
| Popup vs redirect | `signInWithPopup` (fallback redirect nếu bị chặn) | UX tốt hơn popup, redirect fallback cho edge case |
| Username/handle | Dùng `displayName` trực tiếp, bỏ `username` unique | Google không có handle khái niệm; KISS |

## Architecture

```
┌─────────── FE ───────────┐       ┌──────────── BE ────────────┐
│  firebase/auth SDK       │       │  firebase-admin (verify)   │
│  signInWithPopup(Google) │       │                            │
│     → idToken            │──────▶│  POST /auth/firebase/session│
│                          │       │    verifyIdToken()         │
│                          │       │    upsert users            │
│                          │       │    merge hcl_uid progress  │
│                          │       │    INSERT sessions         │
│                          │◀──────│    Set-Cookie: sid=…       │
│  useAuth() reads /api/me │       │  sessionMiddleware cũ      │
└──────────────────────────┘       └────────────────────────────┘
```

## Phases

| # | File | Focus | Status |
|---|------|-------|--------|
| 1 | [phase-01-backend.md](phase-01-backend.md) | DB migration + firebase-admin + routes + session middleware | done |
| 2 | [phase-02-frontend.md](phase-02-frontend.md) | Firebase SDK init + auth-context + login-button + api types | done |
| 3 | [phase-03-cleanup-deploy.md](phase-03-cleanup-deploy.md) | Remove GitHub code, env docs, leaderboard update, smoke test | done (code) / pending (manual smoke test) |

## Risks

| Risk | Mitigation |
|------|------------|
| Service account JSON leak | Base64 encode trong env var, `.env*` đã gitignore, doc rõ trong phase 3 |
| Popup blocker | Try `signInWithPopup` → catch `auth/popup-blocked` → fallback `signInWithRedirect` |
| Firebase authorized domains | Phase 3 checklist: thêm prod domain + `localhost` trong Firebase Console |
| Stale session sau drop table | Migration `DROP TABLE sessions` → tất cả user phải login lại (chấp nhận được, dev project) |
| CSP block Firebase endpoints | Update `csp-middleware.js` cho `*.googleapis.com`, `*.firebaseapp.com` |

## Security Considerations

- Service account JSON: env only, không commit, không log
- ID token verify bằng `firebase-admin` (không trust client claim)
- httpOnly cookie giữ nguyên — XSS không đọc được session
- Rate limit `/auth/*` giữ nguyên (10/min/IP)
- CORS: Firebase Auth Google flow chạy client-side, không cần CORS FE↔Google

## Open Questions

- ~~Giữ field `username` làm handle riêng hay dùng `displayName`?~~ → **Chốt:** dùng `displayName` trực tiếp, leaderboard hiển thị tên Google
- Có cần UI cho "edit display name" không? → **Tạm bỏ** (YAGNI, dùng thẳng từ Google)

## Next Steps

1. Chạy phase 1: BE migration + firebase-admin setup
2. Chạy phase 2: FE Firebase SDK integration
3. Chạy phase 3: cleanup + deploy config + smoke test
4. Commit message: `feat(auth): replace GitHub OAuth with Firebase Auth (Google)`
