/**
 * seed-linux-labs.js
 *
 * Insert/upsert 3 lab module 02-linux: syslog, linux-boot-process, linux-swap.
 * Content lấy từ plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/content-drafts/*.js
 * (shape camelCase Mongo). Idempotent: chạy lại = cập nhật (đối chiếu contentHash).
 * Backup doc cũ trước khi ghi đè. Meili auto-sync qua post-save hook của Lab model.
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/seed-linux-labs.js
 */

import crypto from 'crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';

import syslogLab from '../../plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/content-drafts/lab-syslog.js';
import bootLab from '../../plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/content-drafts/lab-linux-boot-process.js';
import swapLab from '../../plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/content-drafts/lab-linux-swap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backupDir = join(
  __dirname,
  '..',
  '..',
  'plans',
  'dattqh',
  '260602-2027-linux-labs-syslog-boot-swap',
  'backup',
);

const CONTENT_FIELDS = ['tldr', 'walkthrough', 'quiz', 'flashcards', 'tryAtHome', 'misconceptions'];

function computeContentHash(lab) {
  const payload = {};
  for (const f of CONTENT_FIELDS) payload[f] = lab[f];
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function backupExisting(doc) {
  mkdirSync(backupDir, { recursive: true });
  const path = join(backupDir, `${doc.slug}-pre-seed.json`);
  writeFileSync(path, JSON.stringify(doc.toObject(), null, 2));
  console.log('  [backup]', path);
}

async function upsertLab(data) {
  const existing = await Lab.findOne({ slug: data.slug });
  const doc = existing ?? new Lab({ slug: data.slug });

  if (existing) {
    backupExisting(existing);
    console.log(`  [update] "${data.slug}" (đã tồn tại)`);
  } else {
    console.log(`  [create] "${data.slug}" (mới)`);
  }

  doc.module = data.module;
  doc.title = data.title;
  doc.estimatedMinutes = data.estimatedMinutes;
  for (const f of CONTENT_FIELDS) {
    doc[f] = data[f];
    doc.markModified(f);
  }
  doc.contentHash = computeContentHash(data);
  doc.updatedAt = new Date();

  await doc.save(); // post('save') hook → Meilisearch sync
  console.log(
    `  [ok] "${data.slug}" hash=${doc.contentHash.slice(0, 12)} ` +
      `misc=${data.misconceptions.length} tldr=${data.tldr.length} ` +
      `wt=${data.walkthrough.length} quiz=${data.quiz.length} ` +
      `fc=${data.flashcards.length} tah=${data.tryAtHome.length}`,
  );
}

async function main() {
  await connectMongo();
  try {
    const labs = [syslogLab, bootLab, swapLab];
    for (const lab of labs) {
      console.log(`\n=== ${lab.slug} ===`);
      await upsertLab(lab);
    }
    console.log('\n[done] Seeded', labs.length, 'labs vào module 02-linux');
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
