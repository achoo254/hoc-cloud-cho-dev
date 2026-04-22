# Journal: SQLite to MongoDB + Meilisearch Migration

**Date:** 2026-04-22  
**Author:** Claude Code  
**Plan:** `plans/dattqh/260422-0803-sqlite-to-mongodb-meilisearch/`

## Summary

Completed full migration from SQLite (better-sqlite3) to MongoDB (Mongoose) + Meilisearch. All 5 phases executed in single session with auto-approve mode.

## Key Changes

| Component | Before | After |
|-----------|--------|-------|
| Primary DB | SQLite (better-sqlite3) | MongoDB (Mongoose) |
| Full-text search | FTS5 | Meilisearch |
| Session storage | SQLite table | MongoDB + TTL index |
| Native deps | Yes (better-sqlite3) | No |

## Files Modified

**New (8 files):**
- `server/db/mongo-client.js` — Connection singleton w/ retry
- `server/db/meilisearch-client.js` — Search client
- `server/db/sync-search-index.js` — Labs → Meilisearch sync
- `server/db/models/{lab,user,session,progress}-model.js` — Mongoose schemas

**Updated (9 files):**
- `server/server.js` — MongoDB startup, health check
- `server/api/{search,progress,leaderboard}-routes.js` — Mongoose queries
- `server/auth/{firebase-auth,session-middleware}.js` — MongoDB sessions
- `app/src/lib/api.ts` — Removed firebaseUid from leaderboard
- `app/src/components/dashboard/leaderboard-section.tsx` — Use odid key

**Removed:**
- `server/db/sqlite-client.js`
- `server/db/migrate.js`
- `better-sqlite3` dependency

## Code Review Fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| Leaderboard no try/catch | High | Added error handling, returns 500 |
| Progress merge no time window | High | Restored 7-day filter from SQLite |
| maxPoolSize too high | Low | Reduced 100 → 20 |
| Stale FTS5 comment | Medium | Updated to Meilisearch |

## Decisions

1. **Skip transactions** — No replica set, sequential ops acceptable for early-stage
2. **Skip ETL migration** — Fresh start, user data not critical
3. **Master key for Meilisearch** — Internal network only
4. **Remove firebaseUid from leaderboard** — Security (Red Team finding)

## Validation

- `npm run build:server` — PASS (5.3MB bundle)
- `npm run typecheck --prefix app` — PASS
- SQLite references in server/ — 0
- Hardcoded credentials — 0

## Next Steps

- Deploy to staging VPS for 24h soak test
- Monitor MongoDB + Meilisearch health
- Unblock web-terminal plan (260421-1453)
