/**
 * Generic apply script — patches ONE lab's tldr.why / walkthrough.why / misconceptions.
 * Reads draft from: content-drafts/{slug}.json
 * Saves backup to: scripts/backup-{slug}-pre-update.json
 *
 * Usage:
 *   node --env-file=.env.development scripts/apply-lab-think-depth.js <slug>
 *
 * Draft JSON shape:
 * {
 *   "slug": "arp",
 *   "expected": { "tldr": 7, "walkthrough": 7 },   // safety assertion
 *   "tldrWhyPatches": { "0": "<html>...", "3": "..." },
 *   "walkthroughWhyPatches": { "0": "...", "5": "..." },
 *   "misconceptions": [ { "wrong": "...", "right": "...", "why": "..." }, ... ]
 * }
 */
import mongoose from 'mongoose';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
if (!slug) { console.error('Usage: node apply-lab-think-depth.js <slug>'); process.exit(1); }

const DRAFT_PATH = resolve(__dirname, '..', 'content-drafts', `${slug}.json`);
const BACKUP_PATH = resolve(__dirname, `backup-${slug}-pre-update.json`);

const draft = JSON.parse(readFileSync(DRAFT_PATH, 'utf8'));
if (draft.slug !== slug) { console.error(`[apply] slug mismatch: arg=${slug} draft=${draft.slug}`); process.exit(1); }

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }

console.log(`[apply] slug=${slug}`);
await mongoose.connect(uri);
console.log('[apply] db=connected');

const Lab = mongoose.model('Lab', new mongoose.Schema({}, { strict: false }), 'labs');
const current = await Lab.findOne({ slug }).lean();
if (!current) { console.error(`[apply] lab not found: ${slug}`); await mongoose.disconnect(); process.exit(1); }

// Safety: row counts must match expected
const tldrLen = current.tldr?.length ?? 0;
const walkLen = current.walkthrough?.length ?? 0;
console.log(`[apply] tldr.length=${tldrLen} expected=${draft.expected.tldr}`);
console.log(`[apply] walkthrough.length=${walkLen} expected=${draft.expected.walkthrough}`);
if (tldrLen !== draft.expected.tldr || walkLen !== draft.expected.walkthrough) {
  console.error('[apply] length mismatch — ABORT to prevent wrong-row patching');
  await mongoose.disconnect(); process.exit(1);
}

// Backup
writeFileSync(BACKUP_PATH, JSON.stringify({
  slug, tldr: current.tldr, walkthrough: current.walkthrough,
  misconceptions: current.misconceptions ?? null, contentHash: current.contentHash,
}, null, 2), 'utf8');
console.log('[apply] backup →', BACKUP_PATH);

// Patch tldr: deep clone + overwrite only .why at specified indices
const newTldr = current.tldr.map((r, i) => ({ ...r }));
for (const [idx, why] of Object.entries(draft.tldrWhyPatches ?? {})) {
  const i = Number(idx);
  if (i >= newTldr.length) { console.error(`[apply] tldr idx out of range: ${i}`); process.exit(1); }
  newTldr[i].why = why;
}

// Patch walkthrough: same pattern
const newWalk = current.walkthrough.map(r => ({ ...r }));
for (const [idx, why] of Object.entries(draft.walkthroughWhyPatches ?? {})) {
  const i = Number(idx);
  if (i >= newWalk.length) { console.error(`[apply] walk idx out of range: ${i}`); process.exit(1); }
  newWalk[i].why = why;
}

// Use native Mongoose to trigger post-hooks → Meili sync
const LabModel = mongoose.models.Lab;
await LabModel.findOneAndUpdate(
  { slug },
  { $set: {
    tldr: newTldr,
    walkthrough: newWalk,
    misconceptions: draft.misconceptions,
    contentHash: new Date().toISOString(),
  } },
  { new: true }
);

// Verify
const verify = await Lab.findOne({ slug }).lean();
console.log('\n[apply] ───── VERIFY ─────');
console.log(`[apply] misconceptions.length=${verify.misconceptions?.length} (expect ${draft.misconceptions.length})`);
console.log(`[apply] contentHash=${verify.contentHash}`);
for (const idx of Object.keys(draft.tldrWhyPatches ?? {})) {
  console.log(`[apply] tldr[${idx}].why[0..80]=${verify.tldr[Number(idx)].why?.slice(0,80)}`);
}
for (const idx of Object.keys(draft.walkthroughWhyPatches ?? {})) {
  console.log(`[apply] walk[${idx}].why[0..80]=${verify.walkthrough[Number(idx)].why?.slice(0,80)}`);
}
console.log(`[apply] misc[0].wrong=${verify.misconceptions?.[0]?.wrong?.slice(0,80)}`);
console.log('[apply] ✓ DONE');

await mongoose.disconnect();
console.log('[apply] disconnected');
