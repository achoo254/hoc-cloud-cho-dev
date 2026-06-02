---
phase: 4
title: Seed va sample
status: completed
priority: P2
effort: 1.5h
dependencies:
  - 1
---

# Phase 4: Seed va sample

## Overview
Script upsert exercise (mirror `seed-linux-labs.js`) + 1 bài tập mẫu để test end-to-end. Đây cũng là pattern để sau này tạo bài tập mới.

## Requirements
- Functional: `seed-exercise.js` insert/upsert exercise theo slug (idempotent + contentHash + backup). 1 sample exercise insert được vào DB.
- Non-functional: chạy `node --env-file=.env.development server/scripts/seed-exercise.js`; `markModified` cho guide/demo/references (Mixed) tránh silent drop khi update.

## Architecture
- Content draft dạng ES module `export default {...}` (single-quote JS + HTML double-quote) — giống lab content drafts, tránh JSON escaping.
- Sample exercise: 1 bài Linux đơn giản, đủ 2 phần guide+demo, output thật (chạy trên VM hoặc local) để verify renderer. Đánh dấu deletable.

## Related Code Files
- Create: `server/scripts/seed-exercise.js`, `plans/dattqh/260602-2112-exercises-section-owner-gated/content-drafts/exercise-sample-*.js`
- Read for context: `server/scripts/seed-linux-labs.js` (mẫu upsert+contentHash+backup), `server/db/mongo-client.js`

## Implementation Steps
1. `seed-exercise.js` (mirror seed-linux-labs): connectMongo → loop content modules → find by slug → backup nếu tồn tại → set fields + `markModified('guide'|'demo'|'references')` → contentHash (sha256 của guide+demo+brief) → `save()` → log. (KHÔNG Meili.)
2. Tạo 1 content draft mẫu (vd `exercise-sample-linux-timesync.js`) shape camelCase đầy đủ: `slug, title, topic:'linux', tags, source, brief, estimatedMinutes, guide:[...], demo:[...] (output thật), references:[...]`.
   - Output demo: chạy thật command đơn giản (vd trên VM `dattqh-nat`/`dattqh-client` hoặc local) → capture output thật cho field `output`.
3. Chạy seed → xác nhận doc vào collection `exercises`.

## Success Criteria
- [ ] `node --env-file=.env.development server/scripts/seed-exercise.js` chạy ok, in slug + counts.
- [ ] `mongosh ... db.exercises.countDocuments()` ≥ 1; doc có đủ guide[]/demo[].
- [ ] Re-run idempotent (update, không duplicate; backup tạo).

## Risk Assessment
- Demo output phải THẬT (không bịa) — chạy command thật rồi paste; nếu cần VM thì SSH như session labs.
- Sample là placeholder — note rõ user có thể xoá sau verify (hoặc giữ làm ví dụ).
- `.env.development` trỏ DB thật → sample exercise vào prod DB; chỉ owner thấy nên không ảnh hưởng public. Cân nhắc xoá sample sau verify nếu không muốn giữ.
