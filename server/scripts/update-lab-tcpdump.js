/**
 * update-lab-tcpdump.js
 * Runner: bổ sung tcpdump content vào lab icmp-ping và http trong MongoDB.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... node server/scripts/update-lab-tcpdump.js
 *
 * Idempotent: skip lab nếu đã có entry tryAtHome bắt đầu bằng 'tcpdump'.
 */

import 'dotenv/config';
import crypto from 'crypto';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';
import { ICMP_ADDITIONS, HTTP_ADDITIONS } from './update-lab-tcpdump-content.js';

/** Recompute contentHash từ tất cả content fields (Mixed arrays). */
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

/** Kiểm tra sentinel: đã có tcpdump entry trong tryAtHome chưa. */
function hasTcpdumpEntries(lab) {
  return lab.tryAtHome?.some((t) => t?.cmd?.startsWith('tcpdump')) ?? false;
}

/** Áp dụng additions vào document lab (mutate in-place). */
function applyAdditions(lab, additions) {
  lab.tryAtHome.push(...additions.tryAtHome);
  lab.misconceptions.push(...additions.misconceptions);
  lab.tldr.push(...additions.tldr);
  lab.walkthrough.push(...additions.walkthrough);
  lab.quiz.push(...additions.quiz);
  lab.flashcards.push(...additions.flashcards);

  // Mixed type: Mongoose không tự detect nested change — phải markModified.
  lab.markModified('tryAtHome');
  lab.markModified('misconceptions');
  lab.markModified('tldr');
  lab.markModified('walkthrough');
  lab.markModified('quiz');
  lab.markModified('flashcards');

  lab.contentHash = computeContentHash(lab);
}

async function main() {
  await connectMongo();

  try {
    const targets = [
      { slug: 'icmp-ping', additions: ICMP_ADDITIONS },
      { slug: 'http', additions: HTTP_ADDITIONS },
    ];

    for (const { slug, additions } of targets) {
      const lab = await Lab.findOne({ slug });

      if (!lab) {
        console.error(`[skip] lab "${slug}" not found in MongoDB`);
        continue;
      }

      if (hasTcpdumpEntries(lab)) {
        console.log(`[skip] "${slug}" already has tcpdump entries — no changes made`);
        continue;
      }

      applyAdditions(lab, additions);
      await lab.save();

      console.log(`[ok] "${slug}" updated — contentHash=${lab.contentHash.slice(0, 12)}`);
    }
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
