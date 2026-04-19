/**
 * generate-labs-index.mjs
 *
 * Reads fixtures/labs/*.json and emits app/src/generated/labs-index.json
 * with lightweight metadata per lab (no full content).
 *
 * Shape per entry:
 *   { slug, title, module, estimated_minutes, updated_at, tags }
 *
 * Target: ≤ 20KB uncompressed.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FIXTURES_DIR = join(ROOT, 'fixtures', 'labs');
const OUTPUT_DIR = join(ROOT, 'app', 'src', 'generated');
const OUTPUT_FILE = join(OUTPUT_DIR, 'labs-index.json');

// ── Load schema ───────────────────────────────────────────────────────────────

const { LabFixtureSchema } = await import('./lab-schema.js');

// ── Build index ───────────────────────────────────────────────────────────────

const files = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

const entries = [];

for (const file of files) {
  const filePath = join(FIXTURES_DIR, file);
  const slug = file.replace('.json', '');

  let raw;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`[gen-index] Failed to read/parse ${file}: ${err.message}`);
    process.exit(1);
  }

  const result = LabFixtureSchema.safeParse(raw);
  if (!result.success) {
    console.error(`[gen-index] Validation failed for ${file}:`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')} : ${issue.message}`);
    }
    process.exit(1);
  }

  const { title, module: mod, estimated_minutes, updated_at } = result.data;

  // tags: not part of current schema v3 — derive from module as fallback
  const tags = result.data.tags ?? [mod];

  entries.push({
    slug,
    title,
    module: mod,
    estimated_minutes,
    updated_at,
    tags,
  });
}

// ── Write output ──────────────────────────────────────────────────────────────

mkdirSync(OUTPUT_DIR, { recursive: true });
const json = JSON.stringify(entries, null, 2);
writeFileSync(OUTPUT_FILE, json, 'utf-8');

const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
console.log(
  `[gen-index] Written app/src/generated/labs-index.json — ${entries.length} entries, ${sizeKB} KB`,
);

if (parseFloat(sizeKB) > 20) {
  console.warn(`[gen-index] WARNING: labs-index.json exceeds 20KB target (${sizeKB} KB)`);
}
