/**
 * update-lab-dhcp-vmware-v2.js
 * Pull peer-inspired content vào lab `dhcp` (sau khi v1 đã chạy):
 *  - +1 walkthrough step 10 (ARP Probe vs Gratuitous + DHCPDECLINE → APIPA)
 *  - +3 misconceptions (ARP Probe/Gratuitous distinction, networkd no-DECLINE, APIPA RFC 3927)
 *
 * Idempotent: skip nếu walkthrough đã có step === 10.
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/update-lab-dhcp-vmware-v2.js
 */

import crypto from 'crypto';
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
  '260524-1055-dhcp-lab-codify',
  'content-drafts',
);

const WALKTHROUGH_V2 = JSON.parse(
  readFileSync(join(draftsDir, 'walkthrough-additions-v2.json'), 'utf-8'),
);
const MISCONCEPTIONS_V2 = JSON.parse(
  readFileSync(join(draftsDir, 'misconceptions-additions-v2.json'), 'utf-8'),
);

function computeContentHash(lab) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        tldr: lab.tldr,
        walkthrough: lab.walkthrough,
        quiz: lab.quiz,
        flashcards: lab.flashcards,
        tryAtHome: lab.tryAtHome,
        misconceptions: lab.misconceptions,
      }),
    )
    .digest('hex');
}

function hasStep10(lab) {
  return lab.walkthrough?.some((w) => w?.step === 10 || w?.step === '10') ?? false;
}

async function main() {
  await connectMongo();
  try {
    const lab = await Lab.findOne({ slug: 'dhcp' });
    if (!lab) {
      console.error('[skip] lab "dhcp" not found');
      return;
    }

    const before = {
      walkthrough: lab.walkthrough?.length ?? 0,
      misconceptions: lab.misconceptions?.length ?? 0,
    };
    console.log('[before]', before);

    if (hasStep10(lab)) {
      console.log('[skip] walkthrough already has step 10 — no changes made');
      return;
    }

    lab.walkthrough.push(...WALKTHROUGH_V2);
    lab.misconceptions.push(...MISCONCEPTIONS_V2);
    lab.markModified('walkthrough');
    lab.markModified('misconceptions');
    lab.contentHash = computeContentHash(lab);

    await lab.save();

    console.log('[after]', {
      walkthrough: lab.walkthrough.length,
      misconceptions: lab.misconceptions.length,
    });
    console.log(`[ok] dhcp v2 update — contentHash=${lab.contentHash.slice(0, 12)}`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
