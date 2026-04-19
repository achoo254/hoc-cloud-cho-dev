import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dbPath = resolve(process.env.SQLITE_DB_PATH || './data/hoccloud.db');
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const opts = db.pragma('compile_options');
const hasFTS5 = opts.some((r) => r.compile_options === 'ENABLE_FTS5');
if (!hasFTS5) {
  throw new Error('SQLite built without FTS5. Rebuild better-sqlite3.');
}

export default db;
export { dbPath };
