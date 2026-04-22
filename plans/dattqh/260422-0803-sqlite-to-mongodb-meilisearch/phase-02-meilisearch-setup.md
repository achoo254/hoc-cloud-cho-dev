# Phase 2: Meilisearch Setup

**Priority:** P0 (blocking)  
**Status:** completed  
**Effort:** 1-2 hours

## Overview

Create Meilisearch client, configure labs index with search settings.

## Context Links

- [Brainstorm Report](../reports/brainstorm-260422-0803-sqlite-to-mongodb-meilisearch.md)
- Current FTS5: `server/api/search-routes.js`

## Requirements

### Functional
- Meilisearch client singleton
- Labs index with proper searchable/filterable attributes
- Sync function: MongoDB labs → Meilisearch index

### Non-functional
- Typo tolerance enabled
- Connection health check
- Graceful error handling

## Implementation Steps

### 1. Install dependency

```bash
npm install meilisearch
```

### 2. Create `server/db/meilisearch-client.js`

```javascript
import { MeiliSearch } from 'meilisearch';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;

// [RED TEAM] Require API key in production - no silent empty string
if (!MEILISEARCH_API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('MEILISEARCH_API_KEY is required in production');
}

let client = null;

export function getMeiliClient() {
  if (!client) {
    client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY || '',
    });
  }
  return client;
}

export async function initLabsIndex() {
  const meili = getMeiliClient();
  const index = meili.index('labs');
  
  // Configure index settings
  const task = await index.updateSettings({
    searchableAttributes: [
      'title',
      'module',
      'tldrTerms',
      'tldrDefinitions',
      'walkthroughText',
    ],
    filterableAttributes: ['module'],
    sortableAttributes: ['title'],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
    },
  });
  
  // [RED TEAM] Wait for settings to be applied before returning
  await meili.waitForTask(task.taskUid);
  console.log('[meilisearch] Labs index configured');
  return index;
}

export async function getMeiliStatus() {
  try {
    const meili = getMeiliClient();
    const health = await meili.health();
    const stats = await meili.index('labs').getStats().catch(() => null);
    return {
      healthy: health.status === 'available',
      documentsCount: stats?.numberOfDocuments ?? 0,
    };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}
```

### 3. Create `server/db/sync-search-index.js`

```javascript
import { getMeiliClient } from './meilisearch-client.js';
import { Lab } from './models/index.js';

function extractTextFromWalkthrough(walkthrough) {
  if (!Array.isArray(walkthrough)) return '';
  return walkthrough
    .map(step => {
      if (typeof step === 'string') return step;
      if (step?.content) return String(step.content);
      if (step?.text) return String(step.text);
      return '';
    })
    .filter(Boolean)
    .join(' ')
    .slice(0, 5000); // Limit text size
}

function labToSearchDoc(lab) {
  return {
    id: lab.slug,
    title: lab.title,
    module: lab.module || '',
    tldrTerms: (lab.tldr || []).map(t => t.term).join(' '),
    tldrDefinitions: (lab.tldr || []).map(t => t.definition).join(' '),
    walkthroughText: extractTextFromWalkthrough(lab.walkthrough),
    slug: lab.slug,
    filePath: lab.filePath,
  };
}

export async function syncLabsToMeilisearch() {
  const meili = getMeiliClient();
  const index = meili.index('labs');
  
  const labs = await Lab.find().lean();
  const docs = labs.map(labToSearchDoc);
  
  if (docs.length === 0) {
    console.log('[meilisearch] No labs to sync');
    return { synced: 0 };
  }
  
  const task = await index.addDocuments(docs, { primaryKey: 'id' });
  
  // [RED TEAM] Wait for indexing to complete before returning
  const meili = getMeiliClient();
  await meili.waitForTask(task.taskUid);
  console.log(`[meilisearch] Synced ${docs.length} labs`);
  
  return { synced: docs.length, taskUid: task.taskUid };
}

export async function syncSingleLab(lab) {
  const meili = getMeiliClient();
  const index = meili.index('labs');
  
  const doc = labToSearchDoc(lab);
  await index.addDocuments([doc], { primaryKey: 'id' });
  
  return { synced: 1 };
}

export async function deleteLabFromIndex(slug) {
  const meili = getMeiliClient();
  const index = meili.index('labs');
  
  await index.deleteDocument(slug);
  return { deleted: slug };
}
```

## Todo List

- [x] `npm install meilisearch`
- [x] Create `server/db/meilisearch-client.js`
- [x] Create `server/db/sync-search-index.js`
- [x] Test index creation locally
- [x] Test sync function

## Success Criteria

- `getMeiliClient()` connects successfully
- `initLabsIndex()` configures settings without error
- `syncLabsToMeilisearch()` indexes all labs

## Next Steps

→ Phase 3: Update API Routes
