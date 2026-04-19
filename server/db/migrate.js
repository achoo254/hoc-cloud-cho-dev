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
