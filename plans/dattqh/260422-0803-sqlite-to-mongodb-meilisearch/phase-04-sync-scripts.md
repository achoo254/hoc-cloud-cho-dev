# Phase 4: Sync Scripts

**Priority:** P1  
**Status:** completed  
**Effort:** 1-2 hours

## Overview

Update lab sync script to use Mongoose + trigger Meilisearch sync.

## Files to Update

| File | Changes |
|------|---------|
| `server/scripts/sync-labs-to-db.js` | SQLite → Mongoose + Meilisearch |
| `scripts/build-server-data.mjs` | Remove SQL migration bundling |
| `server/server.js` | Update startup: connect MongoDB, init Meilisearch |

## Implementation Steps

<!-- Updated: Validation Session 1 - Skip ETL migration, user data not important -->

### 1. Update `server/scripts/sync-labs-to-db.js`

```javascript
import { connectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';
import { initLabsIndex, syncLabsToMeilisearch } from '../db/sync-search-index.js';
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
  
  // Sync to Meilisearch
  await initLabsIndex();
  const { synced } = await syncLabsToMeilisearch();
  
  // [RED TEAM] Cleanup stale documents from Meilisearch
  const meili = getMeiliClient();
  const index = meili.index('labs');
  const currentSlugs = new Set(labs.map(l => l.slug));
  
  // Fetch all doc IDs from Meilisearch and delete orphans
  const allDocs = await index.getDocuments({ limit: 1000, fields: ['id'] });
  const orphanIds = allDocs.results.filter(d => !currentSlugs.has(d.id)).map(d => d.id);
  if (orphanIds.length > 0) {
    await index.deleteDocuments(orphanIds);
    console.log(`[sync-labs] Meilisearch: deleted ${orphanIds.length} stale docs`);
  }
  
  console.log(`[sync-labs] Meilisearch: ${synced} documents indexed`);
  
  return { inserted, updated, skipped, meilisearch: synced };
}

if (process.argv[1]?.endsWith('sync-labs-to-db.js')) {
  syncLabsToDb()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
```

### 2. Simplify `scripts/build-server-data.mjs`

Remove migration SQL bundling - only keep labs data generation:

```javascript
// Remove: migrationsSrc generation
// Keep: labs-data.mjs generation
```

### 3. Update `server/server.js`

```javascript
// Replace SQLite imports with MongoDB
import { connectMongo, getMongoStatus } from './db/mongo-client.js';
import { getMeiliStatus } from './db/meilisearch-client.js';

// In startup:
await connectMongo();

// In health check:
app.get('/healthz', async (c) => {
  const mongo = getMongoStatus();
  const meili = await getMeiliStatus();
  
  return c.json({
    status: mongo.connected && meili.healthy ? 'ok' : 'degraded',
    mongo,
    meilisearch: meili,
    uptime: process.uptime(),
  });
});
```

### 4. Update `.env.example`

```env
# MongoDB
# [RED TEAM] Use placeholders, never commit real credentials
MONGODB_URI=mongodb://<MONGO_USER>:<MONGO_PASSWORD>@<HOST>:27017/<DB_NAME>

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=<your_master_key_here>

# Remove SQLite
# SQLITE_DB_PATH=./data/hoccloud.db  # DEPRECATED
```

## Todo List

<!-- [VALIDATION] Removed ETL migration - user data not important for early-stage project -->
- [x] Update `server/scripts/sync-labs-to-db.js`
- [x] Simplify `scripts/build-server-data.mjs`
- [x] Update `server/server.js` startup + health
- [x] Update `.env.example`
- [x] Test `npm run sync-labs`

## Success Criteria

- `npm run sync-labs` inserts labs to MongoDB
- `npm run sync-labs` indexes labs in Meilisearch
- Health endpoint reports both services status
- No SQLite references in startup

## Next Steps

→ Phase 5: Cleanup & Test
