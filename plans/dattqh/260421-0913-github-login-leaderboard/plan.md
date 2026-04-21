---
title: "GitHub OAuth Login + Public Leaderboard"
description: "Add GitHub OAuth for user tracking, auto-merge anonymous progress, public leaderboard showing all learners"
status: completed
priority: P1
effort: 2-3d
branch: feat/github-auth
tags: [auth, oauth, github, leaderboard, sqlite, hono]
created: 2026-04-21
blockedBy: []
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260421-0913-github-login-leaderboard.md
---

## Goal

Enable GitHub OAuth login to unlock quiz tracking, progress persistence, and roadmap features. Guests remain view-only (content + playground). Add public leaderboard showing all learners' progress on homepage.

## Success Criteria

- [x] GitHub OAuth login/logout works end-to-end
- [x] Anonymous progress auto-merges to GitHub account on first login
- [x] Logged users can take quizzes with progress saved
- [x] Guests can view content + use playgrounds (no quiz submit)
- [x] Public leaderboard shows top 50 learners (username, avatar, completed, avg score)
- [x] Session persists across browser restart (30 days)
- [x] Security: CSRF state, hashed tokens, HttpOnly cookies

## Key Decisions

| Topic | Decision |
|-------|----------|
| Auth provider | GitHub OAuth only |
| Session storage | SQLite table (not JWT) |
| Progress migration | Auto-merge anonymous UUID → user_id |
| Leaderboard | Real-time query, no cache |
| Guest access | View content + playground, no quiz submit |
| Roles | None — all logged users equal |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ AuthContext  │ LoginButton  │ Leaderboard  │ QuizGuard      │
│ (user state) │ (header)     │ (homepage)   │ (require auth) │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Hono API Server                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ /auth/*      │ /api/me      │ /api/leader- │ /api/progress  │
│ OAuth flow   │ current user │ board        │ (auth required)│
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                │
       ▼              ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Database                         │
├──────────────┬──────────────┬───────────────────────────────┤
│ users        │ sessions     │ progress                       │
│ (github_id)  │ (token_hash) │ (user_id nullable)            │
└──────────────┴──────────────┴───────────────────────────────┘
```

## Phases

| # | Phase | Priority | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | [Database Migration](phase-01-database-migration.md) | P0 | 2h | completed |
| 2 | [OAuth Routes](phase-02-oauth-routes.md) | P0 | 4h | completed |
| 3 | [Session Middleware](phase-03-session-middleware.md) | P0 | 2h | completed |
| 4 | [API Updates](phase-04-api-updates.md) | P1 | 3h | completed |
| 5 | [Frontend Auth](phase-05-frontend-auth.md) | P1 | 4h | completed |
| 6 | [Leaderboard UI](phase-06-leaderboard-ui.md) | P1 | 3h | completed |
| 7 | [Testing & Security](phase-07-testing-security.md) | P1 | 2h | completed |

## Environment Variables

```bash
# Add to .env.example and .env
GITHUB_CLIENT_ID=<from GitHub OAuth App>
GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
PUBLIC_BASE_URL=https://hoc-cloud.inetdev.io.vn  # [RED TEAM FIX] Required for OAuth redirect
# SESSION_SECRET removed — not used in current implementation (plain SHA-256 is sufficient)
```

## GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps → New
2. Application name: `Hoc Cloud`
3. Homepage URL: `https://hoc-cloud.inetdev.io.vn`
4. Authorization callback URL: `https://hoc-cloud.inetdev.io.vn/auth/github/callback`
5. Copy Client ID and Client Secret to `.env`

## Dependencies

```bash
npm install @hono/oauth-providers
```

## File Changes Summary

### New Files
- `server/db/migrations/002-auth-tables.sql`
- `server/auth/github-oauth.js`
- `server/auth/session-middleware.js`
- `server/auth/require-auth.js`
- `server/api/auth-routes.js`
- `server/api/leaderboard-routes.js`
- `app/src/contexts/auth-context.tsx`
- `app/src/components/auth/login-button.tsx`
- `app/src/components/dashboard/leaderboard-section.tsx`

### Modified Files
- `server/server.js` — mount auth routes
- `server/api/progress-routes.js` — require auth for POST
- `app/src/components/layout/site-header.tsx` — add login button
- `app/src/components/dashboard/dashboard-layout.tsx` — add leaderboard
- `.env.example` — add new env vars

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| OAuth callback fails | Fallback redirect to / with error toast |
| Session table grows | Cron job to delete expired sessions |
| Anonymous data lost | Transaction wraps all merge operations |
| Rate limit abuse | 10 req/min/IP on /auth/* (in-memory, resets on restart) |
| Shared device progress merge | Only merge progress from last 7 days |
| Multi-device duplicate progress | Unique constraint on (user_id, lab_slug) |

## Red Team Review

### Session — 2026-04-21
**Findings:** 15 (13 accepted, 2 rejected)
**Severity breakdown:** 2 Critical, 10 High, 3 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | No Transaction on Merge | Critical | Accept | Phase 2 |
| 2 | Progress Unique Constraint Missing | Critical | Accept | Phase 1 |
| 3 | PUBLIC_BASE_URL Missing | High | Accept | plan.md |
| 4 | Rate Limiter Memory Issues | High | Accept | Phase 7 |
| 5 | XFF IP Spoofing | High | Accept | Phase 7 |
| 6 | oauth_state Multi-Tab Race | High | Accept | Phase 2 |
| 7 | GitHub API Response Not Validated | High | Accept | Phase 2 |
| 8 | SESSION_SECRET Unused | Medium | Accept | plan.md |
| 9 | Shared Device Merge Risk | High | Accept | Phase 2 |
| 10 | CSRF on Logout | High | Reject | — |
| 11 | Internal ID Exposed | High | Accept | Phase 4 |
| 12 | avg_score 0% vs N/A | Medium | Accept | Phase 4, 6 |
| 13 | LIMIT 50 vs UI 10 | Medium | Accept | Phase 4, 6 |
| 14 | Username as React Key | Medium | Accept | Phase 6 |
| 15 | Session No Rotation | Medium | Reject | — |

**Key fixes applied:**
- Wrapped OAuth callback DB operations in transaction
- Added unique constraint `(user_id, lab_slug)` for authenticated users
- Added `PUBLIC_BASE_URL` to required env vars
- Increased oauth_state TTL from 5 to 10 minutes
- Only merge anonymous progress from last 7 days
- Strip internal `id` from `/api/me` response
- Return `null` for avg_score when no quiz data
- Use `githubId` for React keys and user comparison

## Validation Log

### Session 1 — 2026-04-21
**Trigger:** Pre-implementation validation after Red Team review
**Questions asked:** 4

#### Questions & Answers

1. **[Scope]** Merge anonymous progress chỉ trong 24h gần nhất. Thời gian này có phù hợp không?
   - Options: 24h là đủ | 7 ngày | Không giới hạn | Không auto-merge
   - **Answer:** 7 ngày
   - **Rationale:** User muốn cho phép quay lại sau vài ngày vẫn giữ progress

2. **[Architecture]** Rate limiter in-memory sẽ reset khi server restart. Chấp nhận được cho production không?
   - Options: Chấp nhận | Dùng SQLite | Dùng Redis
   - **Answer:** Chấp nhận (Recommended)
   - **Rationale:** Scale hiện tại nhỏ, thêm nginx rate limit nếu cần sau

3. **[Scope]** Session duration 7 ngày. Bạn muốn điều chỉnh không?
   - Options: 7 ngày là OK | 30 ngày | 1 ngày
   - **Answer:** 30 ngày
   - **Rationale:** User ưu tiên convenience, ít phải login lại

4. **[Risk]** Leaderboard real-time query (no cache). Với traffic hiện tại, chấp nhận được không?
   - Options: Real-time OK | Thêm server cache 60s | Materialize vào table
   - **Answer:** Real-time OK (Recommended)
   - **Rationale:** Traffic thấp, SQLite đủ nhanh

#### Confirmed Decisions
- Merge window: 7 days (changed from 24h)
- Session TTL: 30 days (changed from 7 days)
- Rate limiter: in-memory (accepted)
- Leaderboard: real-time query (accepted)

#### Impact on Phases
- Phase 2: Updated `mergeWindowStart` from 24h to 7 days
- Phase 2: Updated `SESSION_MAX_AGE` from 7 to 30 days
