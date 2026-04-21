// Apply SQL migrations in order. Source SQL comes from the build-time
// generated module so the bundled server ships migrations inlined.
import db from './sqlite-client.js';
import { migrations } from '../generated/migrations-data.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
)`);

const applied = new Set(
  db.prepare('SELECT name FROM _migrations').all().map((r) => r.name)
);

const insert = db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');

for (const { name, sql } of migrations) {
  if (applied.has(name)) continue;
  db.exec('BEGIN');
  try {
    db.exec(sql);
    insert.run(name, Date.now());
    db.exec('COMMIT');
    console.log(`[migrate] applied ${name}`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(`[migrate] FAILED ${name}:`, err.message);
    throw err;
  }
}

// Post-migration: add user_id column to progress if missing (SQLite ALTER TABLE limitation)
const cols = db.pragma('table_info(progress)');
const hasUserId = cols.some((c) => c.name === 'user_id');
if (!hasUserId) {
  db.exec('ALTER TABLE progress ADD COLUMN user_id INTEGER');
  db.exec('CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id)');
  console.log('[migrate] added user_id column to progress');
}

// Unique constraint for authenticated users to prevent duplicates across devices
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_lab
  ON progress(user_id, lab_slug) WHERE user_id IS NOT NULL
`);
