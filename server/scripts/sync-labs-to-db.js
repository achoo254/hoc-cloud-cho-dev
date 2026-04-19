// Upsert lab records into `labs` table. Source data comes from the build-time
// generated module `server/generated/labs-data.mjs` so the bundled server does
// not need to walk the filesystem.
import { createHash } from 'node:crypto';
import db from '../db/sqlite-client.js';
import { labs } from '../generated/labs-data.mjs';

const LAB_DATA_RE = /<script\s+type=["']application\/json["']\s+id=["']lab-data["']\s*>([\s\S]*?)<\/script>/i;

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
  let inserted = 0, updated = 0, skipped = 0, failed = 0;

  for (const lab of labs) {
    const data = extractLabData(lab.html);
    if (!data) { failed++; if (verbose) console.warn(`[sync-labs] skip (no lab-data): ${lab.file_path}`); continue; }

    const hash = createHash('sha1').update(lab.html).digest('hex');
    const existing = getHash.get(lab.slug);

    const row = {
      slug: lab.slug,
      module: lab.module,
      title: String(data.title || lab.slug),
      file_path: lab.file_path,
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
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
    process.argv[1]?.endsWith('sync-labs-to-db.js')) {
  syncLabsToDb({ verbose: true });
}
