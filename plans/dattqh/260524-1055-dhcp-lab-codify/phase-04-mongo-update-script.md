# Phase 4 — Mongo Update Script

**Status**: pending
**Effort**: 1h
**Blocker**: Phase 3 (content drafts ready)

## Goal

Viết và chạy script append nội dung mới vào lab `dhcp` trong Mongo. Theo pattern `server/scripts/update-lab-tcpdump-content.js` (đã ship cho icmp-ping + http).

## Files to Modify / Create

```
server/scripts/
└── update-lab-dhcp-vmware-content.js     # NEW — định nghĩa DHCP_ADDITIONS + runner
```

## Reference Pattern

Đọc `server/scripts/update-lab-tcpdump-content.js`:
- Export `const ICMP_ADDITIONS = { tryAtHome, misconceptions, tldr, walkthrough, quiz, flashcards }`
- Runner file riêng (`server/scripts/update-lab-tcpdump.js`) hoặc inline trong cùng file → load Mongoose model, `$push` từng array

Cho DHCP, mở `update-lab-tcpdump.js` (runner) để xem cách load env + connect + push:

```bash
# Reference script structure (sẽ đọc trong implementation)
cat server/scripts/update-lab-tcpdump.js
```

## Implementation Steps

### 1. Tạo file `server/scripts/update-lab-dhcp-vmware-content.js`

Cấu trúc:
```js
/**
 * update-lab-dhcp-vmware-content.js
 * Append content for DHCP VMware lab (2-client scenario): ping-check + ARP flap.
 * Shapes follow Zod schema in app/src/lib/schema-lab.ts.
 *
 * Usage: node --env-file=.env.development server/scripts/update-lab-dhcp-vmware-content.js
 */

import mongoose from 'mongoose'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const draftsDir = join(__dirname, '..', '..', 'plans', 'dattqh',
  '260524-1055-dhcp-lab-codify', 'content-drafts')

const TRY_AT_HOME_ADDITIONS = JSON.parse(
  readFileSync(join(draftsDir, 'try-at-home-additions.json'), 'utf-8')
)
const WALKTHROUGH_ADDITIONS = JSON.parse(
  readFileSync(join(draftsDir, 'walkthrough-additions.json'), 'utf-8')
)
const MISCONCEPTIONS_ADDITIONS = JSON.parse(
  readFileSync(join(draftsDir, 'misconceptions-additions.json'), 'utf-8')
)

export const DHCP_ADDITIONS = {
  tryAtHome: TRY_AT_HOME_ADDITIONS,        // 4 items
  walkthrough: WALKTHROUGH_ADDITIONS,      // 2 steps (8, 9)
  misconceptions: MISCONCEPTIONS_ADDITIONS, // 4 items
}

const uri = process.env.MONGODB_URI
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1) }

await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
const Lab = mongoose.model('Lab', new mongoose.Schema({}, { strict: false }), 'labs')

const lab = await Lab.findOne({ slug: 'dhcp' }).lean()
if (!lab) { console.error('lab dhcp not found'); process.exit(2) }

console.log('Before:', {
  tryAtHome: lab.tryAtHome?.length ?? 0,
  walkthrough: lab.walkthrough?.length ?? 0,
  misconceptions: lab.misconceptions?.length ?? 0,
})

// Idempotency check: nếu step 8 đã có trong walkthrough → skip
const hasStep8 = lab.walkthrough?.some(w => w.step === 8 || w.step === '8')
if (hasStep8) {
  console.log('Step 8 đã tồn tại → skip (idempotent)')
  await mongoose.disconnect()
  process.exit(0)
}

const result = await Lab.updateOne(
  { slug: 'dhcp' },
  {
    $push: {
      tryAtHome: { $each: DHCP_ADDITIONS.tryAtHome },
      walkthrough: { $each: DHCP_ADDITIONS.walkthrough },
      misconceptions: { $each: DHCP_ADDITIONS.misconceptions },
    },
    $set: {
      // Force re-sync to Meilisearch via post-save hook → cần findOneAndUpdate?
      // Theo lab-model.js, post-save hook trigger on .save() not updateOne.
      // → SKIP auto-sync, manual run server/db/sync-search-index.js sau (Phase 6).
      updatedAt: new Date(),
    },
  }
)
console.log('updateResult:', result)

const after = await Lab.findOne({ slug: 'dhcp' }).lean()
console.log('After:', {
  tryAtHome: after.tryAtHome?.length,
  walkthrough: after.walkthrough?.length,
  misconceptions: after.misconceptions?.length,
})

await mongoose.disconnect()
```

### 2. Pre-run backup
```bash
# Dump lab dhcp hiện tại trước khi update
mkdir -p plans/dattqh/260524-1055-dhcp-lab-codify/backup
node --env-file=.env.development -e "
import('mongoose').then(async m => {
  await m.default.connect(process.env.MONGODB_URI);
  const Lab = m.default.model('Lab', new m.default.Schema({}, {strict:false}), 'labs');
  const lab = await Lab.findOne({slug:'dhcp'}).lean();
  require('fs').writeFileSync('plans/dattqh/260524-1055-dhcp-lab-codify/backup/dhcp-pre-update.json', JSON.stringify(lab, null, 2));
  await m.default.disconnect();
})"
```

### 3. Run update script
```bash
node --env-file=.env.development server/scripts/update-lab-dhcp-vmware-content.js
```

Output mong đợi:
```
Before: { tryAtHome: 5, walkthrough: 7, misconceptions: 5 }
updateResult: { acknowledged: true, modifiedCount: 1, ... }
After:  { tryAtHome: 9, walkthrough: 9, misconceptions: 9 }
```

### 4. Re-sync Meilisearch index (nếu cần)
```bash
node --env-file=.env.development server/db/sync-search-index.js
```
(Verify nếu lab content thay đổi có sync vào MeiliSearch — kiểm tra GET `/api/search?q=ping-check` sau khi sync)

### 5. Verify qua API endpoint
```bash
# Start dev:server nếu chưa
pnpm run dev:server &

# Query
curl -s http://localhost:8387/api/labs/dhcp | jq '{
  tryAtHome: (.try_at_home // .tryAtHome | length),
  walkthrough: (.walkthrough | length),
  misconceptions: (.misconceptions | length)
}'
# Mong đợi: { tryAtHome: 9, walkthrough: 9, misconceptions: 9 }
```

(API endpoint convert `tryAtHome` → `try_at_home` qua `toLabContent()` ở `server/api/labs-routes.js` — verify trong implementation)

## Acceptance Criteria

- [ ] `server/scripts/update-lab-dhcp-vmware-content.js` exists, follows pattern of `update-lab-tcpdump-content.js`
- [ ] Script chạy thành công, output báo `modifiedCount: 1`
- [ ] `lab.dhcp.tryAtHome.length === 9` trong Mongo
- [ ] `lab.dhcp.walkthrough.length === 9` (step number 1-9 không trùng)
- [ ] `lab.dhcp.misconceptions.length === 9`
- [ ] Backup `dhcp-pre-update.json` saved trong `backup/`
- [ ] Script idempotent: chạy lần 2 → skip (không append duplicate)
- [ ] API endpoint `/api/labs/dhcp` trả về cùng counts khi BE running

## Notes

- **Field name canonical Mongo**: `tryAtHome` (camelCase) per `server/db/models/lab-model.js:17`. Script PHẢI dùng `tryAtHome` chứ KHÔNG `try_at_home` (Zod naming) khi `$push`.
- **API converter**: `server/api/labs-routes.js::toLabContent()` chuyển `tryAtHome` → `try_at_home` cho FE Zod parse. Verify khi smoke test Phase 6.
- **Meilisearch sync**: Mongoose post-save hook trigger qua `.save()` không phải `updateOne()`. Nếu lab content cần sync vào search index → chạy `sync-search-index.js` riêng.
- **Rollback**: nếu modifiedCount=0 hoặc field length không khớp → restore từ `backup/dhcp-pre-update.json` qua `Lab.replaceOne({slug:'dhcp'}, backupDoc)`.
