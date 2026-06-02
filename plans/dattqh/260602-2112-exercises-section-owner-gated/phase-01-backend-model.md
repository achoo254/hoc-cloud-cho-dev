---
phase: 1
title: Backend model
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Backend model

## Overview
Tạo collection `exercises` riêng + Mongoose model, mirror `lab-model.js` nhưng KHÔNG post-save Meili hook và schema tối giản hơn.

## Requirements
- Functional: model `Exercise` lưu được full shape `{slug, title, topic, tags, source, brief, estimatedMinutes, guide[], demo[], references[]}` không mất field.
- Non-functional: dùng `Schema.Types.Mixed` cho `guide/demo/references` (Zod-less subdocs, giống lab) để khỏi rớt field; `slug` unique + index; `topic` index; `timestamps: true`.

## Architecture
- Mongo single-node (KHÔNG transaction). Content arrays là Mixed — FE/seed là source of truth shape.
- KHÔNG Meili hook (đã chốt no-search) → model gọn, không import sync-search-index.

## Related Code Files
- Create: `server/db/models/exercise-model.js`
- Modify: `server/db/models/index.js` (export `Exercise`)
- Read for context: `server/db/models/lab-model.js` (mẫu Mixed subdocs + index + timestamps)

## Implementation Steps
1. Tạo `server/db/models/exercise-model.js`:
   ```js
   import mongoose from 'mongoose';
   const { Schema } = mongoose;
   const exerciseSchema = new Schema({
     slug: { type: String, unique: true, required: true, index: true },
     title: { type: String, required: true },
     topic: { type: String, index: true },
     tags: [String],
     source: String,
     brief: String,            // đề bài / yêu cầu (HTML-capable)
     estimatedMinutes: Number,
     guide: [Schema.Types.Mixed],   // [{ step, instruction, command?, note? }]
     demo: [Schema.Types.Mixed],    // [{ step, what, command?, output, note?, screenshot? }]
     references: [Schema.Types.Mixed], // [{ label, url }]
     contentHash: String,
   }, { timestamps: true });
   export const Exercise = mongoose.model('Exercise', exerciseSchema);
   ```
   (KHÔNG thêm post-save Meili hook — khác lab-model.)
2. `server/db/models/index.js`: thêm `export { Exercise } from './exercise-model.js';`

## Success Criteria
- [ ] `exercise-model.js` tạo, export `Exercise`; `index.js` re-export.
- [ ] `node --env-file=.env.development -e "import('./server/db/models/index.js').then(m=>console.log(typeof m.Exercise))"` (hoặc seed script Phase 4) load model không lỗi.
- [ ] Không có Meili import trong model.

## Risk Assessment
- Mixed subdocs cần `markModified` khi update doc đã tồn tại (xử lý ở seed Phase 4) — note để Phase 4 không bị silent drop.
