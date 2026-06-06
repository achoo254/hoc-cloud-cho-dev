/**
 * update-lab-dhcp-vmware.js
 * Runner: bổ sung DHCP VMware lab content (Case A ping-check + Case B ARP flap)
 * vào lab `dhcp` trong MongoDB.
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/update-lab-dhcp-vmware.js
 *
 * Idempotent: skip nếu walkthrough đã có step === 8.
 */

import crypto from 'crypto';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';
import { DHCP_ADDITIONS } from './update-lab-dhcp-vmware-content.js';

/** Recompute contentHash from all content fields (Mixed arrays). */
function computeContentHash(lab) {
  const hashInput = JSON.stringify({
    tldr: lab.tldr,
    walkthrough: lab.walkthrough,
    quiz: lab.quiz,
    flashcards: lab.flashcards,
    tryAtHome: lab.tryAtHome,
    misconceptions: lab.misconceptions,
  });
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/** Sentinel: walkthrough đã có step 8 (Conflict A) chưa */
function hasConflictSteps(lab) {
  return lab.walkthrough?.some((w) => w?.step === 8 || w?.step === '8') ?? false;
}

function applyAdditions(lab, additions) {
  lab.tryAtHome.push(...additions.tryAtHome);
  lab.walkthrough.push(...additions.walkthrough);
  lab.misconceptions.push(...additions.misconceptions);

  // Mixed type: Mongoose không tự detect nested change → markModified.
  lab.markModified('tryAtHome');
  lab.markModified('walkthrough');
  lab.markModified('misconceptions');

  lab.contentHash = computeContentHash(lab);
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
      tryAtHome: lab.tryAtHome?.length ?? 0,
      walkthrough: lab.walkthrough?.length ?? 0,
      misconceptions: lab.misconceptions?.length ?? 0,
    };
    console.log('[before]', before);

    if (hasConflictSteps(lab)) {
      console.log('[skip] walkthrough already has step 8 — no changes made');
      return;
    }

    applyAdditions(lab, DHCP_ADDITIONS);
    await lab.save();

    console.log('[after]', {
      tryAtHome: lab.tryAtHome.length,
      walkthrough: lab.walkthrough.length,
      misconceptions: lab.misconceptions.length,
    });
    console.log(`[ok] dhcp updated — contentHash=${lab.contentHash.slice(0, 12)}`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
