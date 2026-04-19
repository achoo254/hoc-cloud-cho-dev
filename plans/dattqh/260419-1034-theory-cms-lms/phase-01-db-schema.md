# Phase 1: DB + Schema Setup

**Priority:** P1 | **Status:** pending | **Effort:** 0.5d

## Goal
Setup SQLite (better-sqlite3), tạo schema, verify FTS5 có sẵn.

## Requirements
- DB file tại `./data/hoccloud.db` (configurable via `SQLITE_DB_PATH`)
- Startup check: `PRAGMA compile_options` phải có `ENABLE_FTS5`
- WAL mode, foreign_keys ON, busy_timeout 5000ms

## Implementation Steps

### 1. Install deps
```bash
npm i better-sqlite3
```

### 2. Create `server/db/sqlite-client.js`
```js
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dbPath = process.env.SQLITE_DB_PATH || './data/hoccloud.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Verify FTS5
const opts = db.pragma('compile_options', { simple: false });
const hasFTS5 = opts.some(r => r.compile_options === 'ENABLE_FTS5');
if (!hasFTS5) throw new Error('SQLite built without FTS5. Rebuild better-sqlite3.');

export default db;
```

### 3. Create `server/db/schema.sql`
Full schema from plan.md (topics, sections, sections_fts + triggers, lab_links, admin_sessions, indexes).

### 4. Create `server/db/migrations/001-init.sql`
Idempotent: wrap each CREATE in `IF NOT EXISTS`.

### 5. Migration runner
```js
// server/db/migrate.js
import db from './sqlite-client.js';
import { readdirSync, readFileSync } from 'node:fs';

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at INTEGER)`);
const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name));
const files = readdirSync('./server/db/migrations').filter(f => f.endsWith('.sql')).sort();
for (const f of files) {
  if (applied.has(f)) continue;
  db.exec(readFileSync(`./server/db/migrations/${f}`, 'utf8'));
  db.prepare('INSERT INTO _migrations VALUES (?, ?)').run(f, Date.now());
  console.log(`✓ migration ${f}`);
}
```

### 6. Wire vào `server/server.js`
```js
import './db/migrate.js';  // run migrations on boot
```

## Tasks
- [ ] Install better-sqlite3
- [ ] Write sqlite-client.js với FTS5 check
- [ ] Write schema.sql + migration 001-init
- [ ] Write migrate.js runner
- [ ] Wire vào server.js boot
- [ ] Add `data/` to .gitignore
- [ ] Smoke test: `node -e "import('./server/db/migrate.js')"`

## Acceptance
- Server boot không lỗi
- `hoccloud.db` file được tạo, schema có đủ tables
- FTS5 check pass
- Insert test section → trigger sync vào `sections_fts` OK
