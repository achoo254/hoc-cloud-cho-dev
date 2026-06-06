# Phase 6 — Mongo Update Script (Idempotent + Backup)

**Status:** pending | **Priority:** high | **Effort:** 1h | **Depends on:** Phase 4 (Phase 5 optional)

## Context

Cần script Node.js idempotent để thay `tryAtHome[]` cũ (9 item) bằng content drafts mới (6 core + optional 3). Pattern tham khảo: `server/scripts/update-lab-dhcp-vmware-v2.js` (đã chạy trước, dùng hash + skip).

## Files

| File | Action |
|------|--------|
| `server/scripts/update-lab-dhcp-tryathome-v3.js` (NEW) | Main update script |
| `plans/dattqh/260524-1726-dhcp-tryathome-vmware-practical/backup/dhcp-pre-tryathome-v3.json` | Backup full lab document trước update |

## Implementation outline

```js
import crypto from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab } from '../db/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const planDir = join(__dirname, '..', '..', 'plans', 'dattqh',
  '260524-1726-dhcp-tryathome-vmware-practical');
const draftsDir = join(planDir, 'content-drafts');
const backupDir = join(planDir, 'backup');

// Load 6 core + 3 optional drafts
const CORE_FILES = [
  'tryathome-core-phase1-setup.json',
  'tryathome-core-phase2-dhcpd-minimal.json',
  'tryathome-core-phase3-dora-wireshark.json',
  'tryathome-core-phase4-case-a.json',
  'tryathome-core-phase5-case-b.json',
  'tryathome-core-phase6-compare-report.json',
];
const OPTIONAL_FILES = [
  'tryathome-optional-O1-nat-gateway.json',
  'tryathome-optional-O2-ping-check-deep.json',
  'tryathome-optional-O3-apipa-fallback.json',
];

const SENTINEL_TITLE = 'Phase 1 — Setup tối thiểu';  // detect already-applied

function loadDrafts(files) {
  return files.map(f => JSON.parse(readFileSync(join(draftsDir, f), 'utf-8')));
}

function backupLab(lab) {
  mkdirSync(backupDir, { recursive: true });
  const path = join(backupDir, 'dhcp-pre-tryathome-v3.json');
  writeFileSync(path, JSON.stringify(lab.toObject(), null, 2));
  console.log('[backup]', path);
}

function computeContentHash(lab) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({
      tldr: lab.tldr,
      walkthrough: lab.walkthrough,
      quiz: lab.quiz,
      flashcards: lab.flashcards,
      tryAtHome: lab.tryAtHome,
      misconceptions: lab.misconceptions,
    }))
    .digest('hex');
}

async function main() {
  await connectMongo();
  try {
    const lab = await Lab.findOne({ slug: 'dhcp' });
    if (!lab) throw new Error('lab "dhcp" not found');

    // Idempotency check
    const alreadyApplied = lab.tryAtHome?.some(t => t.title === SENTINEL_TITLE);
    if (alreadyApplied) {
      console.log('[skip] tryAtHome v3 already applied');
      return;
    }

    backupLab(lab);

    const core = loadDrafts(CORE_FILES);
    const optional = loadDrafts(OPTIONAL_FILES);
    const newTryAtHome = [...core, ...optional];

    console.log('[before] tryAtHome len:', lab.tryAtHome?.length ?? 0);
    lab.tryAtHome = newTryAtHome;
    lab.contentHash = computeContentHash(lab);
    lab.updatedAt = new Date();
    lab.markModified('tryAtHome');

    await lab.save();
    console.log('[after] tryAtHome len:', newTryAtHome.length,
      `(${core.length} core + ${optional.length} optional)`);
    console.log('[hash]', lab.contentHash);
  } finally {
    await disconnectMongo();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
```

## Run

```bash
# Backup tự động vào plans/.../backup/
node --env-file=.env.development server/scripts/update-lab-dhcp-tryathome-v3.js

# Verify
mongo dhcp-lab --eval 'db.labs.findOne({slug:"dhcp"}, {tryAtHome:1, contentHash:1})'
```

## Rollback

```bash
# Restore từ backup nếu cần
node -e "const data = require('./plans/dattqh/260524-1726-dhcp-tryathome-vmware-practical/backup/dhcp-pre-tryathome-v3.json'); /* restore */"
```

Hoặc viết script `restore-lab-dhcp-tryathome.js` riêng nếu cần.

## Acceptance criteria

- [ ] Script chạy lần đầu → backup tạo + tryAtHome replace + content hash mới
- [ ] Chạy lần 2 → log "skip" + không đổi DB
- [ ] Meilisearch tự sync qua post-save hook (verify search "DHCP practical phase" trả về lab)
- [ ] Frontend `GET /api/labs/dhcp` trả về `tryAtHome` mới

## Risks

- Sentinel detect bằng `title === 'Phase 1 — Setup tối thiểu'` — nếu sau này đổi title sẽ false-negative → cần đổi sang detect `phaseType === 'core'` hoặc field marker
- Mongo write atomicity: single doc save, OK cho standalone mode (theo memory project)
- Backup không recoverable nếu post-save hook lỗi Meilisearch — handle separately
