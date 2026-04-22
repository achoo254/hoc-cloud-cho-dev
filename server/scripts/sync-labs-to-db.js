import { connectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';
import { getMeiliClient, initLabsIndex } from '../db/meilisearch-client.js';
import { syncLabsToMeilisearch } from '../db/sync-search-index.js';
import { labs } from '../generated/labs-data.mjs';

export async function syncLabsToDb() {
  await connectMongo();

  let inserted = 0, updated = 0, skipped = 0;

  for (const lab of labs) {
    const existing = await Lab.findOne({ slug: lab.slug }).select('contentHash').lean();

    if (existing && existing.contentHash === lab.content_hash) {
      skipped++;
      continue;
    }

    const doc = {
      slug: lab.slug,
      module: lab.module,
      title: lab.title,
      filePath: lab.file_path,
      estimatedMinutes: lab.estimatedMinutes,
      tldr: lab.tldr,
      walkthrough: lab.walkthrough,
      quiz: lab.quiz,
      flashcards: lab.flashcards,
      tryAtHome: lab.tryAtHome,
      contentHash: lab.content_hash,
    };

    await Lab.findOneAndUpdate(
      { slug: lab.slug },
      { $set: doc },
      { upsert: true }
    );

    if (existing) updated++;
    else inserted++;
  }

  console.log(`[sync-labs] MongoDB: ${inserted} new, ${updated} updated, ${skipped} unchanged`);

  try {
    await initLabsIndex();
    const { synced } = await syncLabsToMeilisearch();

    const meili = getMeiliClient();
    const index = meili.index('labs');
    const currentSlugs = new Set(labs.map(l => l.slug));

    const allDocs = await index.getDocuments({ limit: 1000, fields: ['id'] });
    const orphanIds = allDocs.results.filter(d => !currentSlugs.has(d.id)).map(d => d.id);
    if (orphanIds.length > 0) {
      await index.deleteDocuments(orphanIds);
      console.log(`[sync-labs] Meilisearch: deleted ${orphanIds.length} stale docs`);
    }

    console.log(`[sync-labs] Meilisearch: ${synced} documents indexed`);
  } catch (err) {
    console.warn('[sync-labs] Meilisearch sync failed (non-fatal):', err.message);
  }

  return { inserted, updated, skipped };
}

if (process.argv[1]?.endsWith('sync-labs-to-db.js')) {
  syncLabsToDb()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
