/**
 * update-lab-dhcp-tryathome-v3.js
 *
 * Thay tryAtHome[] cũ (9 item shell command) bằng 6 phase practical với:
 *   - steps[] có screenshot reference
 *   - analysis block (Quan sát / Cơ chế / Bài học) cho Case A/B
 *   - troubleshooting per phase
 *
 * Idempotent: sentinel = phaseType === 'core' + title bắt đầu 'Phase 1'.
 * Backup full lab doc trước khi update.
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/update-lab-dhcp-tryathome-v3.js
 */

import crypto from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const planDir = join(
  __dirname,
  '..',
  '..',
  'plans',
  'dattqh',
  '260524-1726-dhcp-tryathome-vmware-practical',
);
const draftsDir = join(planDir, 'content-drafts');
const backupDir = join(planDir, 'backup');

const CORE_FILES = [
  'tryathome-core-phase1-setup.json',
  'tryathome-core-phase2-dhcpd-minimal.json',
  'tryathome-core-phase3-dora-wireshark.json',
  'tryathome-core-phase4-case-a.json',
  'tryathome-core-phase5-case-b.json',
  'tryathome-core-phase6-compare-report.json',
];

function loadDrafts(files) {
  return files.map((f) => JSON.parse(readFileSync(join(draftsDir, f), 'utf-8')));
}

function backupLab(lab) {
  mkdirSync(backupDir, { recursive: true });
  const path = join(backupDir, 'dhcp-pre-tryathome-v3.json');
  writeFileSync(path, JSON.stringify(lab.toObject(), null, 2));
  console.log('[backup]', path);
}

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

function alreadyApplied(lab) {
  return lab.tryAtHome?.some(
    (t) => t.phaseType === 'core' && typeof t.title === 'string' && t.title.startsWith('Phase 1'),
  );
}

async function main() {
  await connectMongo();
  try {
    const lab = await Lab.findOne({ slug: 'dhcp' });
    if (!lab) throw new Error('lab "dhcp" not found');

    if (alreadyApplied(lab)) {
      console.log('[skip] tryAtHome v3 already applied (sentinel "Phase 1" detected)');
      return;
    }

    backupLab(lab);

    const core = loadDrafts(CORE_FILES);
    const newTryAtHome = [...core];

    console.log('[before] tryAtHome len:', lab.tryAtHome?.length ?? 0);
    lab.tryAtHome = newTryAtHome;
    lab.markModified('tryAtHome');
    lab.contentHash = computeContentHash(lab);
    lab.updatedAt = new Date();

    await lab.save();
    console.log(
      '[after] tryAtHome len:',
      newTryAtHome.length,
      `(${core.length} core, 0 optional — skipped per plan)`,
    );
    console.log('[hash]', lab.contentHash);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
