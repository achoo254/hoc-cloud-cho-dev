/**
 * generate-search-index.mjs
 *
 * Reads fixtures/labs/*.json and emits app/src/generated/search-index.json
 * in minisearch-friendly format for offline client-side full-text search.
 *
 * Shape per entry:
 *   { slug, title, tags, text }
 *
 * text = concatenation of:
 *   - tldr[*].why
 *   - walkthrough[*].what + walkthrough[*].why
 *   - quiz[*].q
 *   - flashcards[*].front + flashcards[*].back
 *   - try_at_home[*].cmd
 *
 * Target: ≤ 100KB uncompressed.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FIXTURES_DIR = join(ROOT, 'fixtures', 'labs');
const OUTPUT_DIR = join(ROOT, 'app', 'src', 'generated');
const OUTPUT_FILE = join(OUTPUT_DIR, 'search-index.json');

// ── Load schema ───────────────────────────────────────────────────────────────

const { LabFixtureSchema } = await import('./lab-schema.js');

// ── Text extraction helpers ───────────────────────────────────────────────────

/**
 * Flatten all searchable text fields from a lab fixture into a single string.
 * Joined with space so minisearch can tokenize across field boundaries.
 */
function extractSearchText(lab) {
  const parts = [];

  // THINK — tldr
  for (const item of lab.tldr) {
    if (item.why) parts.push(item.why);
    if (item.whyBreaks) parts.push(item.whyBreaks);
    if (item.what) parts.push(item.what);
  }

  // SEE — walkthrough (skip whyBreaks to keep index compact)
  for (const step of lab.walkthrough) {
    if (step.what) parts.push(step.what);
    if (step.why) parts.push(step.why);
  }

  // SHIP — quiz questions
  for (const item of lab.quiz) {
    parts.push(item.q);
    if (item.whyCorrect) parts.push(item.whyCorrect);
  }

  // SHIP — flashcards
  for (const card of lab.flashcards) {
    parts.push(card.front);
    parts.push(card.back);
  }

  // SHIP — try-at-home commands
  for (const cmd of lab.try_at_home) {
    parts.push(cmd.cmd);
    if (cmd.why) parts.push(cmd.why);
  }

  return parts.join(' ');
}

// ── Build search index ────────────────────────────────────────────────────────

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
    console.error(`[gen-search] Failed to read/parse ${file}: ${err.message}`);
    process.exit(1);
  }

  const result = LabFixtureSchema.safeParse(raw);
  if (!result.success) {
    console.error(`[gen-search] Validation failed for ${file}:`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')} : ${issue.message}`);
    }
    process.exit(1);
  }

  const lab = result.data;
  const tags = lab.tags ?? [lab.module];

  entries.push({
    slug,
    title: lab.title,
    tags,
    text: extractSearchText(lab),
  });
}

// ── Write output ──────────────────────────────────────────────────────────────

mkdirSync(OUTPUT_DIR, { recursive: true });
// Minified JSON — search index doesn't need pretty-printing
const json = JSON.stringify(entries);
writeFileSync(OUTPUT_FILE, json, 'utf-8');

const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
console.log(
  `[gen-search] Written app/src/generated/search-index.json — ${entries.length} entries, ${sizeKB} KB`,
);

if (parseFloat(sizeKB) > 100) {
  console.warn(`[gen-search] WARNING: search-index.json exceeds 100KB target (${sizeKB} KB)`);
}
