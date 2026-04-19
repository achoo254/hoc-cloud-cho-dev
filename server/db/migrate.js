import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './sqlite-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, 'migrations');

db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
)`);

const applied = new Set(
  db.prepare('SELECT name FROM _migrations').all().map((r) => r.name)
);

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const insert = db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');

for (const f of files) {
  if (applied.has(f)) continue;
  const sql = readFileSync(resolve(migrationsDir, f), 'utf8');
  db.exec('BEGIN');
  try {
    db.exec(sql);
    insert.run(f, Date.now());
    db.exec('COMMIT');
    console.log(`[migrate] applied ${f}`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(`[migrate] FAILED ${f}:`, err.message);
    throw err;
  }
}
