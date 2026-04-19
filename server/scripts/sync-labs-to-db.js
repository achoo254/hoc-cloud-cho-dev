// Upsert lab records into `labs` table from build-time generated module.
// Source: fixtures/labs/*.json (schema v3). Content already parsed — no HTML extract.
import db from '../db/sqlite-client.js';
import { labs } from '../generated/labs-data.mjs';

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

export function syncLabsToDb() {
  let inserted = 0, updated = 0, skipped = 0;

  for (const lab of labs) {
    const existing = getHash.get(lab.slug);

    const row = {
      slug: lab.slug,
      module: lab.module,
      title: lab.title,
      file_path: lab.file_path,
      tldr_json: JSON.stringify(lab.tldr),
      walkthrough_json: JSON.stringify(lab.walkthrough),
      quiz_json: JSON.stringify(lab.quiz),
      flashcards_json: JSON.stringify(lab.flashcards),
      try_at_home_json: JSON.stringify(lab.tryAtHome),
      estimated_minutes: lab.estimatedMinutes,
      content_hash: lab.content_hash,
    };

    if (existing && existing.content_hash === lab.content_hash) {
      skipped++;
      continue;
    }
    upsert.run(row);
    if (existing) updated++; else inserted++;
  }

  console.log(`[sync-labs] ${inserted} new, ${updated} updated, ${skipped} unchanged`);
  return { inserted, updated, skipped };
}

if (process.argv[1]?.endsWith('sync-labs-to-db.js')) {
  syncLabsToDb();
}
