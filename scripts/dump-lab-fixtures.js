// Dump all labs from SQLite DB → fixtures/labs/*.json (1 file per lab).
// Purpose: provide Zod schema input for Phase 00 gate validation.
// Usage: node scripts/dump-lab-fixtures.js

import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'hoccloud.db');
const OUT_DIR = resolve(__dirname, '..', 'fixtures', 'labs');

mkdirSync(OUT_DIR, { recursive: true });

const db = new Database(DB_PATH, { readonly: true });
const rows = db.prepare('SELECT * FROM labs ORDER BY slug').all();

const JSON_FIELDS = ['tldr_json', 'walkthrough_json', 'quiz_json', 'flashcards_json', 'try_at_home_json'];

for (const row of rows) {
  // Parse JSON fields inline so fixtures are readable + typed
  const parsed = { ...row };
  for (const f of JSON_FIELDS) {
    if (row[f]) {
      try { parsed[f.replace('_json', '')] = JSON.parse(row[f]); }
      catch (e) { console.error(`[${row.slug}] fail parse ${f}:`, e.message); }
      delete parsed[f];
    }
  }
  const outPath = resolve(OUT_DIR, `${row.slug}.json`);
  writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log(`✓ ${row.slug} → ${outPath}`);
}

console.log(`\nDumped ${rows.length} labs.`);
db.close();
