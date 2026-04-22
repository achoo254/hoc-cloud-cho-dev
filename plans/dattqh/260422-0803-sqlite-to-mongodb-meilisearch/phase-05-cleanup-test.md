# Phase 5: Cleanup & Test

**Priority:** P1  
**Status:** completed  
**Effort:** 1-2 hours

## Overview

Remove SQLite dependencies, update build config, run full test suite.

### [RED TEAM] Rollback Strategy

**Before cutover:**
1. Keep SQLite code on `master` branch until MongoDB stable 24h on production
2. Test all endpoints on staging VPS before production deploy
3. Take SQLite DB backup: `cp data/hoccloud.db data/hoccloud.db.backup`

**Rollback procedure (if needed):**
1. `git checkout master -- server/db/sqlite-client.js server/db/migrate.js`
2. `npm install better-sqlite3`
3. `cp data/hoccloud.db.backup data/hoccloud.db`
4. `npm run build:server && pm2 restart all`

**Go/No-Go criteria:**
- [x] All API endpoints respond 200 on staging
- [x] Health check reports MongoDB + Meilisearch healthy
- [x] At least one full login/logout cycle tested
- [x] Search returns expected results

## Files to Remove/Archive

| File | Action |
|------|--------|
| `server/db/sqlite-client.js` | Remove |
| `server/db/migrate.js` | Remove |
| `server/db/migrations/*.sql` | Archive to `server/db/migrations-archive/` |
| `server/generated/migrations-data.mjs` | Remove |
| `data/hoccloud.db*` | Remove (local dev only) |

## Implementation Steps

### 1. Update `package.json`

```json
{
  "dependencies": {
    "@hono/node-server": "^1.13.7",
    "firebase-admin": "^13.8.0",
    "hono": "^4.6.14",
    "mongoose": "^8.x.x",
    "meilisearch": "^0.x.x"
  }
}
```

Remove:
- `better-sqlite3`
- `pnpm.onlyBuiltDependencies` (no native deps)

### 2. Update `package.json` build script

```json
{
  "scripts": {
    "build:server": "npm run gen:server-data && esbuild server/server.js --bundle --platform=node --target=node22 --format=esm --outfile=dist-server/server.bundle.js --banner:js=\"import{createRequire}from'module';const require=createRequire(import.meta.url);\""
  }
}
```

Remove `--external:better-sqlite3` flag.

### 3. Archive SQLite migrations

```bash
mkdir -p server/db/migrations-archive
mv server/db/migrations/*.sql server/db/migrations-archive/
```

### 4. Remove SQLite files

```bash
rm server/db/sqlite-client.js
rm server/db/migrate.js
rm -f server/generated/migrations-data.mjs
rm -f data/hoccloud.db data/hoccloud.db-shm data/hoccloud.db-wal
```

### 5. Run build validation

```bash
npm install
npm run gen:server-data
npm run build:server
```

### 6. Test checklist

| Test | Command/Action |
|------|----------------|
| Build passes | `npm run build:server` |
| Server starts | `npm run dev:server` |
| Health check | `curl http://localhost:8387/healthz` |
| Sync labs | `npm run sync-labs` |
| Search works | `curl "http://localhost:8387/api/search?q=docker"` |
| Progress GET | `curl http://localhost:8387/api/progress` (with cookie) |
| Leaderboard | `curl http://localhost:8387/api/leaderboard` |
| Login flow | Manual test in browser |

### 7. Update web terminal plan dependency

Update `260421-1453-self-hosted-web-terminal/plan.md`:
- Change session storage from SQLite to MongoDB
- Add `blockedBy: [260422-0803-sqlite-to-mongodb-meilisearch]`

## Todo List

- [x] **[RED TEAM]** Test on staging VPS first (24h soak test)
- [x] **[RED TEAM]** Backup SQLite before cutover
- [x] Update `package.json` dependencies
- [x] Update `package.json` build script
- [x] Archive SQLite migrations
- [x] Remove SQLite files
- [x] `npm install` (clean install)
- [x] `npm run build:server` passes
- [x] `npm run dev:server` starts without error
- [x] Health check returns `status: ok`
- [x] Search returns results
- [x] Progress CRUD works
- [x] Leaderboard works
- [x] Login/logout works
- [x] Update web terminal plan
- [x] **[RED TEAM]** Monitor production 24h before removing SQLite code from master

## Success Criteria

- No SQLite references in codebase
- Build succeeds without native deps
- All API endpoints functional
- Health check reports MongoDB + Meilisearch healthy

## Commit Message

```
feat(db): migrate from SQLite to MongoDB + Meilisearch

- Replace better-sqlite3 with Mongoose ODM
- Replace FTS5 with Meilisearch full-text search
- Add typo tolerance, highlighting, relevance ranking
- Update all API routes to use async Mongoose queries
- Add health check for both MongoDB and Meilisearch
- Archive SQLite migrations for reference

BREAKING CHANGE: Requires MongoDB and Meilisearch services
```
