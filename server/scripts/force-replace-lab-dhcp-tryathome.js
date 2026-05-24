/**
 * force-replace-lab-dhcp-tryathome.js
 *
 * Force replace tryAtHome[] với 6 core JSON drafts mới nhất từ content-drafts/,
 * KHÔNG check sentinel (override idempotent guard của update script gốc).
 * Dùng khi đã update drafts để bổ sung screenshot fields hoặc fix content.
 *
 * Cache-buster query string giữ lại nếu URL đã có ?v=...
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/force-replace-lab-dhcp-tryathome.js
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const draftsDir = join(
  __dirname,
  '..',
  '..',
  'plans',
  'dattqh',
  '260524-1726-dhcp-tryathome-vmware-practical',
  'content-drafts',
);

const FILES = [
  'tryathome-core-phase1-setup.json',
  'tryathome-core-phase2-dhcpd-minimal.json',
  'tryathome-core-phase3-dora-wireshark.json',
  'tryathome-core-phase4-case-a.json',
  'tryathome-core-phase5-case-b.json',
  'tryathome-core-phase6-compare-report.json',
];

const CACHE_BUSTER = `v=${Date.now()}`;

function addCacheBuster(src) {
  if (!src || src.includes('?')) return src;
  return `${src}?${CACHE_BUSTER}`;
}

function patchScreenshots(items) {
  for (const item of items) {
    if (!Array.isArray(item.steps)) continue;
    for (const step of item.steps) {
      if (step.screenshot?.src) {
        step.screenshot.src = addCacheBuster(step.screenshot.src);
      }
    }
  }
}

async function main() {
  await connectMongo();
  try {
    const lab = await Lab.findOne({ slug: 'dhcp' });
    if (!lab) throw new Error('lab "dhcp" not found');

    const drafts = FILES.map((f) => JSON.parse(readFileSync(join(draftsDir, f), 'utf-8')));
    patchScreenshots(drafts);

    console.log('[before] tryAtHome len:', lab.tryAtHome?.length ?? 0);
    lab.tryAtHome = drafts;
    lab.markModified('tryAtHome');
    lab.updatedAt = new Date();
    await lab.save();
    console.log(`[done] replaced with ${drafts.length} core phases (cache-buster: ?${CACHE_BUSTER})`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
