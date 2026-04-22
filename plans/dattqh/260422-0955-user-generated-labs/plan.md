---
title: "User-Generated Labs Platform"
description: "Enable all users to author labs via Tiptap block editor; full migration from JSON fixtures to MongoDB-only storage"
status: pending
priority: P1
effort: 5 weeks
branch: feat/user-generated-labs
tags: [labs, editor, tiptap, mongodb, migration, ugc]
created: 2026-04-22
blockedBy: []
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260422-0955-user-generated-labs.md
---

## Goal

Cho phép mọi user tự tạo labs qua UI block editor (Tiptap), lưu hoàn toàn trong MongoDB. Loại bỏ JSON fixtures static, chuyển lab content sang dynamic DB-backed với CRUD API và author ownership.

## Success Criteria

- [ ] MongoDB là single source of truth cho labs (0 refs `fixtures/labs/*.json` và `app/src/generated/`)
- [ ] Mọi user đã login có thể tạo/edit/delete lab riêng qua UI
- [ ] Tiptap editor render 5 custom blocks (TL;DR, Walkthrough, Quiz, Flashcard, TryAtHome) đúng schema
- [ ] Diagram picker tích hợp với `registry.ts` existing
- [ ] Meilisearch tự động sync khi create/update/publish/delete
- [ ] 8 labs existing migrate thành công, render không đổi sau migration
- [ ] Rate limit: 10 labs/day/user hoạt động
- [ ] Zero auth bypass hoặc XSS vector trong security audit

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Schema Extensions + CRUD API | pending | 5d | [phase-01-schema-and-crud-api.md](phase-01-schema-and-crud-api.md) |
| 2 | Tiptap Editor Core + Custom Blocks | pending | 7d | [phase-02-tiptap-editor-core.md](phase-02-tiptap-editor-core.md) |
| 3 | Diagram Picker + Registry Integration | pending | 3d | [phase-03-diagram-picker.md](phase-03-diagram-picker.md) |
| 4 | My Labs Dashboard + Publish Flow | pending | 4d | [phase-04-my-labs-dashboard.md](phase-04-my-labs-dashboard.md) |
| 5 | Migration: Seed + Remove Fixtures | pending | 3d | [phase-05-migration-remove-fixtures.md](phase-05-migration-remove-fixtures.md) |
| 6 | Testing + Security Hardening | pending | 3d | [phase-06-testing-and-security.md](phase-06-testing-and-security.md) |

## Key Dependencies

- `260422-0803-sqlite-to-mongodb-meilisearch` (completed) — MongoDB + Mongoose + Meilisearch infrastructure
- Existing `server/db/models/lab-model.js` — will be extended
- Existing `app/src/components/lab/diagrams/registry.ts` — diagram picker source

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Tiptap over Editor.js/Plate | ProseMirror battle-tested, React-first, strong TS, easy custom extensions |
| No moderation | Early-stage; can add report/flag later |
| No versioning | YAGNI — add if users request |
| Full migration (not dual source) | Avoid drift between JSON and DB |
| Rate limit 10/day/user | Prevent spam while allowing genuine authoring |

## Risks

- **Tiptap JSON ↔ lab schema drift** → mitigated by adapter layer + snapshot tests
- **Existing 8 labs break after migration** → snapshot render tests pre/post
- **XSS via user content** → DOMPurify on render + strict Tiptap extension allowlist
- **Slug collision** → auto-suffix `-2`, `-3`

## Next Steps After Plan

1. Review phase files
2. Start Phase 1 (schema + API)
3. Run `/ck:cook` to begin implementation
