// Walk labs/**/*.html, extract <script id="lab-data"> JSON, upsert into labs table.
// Idempotent via content_hash — skips rows whose hash matches DB.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import db from '../db/sqlite-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const labsDir = resolve(projectRoot, 'labs');

const LAB_DATA_RE = /<script\s+type=["']application\/json["']\s+id=["']lab-data["']\s*>([\s\S]*?)<\/script>/i;

function walkHtml(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith('_') || ent.name === 'node_modules') continue;
      out.push(...walkHtml(full));
    } else if (ent.isFile() && ent.name.endsWith('.html') && ent.name !== 'index.html') {
      out.push(full);
    }
  }
  return out;
}

function slugFromFile(file) {
  // e.g. 08-dns.html → dns ; 01-tcp-ip-packet-journey.html → tcp-ip-packet-journey
  return basename(file, '.html').replace(/^\d+-/, '');
}

function extractLabData(html) {
  const m = html.match(LAB_DATA_RE);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (err) {
    console.warn(`[sync-labs] JSON parse error: ${err.message}`);
    return null;
  }
}

const upsert = db.prepare(`
  INSERT INTO labs (slug, module, title, file_path, tldr_json, walkthrough_json,
                    quiz_json, flashcards_json, try_at_home_json, estimated_minutes,
                    content_hash, updated_at)
  VALUES (@slug, @module, @title, @file_path, @tldr_json, @walkthrough_json,
          @quiz_json, @flashcards_json, @try_at_home_json, @estimated_minutes,
          @content_hash, strftime('%s','now'))
  ON CONFLICT(slug) DO UPDATE SET
    module = excluded.module,
    title = excluded.title,
    file_path = excluded.file_path,
    tldr_json = excluded.tldr_json,
    walkthrough_json = excluded.walkthrough_json,
    quiz_json = excluded.quiz_json,
    flashcards_json = excluded.flashcards_json,
    try_at_home_json = excluded.try_at_home_json,
    estimated_minutes = excluded.estimated_minutes,
    content_hash = excluded.content_hash,
    updated_at = strftime('%s','now')
  WHERE labs.content_hash IS NOT excluded.content_hash
`);
const getHash = db.prepare('SELECT content_hash FROM labs WHERE slug = ?');

export function syncLabsToDb({ verbose = false } = {}) {
  const files = walkHtml(labsDir);
  let inserted = 0, updated = 0, skipped = 0, failed = 0;

  for (const file of files) {
    const rel = relative(projectRoot, file).replace(/\\/g, '/');
    const html = readFileSync(file, 'utf8');
    const data = extractLabData(html);
    if (!data) { failed++; if (verbose) console.warn(`[sync-labs] skip (no lab-data): ${rel}`); continue; }

    const slug = slugFromFile(file);
    const module = rel.split('/')[1] || 'unknown'; // labs/<module>/<file>
    const hash = createHash('sha1').update(html).digest('hex');
    const existing = getHash.get(slug);

    const row = {
      slug,
      module,
      title: String(data.title || slug),
      file_path: rel,
      tldr_json: JSON.stringify(data.tldr || []),
      walkthrough_json: JSON.stringify(data.walkthrough || []),
      quiz_json: JSON.stringify(data.quiz || []),
      flashcards_json: JSON.stringify(data.flashcards || []),
      try_at_home_json: JSON.stringify(data.tryAtHome || data.try_at_home || []),
      estimated_minutes: Number.isFinite(data.estimatedMinutes) ? data.estimatedMinutes : null,
      content_hash: hash,
    };

    if (existing && existing.content_hash === hash) {
      skipped++;
      continue;
    }
    upsert.run(row);
    if (existing) updated++; else inserted++;
  }

  console.log(`[sync-labs] ${inserted} new, ${updated} updated, ${skipped} unchanged, ${failed} skipped (no lab-data)`);
  return { inserted, updated, skipped, failed };
}

// CLI entry
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('sync-labs-to-db.js')) {
  syncLabsToDb({ verbose: true });
}
