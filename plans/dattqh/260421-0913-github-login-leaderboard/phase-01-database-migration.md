# Phase 1: Database Migration

**Priority:** P0 | **Status:** completed | **Effort:** 2h

## Context Links
- [Brainstorm Report](../reports/brainstorm-260421-0913-github-login-leaderboard.md)
- [Current schema](../../../server/db/migrations/001-init.sql)

## Overview

Add `users` and `sessions` tables. Add nullable `user_id` column to `progress` table for linking anonymous progress to authenticated users.

## Key Insights

- SQLite doesn't support `ALTER TABLE ADD CONSTRAINT` for FK — use application-level enforcement
- Keep `user_uuid` column in progress for backward compat (anon users continue to work)
- Migration must be idempotent (safe to run multiple times)

## Requirements

**Functional:**
- Create `users` table with GitHub profile data
- Create `sessions` table with hashed tokens
- Add `user_id` to `progress` table

**Non-functional:**
- Migration runs on server boot (existing pattern)
- No downtime — additive changes only

## Schema Design

```sql
-- server/db/migrations/002-auth-tables.sql

-- Users table: GitHub OAuth profiles
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Sessions table: hashed session tokens
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Add user_id to progress (nullable for anon users)
-- SQLite: ALTER TABLE ADD COLUMN doesn't support IF NOT EXISTS,
-- so we check via PRAGMA and skip if exists.

-- [RED TEAM FIX] Unique constraint for authenticated users to prevent duplicates
-- across devices. Applied via migrate.js after ALTER TABLE.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_lab 
--   ON progress(user_id, lab_slug) WHERE user_id IS NOT NULL;
```

## Related Code Files

**Create:**
- `server/db/migrations/002-auth-tables.sql`

**Modify:**
- `server/db/migrate.js` — ensure 002 runs

## Implementation Steps

1. Create `server/db/migrations/002-auth-tables.sql` with schema above
2. Handle `user_id` column addition in migrate.js:
   ```js
   // Check if column exists
   const cols = db.pragma('table_info(progress)');
   const hasUserId = cols.some(c => c.name === 'user_id');
   if (!hasUserId) {
     db.exec('ALTER TABLE progress ADD COLUMN user_id INTEGER');
     db.exec('CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id)');
   }
   // [RED TEAM FIX] Unique constraint for authenticated users
   db.exec(`
     CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_lab 
     ON progress(user_id, lab_slug) WHERE user_id IS NOT NULL
   `);
   ```
3. Test migration on fresh DB
4. Test migration on existing DB with progress data

## Todo List

- [x] Create `002-auth-tables.sql`
- [x] Update `migrate.js` to handle ALTER TABLE safely
- [x] Verify idempotency (run twice)
- [x] Test with existing progress data preserved

## Success Criteria

- Tables `users` and `sessions` exist after migration
- `progress.user_id` column exists (nullable)
- Existing progress data preserved
- Migration idempotent (no errors on re-run)

## Security Considerations

- `sessions.token_hash` stores SHA-256 hash, never plaintext
- FK cascade: deleting user deletes their sessions
- No sensitive data in `users` table (only public GitHub info)
