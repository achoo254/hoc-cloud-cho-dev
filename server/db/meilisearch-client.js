import { Meilisearch } from 'meilisearch';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;

if (!MEILISEARCH_API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('MEILISEARCH_API_KEY is required in production');
}

let client = null;

export function getMeiliClient() {
  if (!client) {
    client = new Meilisearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY || '',
    });
  }
  return client;
}

export async function initLabsIndex() {
  const meili = getMeiliClient();
  const index = meili.index('labs');

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
