# Brainstorm: User-Generated Labs Platform

**Date:** 2026-04-22 09:55
**Branch:** master
**Status:** Approved — ready for planning

## Problem Statement

Hiện tại labs content hardcode trong `fixtures/labs/*.json` (8 files), sync vào MongoDB + Meilisearch qua scripts. Muốn mở rộng để mọi user tự tạo labs qua UI (block editor), lưu hoàn toàn trong MongoDB.

## Requirements (Confirmed)

| Area | Decision |
|------|----------|
| Creator permissions | All logged-in users |
| Lab structure | Full: TL;DR + Walkthrough + Quiz + Flashcards + TryAtHome |
| Diagrams | Predefined templates từ existing `registry.ts` |
| Moderation | None (post-hoc report/flag acceptable) |
| Versioning | None |
| Migration | Full — xóa JSON fixtures, seed MongoDB 1 lần |
| Editor | Tiptap block editor |
| Timeline | Full feature (3-4 weeks) |

## Approaches Evaluated

### A1 — Form-based editor (rejected)
- **Pros:** Nhanh implement (1 week), simple
- **Cons:** UX kém với nested structures, khó edit walkthrough steps
- **Verdict:** Không đáp ứng mục tiêu long-term

### A2 — Tiptap Block Editor (CHOSEN)
- **Pros:** ProseMirror-based battle-tested, React-first, TypeScript tốt, custom extensions dễ, bundle ~150kb acceptable
- **Cons:** Learning curve cao hơn, cần build custom blocks cho từng lab component
- **Verdict:** Đầu tư đúng cho long-term UX

### A3 — Markdown + Forms hybrid (rejected)
- **Pros:** Flexible text
- **Cons:** User phổ thông không biết markdown, không đạt được UX Notion-style

## Final Architecture

### Data Model Extensions (`server/db/models/lab-model.js`)

```js
{
  slug: { unique, required, index },
  authorId: { ObjectId, ref: 'User', index },    // NEW
  status: { enum: ['draft', 'published'], default: 'draft' }, // NEW
  visibility: { enum: ['public', 'private'], default: 'public' }, // NEW
  viewCount: { Number, default: 0 },             // NEW
  module, title, estimatedMinutes, filePath,     // existing
  tldr, walkthrough, quiz, flashcards, tryAtHome, // existing
  diagramRefs: [{                                // NEW
    stepIndex: Number,
    templateKey: String,      // maps to registry.ts
    config: Mixed
  }],
  contentHash                                    // existing
}
```

Indexes: `{ authorId, status }`, `{ module, status }`, `{ status, updatedAt }`

### API Endpoints (`server/api/labs-routes.js` — new file)

| Method | Path | Auth | Ownership |
|--------|------|------|-----------|
| GET | `/api/labs` | optional | List published + own drafts |
| POST | `/api/labs` | required | Create as author |
| GET | `/api/labs/:slug` | optional | Published OR author |
| PUT | `/api/labs/:slug` | required | Author only |
| DELETE | `/api/labs/:slug` | required | Author only |
| POST | `/api/labs/:slug/publish` | required | Author only |

Rate limit: 10 labs/day/user on POST.

### Tiptap Custom Extensions (`app/src/components/editor/`)

| Extension | Renders |
|-----------|---------|
| `TldrBlock` | Card với 4 field (what/why/whyBreaks/deploymentUse) |
| `WalkthroughStepBlock` | Step content + optional diagram slot |
| `QuizBlock` | Question + answers list + correct index |
| `FlashcardBlock` | Front/back |
| `TryAtHomeBlock` | Command + description |
| `DiagramPickerNode` | Modal chọn template từ registry → insert ref |

Output: Tiptap JSON → adapter → existing lab schema shape.

### Migration Flow

```
Existing 8 JSON fixtures
        │
        ├─ One-time seed script (scripts/seed-labs-from-fixtures.js)
        │   → Write to MongoDB với authorId = system user
        │
        ├─ Remove fixtures/labs/*.json
        ├─ Remove npm run gen:content pipeline
        └─ Remove app/src/generated/labs-index.json,search-index.json
            → FE fetch từ /api/labs thay cho bundled JSON
```

### Meilisearch Sync
- Giữ `server/db/sync-search-index.js` logic
- Trigger sync khi: create, update, publish, delete
- Filter: `status = published AND visibility = public`

## Implementation Phases

| # | Phase | Deliverables | Days |
|---|-------|--------------|------|
| 1 | Schema + CRUD API | lab-model extensions, labs-routes.js, auth middleware, rate limit | 5 |
| 2 | Tiptap editor core | Setup Tiptap, 5 custom block extensions, JSON↔schema adapter | 7 |
| 3 | Diagram picker | Modal UI, registry integration, DiagramPickerNode | 3 |
| 4 | My Labs dashboard | List my labs, publish flow, delete, draft preview | 4 |
| 5 | Migration | Seed script, remove JSON fixtures, FE fetch API | 3 |
| 6 | Testing + polish | E2E smoke, XSS sanitization, rate limit validation | 3 |

**Total:** ~25 working days (~5 weeks với buffer)

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Content quality suy giảm (no moderation) | Med | Report abuse button + admin soft-delete |
| Tiptap JSON schema drift | High | Adapter layer + validation schema + snapshot tests |
| Slug collision | Low | Auto-suffix `-2`, `-3` fallback |
| Existing 8 labs break | High | Snapshot render tests trước/sau migration |
| Diagram template XSS | High | DOMPurify + strict per-template config schema |
| Performance ở scale | Med | Pagination + indexes + Meilisearch cho search |

## Security

- Auth required POST/PUT/DELETE
- Ownership check mọi mutation (`lab.authorId === session.userId`)
- DOMPurify cho HTML output
- Rate limit 10 labs/day/user
- Content limits: tldr ≤20 items, walkthrough ≤30 steps, quiz ≤50 questions
- Slug validation: `/^[a-z0-9-]{3,64}$/`

## Success Metrics

- 0 references đến `fixtures/labs/` và `app/src/generated/` trong code
- First user tạo được lab hoàn chỉnh <15 phút
- Meilisearch index cập nhật <2s sau publish
- 100% existing 8 labs render đúng sau migration (snapshot diff)
- Zero auth bypass trong security audit

## Next Steps

1. Tạo implementation plan qua `/ck:plan` với 6 phases trên
2. Research Tiptap custom extension patterns
3. Audit existing `lab-renderer.tsx` để đảm bảo adapter tương thích

## Unresolved Questions

- Bulk import labs (CSV/JSON paste) — nên có ở MVP hay later?
- User profile page hiển thị labs tạo — scope này hay separate feature?
- Tags/categories ngoài `module` có cần thiết không?
- Search scope: chỉ published public, hay include own drafts?
- Fork/clone lab từ user khác — feature thêm hay out of scope?
