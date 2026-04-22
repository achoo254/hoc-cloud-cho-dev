---
title: "SQLite to MongoDB + Meilisearch Migration"
description: "Migrate from SQLite (better-sqlite3) to MongoDB (Mongoose) with Meilisearch for full-text search"
status: completed
priority: P1
effort: 1-2d
branch: feat/mongodb-meilisearch
tags: [database, migration, mongodb, meilisearch, breaking-change]
created: 2026-04-22
blockedBy: []
blocks:
  - 260421-1453-self-hosted-web-terminal
relatedReports:
  - plans/dattqh/reports/brainstorm-260422-0803-sqlite-to-mongodb-meilisearch.md
---

## Goal

Migrate database from SQLite to MongoDB + Meilisearch:
- **MongoDB**: Primary data store (users, sessions, progress, labs)
- **Meilisearch**: Full-text search engine (replaces FTS5)
- **Mongoose**: ODM for schema validation + queries

## Success Criteria

- [x] All API endpoints work with MongoDB backend
- [x] Search returns results with typo tolerance via Meilisearch
- [x] User auth/sessions functional
- [x] Progress tracking works for both logged-in and anonymous users
- [x] Leaderboard displays correctly
- [x] Health check reports MongoDB + Meilisearch status
- [x] `npm run build:server` passes
- [x] Labs sync from fixtures → MongoDB → Meilisearch

## Configuration

```env
MONGODB_URI=mongodb://<MONGO_USER>:<MONGO_PASSWORD>@<VPS_HOST>:27017/<DB_NAME>
MEILISEARCH_HOST=http://<VPS_HOST>:7700
MEILISEARCH_API_KEY=<MEILISEARCH_MASTER_KEY>
```

> **[RED TEAM]** Credentials đã bị xóa khỏi plan docs. Password cần được rotate ngay lập tức.

## Architecture

```
fixtures/labs/*.json
       │
       ▼
┌─────────────────┐     sync      ┌─────────────────┐
│    MongoDB      │ ──────────▶   │   Meilisearch   │
│  (Mongoose)     │               │  (labs index)   │
│                 │               │                 │
│  - labs         │               │  typo tolerance │
│  - progress     │               │  highlighting   │
│  - users        │               │  relevance rank │
│  - sessions     │               │                 │
└─────────────────┘               └─────────────────┘
```

## Phases

| # | File | Focus | Status |
|---|------|-------|--------|
| 1 | [phase-01-mongodb-setup.md](phase-01-mongodb-setup.md) | Mongoose connection + models | completed |
| 2 | [phase-02-meilisearch-setup.md](phase-02-meilisearch-setup.md) | Meilisearch client + index config | completed |
| 3 | [phase-03-update-api-routes.md](phase-03-update-api-routes.md) | Migrate all API routes to Mongoose | completed |
| 4 | [phase-04-sync-scripts.md](phase-04-sync-scripts.md) | Update sync-labs + add Meilisearch sync | completed |
| 5 | [phase-05-cleanup-test.md](phase-05-cleanup-test.md) | Remove SQLite, update build, test | completed |

## Files Affected

| File | Action |
|------|--------|
| `package.json` | Add mongoose, meilisearch; Remove better-sqlite3 |
| `server/db/sqlite-client.js` | Remove |
| `server/db/mongo-client.js` | Create |
| `server/db/meilisearch-client.js` | Create |
| `server/db/models/*.js` | Create (Lab, User, Session, Progress) |
| `server/api/search-routes.js` | Update (FTS5 → Meilisearch) |
| `server/api/progress-routes.js` | Update (SQLite → Mongoose) |
| `server/api/leaderboard-routes.js` | Update (SQLite → Mongoose) |
| `server/auth/firebase-auth.js` | Update (SQLite → Mongoose) |
| `server/auth/session-middleware.js` | Update (SQLite → Mongoose) |
| `server/auth/require-auth.js` | **[RED TEAM]** Audit for `user.id` vs `user._id` |
| `server/scripts/sync-labs-to-db.js` | Update (SQLite → Mongoose + Meilisearch) |
| `server/db/migrate.js` | Remove |
| `scripts/build-server-data.mjs` | Simplify (remove SQL bundling) |
| `.env.example` | Add MongoDB + Meilisearch vars |

## Risks

| Risk | Mitigation |
|------|------------|
| Connection failures | Retry logic, graceful degradation |
| Meilisearch out of sync | Sync on lab upsert, health check, cleanup stale docs |
| Build breaks | Phase 5 validates build before cleanup |
| ~~**[RED TEAM]** User data loss~~ | ~~ETL script~~ **[VALIDATION]** Skipped - user data not important |
| **[RED TEAM]** No rollback | Keep SQLite code on branch, test staging 24h before prod |
| ~~**[RED TEAM]** Transaction atomicity~~ | ~~withTransaction()~~ **[VALIDATION]** Skip - use sequential ops |

## Dependencies

- MongoDB installed on VPS (user confirmed)
- Meilisearch installed on VPS port 7700 (user confirmed)

## Red Team Review

### Session — 2026-04-22
**Findings:** 15 (14 accepted, 1 rejected)  
**Severity breakdown:** 4 Critical, 10 High, 1 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Credentials hardcoded in plan docs | Critical | Accept | plan.md, brainstorm.md |
| 2 | Progress upsert sai filter key | Critical | Accept | Phase 3 |
| 3 | firebase-auth transaction atomicity lost | Critical | Accept | Phase 3 |
| 4 | isConnected flag race condition | Critical | Accept | Phase 1 |
| 5 | Search results expose filePath | High | Accept | Phase 3 |
| 6 | Meilisearch API key defaults empty | High | Accept | Phase 2 |
| 7 | Leaderboard exposes firebaseUid | High | Accept | Phase 3 |
| 8 | Progress index NULL collision | High | Accept | Phase 1 |
| 9 | Meilisearch async task race | High | Accept | Phase 2 |
| 10 | Leaderboard $unwind drops orphan users | High | Accept | Phase 3 |
| 11 | No zero-downtime/rollback strategy | High | Accept | Phase 5 |
| 12 | user.id vs user._id inconsistency | High | Accept | Phase 3 |
| 13 | Meilisearch sync stale docs | High | Accept | Phase 4 |
| 14 | No data migration for user progress | High | Accept | Phase 4 |
| 15 | walkthrough Mixed schema XSS risk | Medium | Reject | N/A (frontend sanitizes) |

## Validation Log

### Session 1 — 2026-04-22
**Trigger:** Post-Red-Team validation before implementation  
**Questions asked:** 6

#### Questions & Answers

1. **[Architecture]** MongoDB transactions cần replica set. VPS hiện tại đã cấu hình MongoDB replica set chưa?
   - Options: Đã có replica set | Standalone mongod | Skip transactions
   - **Answer:** Skip transactions
   - **Rationale:** Project còn early stage, chấp nhận partial failure risk. Sequential ops đơn giản hơn.

2. **[Infrastructure]** Có staging VPS để test 24h trước production không?
   - Options: Có staging VPS riêng | Test localhost → deploy prod | Docker staging
   - **Answer:** Có staging VPS riêng
   - **Rationale:** Có thể test đầy đủ trên staging trước khi deploy production.

3. **[Migration]** Khi nào chạy script migrate SQLite → MongoDB?
   - Options: Maintenance window | Hot migration | Skip migration
   - **Answer:** Skip migration - user data không quan trọng
   - **Rationale:** Project early stage, user ít. Không cần ETL script.

4. **[Rollback]** Thời gian giữ SQLite code để rollback bao lâu?
   - Options: 24 giờ | 1 tuần | Vĩnh viễn
   - **Answer:** 24 giờ sau deploy
   - **Rationale:** Đủ thời gian detect major issues.

5. **[Security]** Meilisearch API key: dùng master key hay tạo search-only key?
   - Options: Master key | Search-only key | No key
   - **Answer:** Master key (simple)
   - **Rationale:** Đơn giản hóa setup, Meilisearch chỉ chạy internal network.

6. **[Breaking]** Frontend leaderboard expect `firebaseUid`. Red Team đề xuất xóa. Cần update frontend?
   - Options: Xóa + update frontend | Giữ, chấp nhận risk | Replace với hash
   - **Answer:** Xóa firebaseUid, update frontend
   - **Rationale:** Clean approach, backend + frontend đồng bộ.

#### Confirmed Decisions
- **Transactions:** Skip — dùng sequential ops
- **Migration:** Skip ETL — fresh start
- **Staging:** Test on staging VPS first
- **Meilisearch key:** Master key
- **Leaderboard:** Remove firebaseUid + update frontend

#### Action Items
- [x] Remove transaction code from Phase 3 (firebase-auth.js)
- [x] Remove ETL migration script from Phase 4
- [x] Add frontend leaderboard update to Phase 3

### Session 2 — 2026-04-22
**Trigger:** Implementation complete + code review fixes applied

#### Code Review Fixes Applied
- H1: Added try/catch to leaderboard-routes.js
- H2: Restored 7-day merge window in firebase-auth.js
- M3: Updated stale FTS5 comment in schema-search.ts
- L2: Reduced maxPoolSize from 100 to 20

**Status:** All 5 phases completed. Migration DONE.

#### Impact on Phases
- **Phase 3:** Remove `withTransaction()` pattern, add frontend update task
- **Phase 4:** Remove migrate-sqlite-to-mongo.js script
