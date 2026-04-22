import { getMeiliClient } from './meilisearch-client.js';
import { Lab } from './models/index.js';

// Caps keep a single document under Meili's default 2MB payload ceiling.
// Order within each field groups conceptually related text so highlighting
// returns coherent snippets.
const MAX_LEN_PER_FIELD = 20000;

function joinTexts(parts, sep = ' ') {
  return parts
    .filter(Boolean)
    .map(String)
    .join(sep)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEN_PER_FIELD);
}

// TLDR items (THINK phase): what/why/whyBreaks/deploymentUse + extras.
function extractTldrText(tldr) {
  if (!Array.isArray(tldr)) return '';
  const parts = [];
  for (const t of tldr) {
    if (!t || typeof t !== 'object') continue;
    parts.push(t.what, t.why, t.whyBreaks, t.deploymentUse, t.term, t.definition, t.layer, t.name, t.protocol, t.payload, t.value);
  }
  return joinTexts(parts);
}

// Walkthrough steps (SEE phase): what/why/whyBreaks/observeWith/code + nested failModes and fixSteps.
function extractWalkthroughText(walkthrough) {
  if (!Array.isArray(walkthrough)) return '';
  const parts = [];
  for (const step of walkthrough) {
    if (typeof step === 'string') { parts.push(step); continue; }
    if (!step || typeof step !== 'object') continue;
    parts.push(step.what, step.why, step.whyBreaks, step.observeWith, step.code, step.content, step.text);
    if (Array.isArray(step.failModes)) {
      for (const fm of step.failModes) {
        if (typeof fm === 'string') parts.push(fm);
        else if (fm) parts.push(fm.symptom, fm.evidence);
      }
    }
    if (Array.isArray(step.fixSteps)) {
      for (const fs of step.fixSteps) {
        if (typeof fs === 'string') parts.push(fs);
        else if (fs) parts.push(fs.step, fs.command);
      }
    }
  }
  return joinTexts(parts);
}

// Quiz items (SHIP phase): q/options/whyCorrect/whyWrong.
function extractQuizText(quiz) {
  if (!Array.isArray(quiz)) return '';
  const parts = [];
  for (const item of quiz) {
    if (!item || typeof item !== 'object') continue;
    parts.push(item.q, item.question, item.explanation, item.whyCorrect);
    if (Array.isArray(item.options)) parts.push(...item.options);
    if (Array.isArray(item.answers)) parts.push(...item.answers);
    if (typeof item.whyWrong === 'string') parts.push(item.whyWrong);
    else if (Array.isArray(item.whyWrong)) parts.push(...item.whyWrong);
    else if (item.whyWrong && typeof item.whyWrong === 'object') parts.push(...Object.values(item.whyWrong));
  }
  return joinTexts(parts);
}

// Flashcards (SHIP phase): front/back/why.
function extractFlashcardText(flashcards) {
  if (!Array.isArray(flashcards)) return '';
  const parts = [];
  for (const card of flashcards) {
    if (!card || typeof card !== 'object') continue;
    parts.push(card.front, card.back, card.why);
  }
  return joinTexts(parts);
}

// Try-at-home commands (SHIP phase): cmd/why/observeWith + legacy command/description.
function extractTryAtHomeText(tryAtHome) {
  if (!Array.isArray(tryAtHome)) return '';
  const parts = [];
  for (const item of tryAtHome) {
    if (!item || typeof item !== 'object') continue;
    parts.push(item.cmd, item.command, item.why, item.description, item.observeWith);
  }
  return joinTexts(parts);
}

function labToSearchDoc(lab) {
  return {
    id: lab.slug,
    slug: lab.slug,
    title: lab.title || '',
    module: lab.module || '',
    tldrText: extractTldrText(lab.tldr),
    walkthroughText: extractWalkthroughText(lab.walkthrough),
    quizText: extractQuizText(lab.quiz),
    flashcardText: extractFlashcardText(lab.flashcards),
    tryAtHomeText: extractTryAtHomeText(lab.tryAtHome),
  };
}

// Index-level settings. Typo tolerance disabled so "tren" only matches "trên"/"tren"
// (diacritic folding stays on by default) — never "tron"/"trốn" (different base letters).
async function applyIndexSettings(index) {
  const task = await index.updateSettings({
    typoTolerance: { enabled: false },
  });
  await getMeiliClient().tasks.waitForTask(task.taskUid);
}

export async function syncLabsToMeilisearch() {
  const meili = getMeiliClient();
  const index = meili.index('labs');

  await applyIndexSettings(index);

  const labs = await Lab.find().lean();
  const docs = labs.map(labToSearchDoc);

  if (docs.length === 0) {
    console.log('[meilisearch] No labs to sync');
    return { synced: 0 };
  }

  const task = await index.addDocuments(docs, { primaryKey: 'id' });
  await meili.tasks.waitForTask(task.taskUid);
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
