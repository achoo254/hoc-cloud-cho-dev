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
    .slice(0, 5000);
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
