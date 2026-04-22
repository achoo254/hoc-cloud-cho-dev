# Phase 4: My Labs Dashboard + Publish Flow

## Context Links

- [Brainstorm report](../reports/brainstorm-260422-0955-user-generated-labs.md)
- Depends on: Phase 1 (API), Phase 2 (editor), Phase 3 (diagrams)

## Overview

- **Priority:** P1
- **Effort:** 4 days
- **Status:** pending

FE routes cho tạo/list/edit/delete labs của user. Publish flow tách biệt draft ↔ published. Tích hợp preview mode trước khi publish.

## Key Insights

- Existing app dùng React Router (kiểm tra `app/src/routes/`)
- Dashboard hiện tại (`leaderboard-section.tsx`) có pattern card grid — reuse
- Preview mode = render full lab như viewer thấy nhưng từ unsaved state

## Requirements

### Functional
- `/my-labs` page liệt kê labs của user (drafts + published), filter by status
- `/labs/new` mở editor trống
- `/labs/:slug/edit` load existing lab vào editor
- `/labs/:slug/preview` render lab như published view từ current draft
- Publish button: draft → published, confirmation modal
- Unpublish button: published → draft
- Delete button với confirm
- Empty state khi chưa có lab nào

### Non-functional
- List page <500ms first paint
- Auto-save draft mỗi 30s
- Optimistic UI updates

## Architecture

```
Routes (new)
├─ /my-labs           → MyLabsPage
├─ /labs/new          → LabEditorPage (new mode)
├─ /labs/:slug/edit   → LabEditorPage (edit mode)
└─ /labs/:slug/preview → LabPreviewPage

API calls
├─ GET /api/labs?author=me&status=all
├─ POST /api/labs
├─ PUT /api/labs/:slug
├─ POST /api/labs/:slug/publish
├─ POST /api/labs/:slug/unpublish
└─ DELETE /api/labs/:slug
```

## Related Code Files

**Create:**
- `app/src/routes/my-labs.tsx`
- `app/src/routes/lab-editor.tsx`
- `app/src/routes/lab-preview.tsx`
- `app/src/components/my-labs/lab-card.tsx`
- `app/src/components/my-labs/empty-state.tsx`
- `app/src/components/my-labs/publish-modal.tsx`
- `app/src/lib/hooks/use-auto-save.ts`

**Modify:**
- `app/src/App.tsx` — register new routes
- `app/src/lib/api.ts` — add `myLabs`, `createLab`, `updateLab`, `publishLab`, `unpublishLab`, `deleteLab`
- Navigation component — add "My Labs" link

## Implementation Steps

1. Add API client methods in `api.ts`.
2. Create `my-labs.tsx` page — fetch list, render `lab-card` grid, filter tabs (All/Drafts/Published).
3. Create `lab-card.tsx` component với title, module, status badge, edit/preview/delete actions.
4. Create `empty-state.tsx` — CTA "Tạo lab đầu tiên".
5. Create `lab-editor.tsx` page — detect new/edit mode, load lab if edit, wrap Phase 2 editor.
6. Implement `use-auto-save.ts` — debounced save every 30s if dirty.
7. Create `publish-modal.tsx` — confirm before publish/unpublish.
8. Create `lab-preview.tsx` page — render unsaved Tiptap state as published view.
9. Add navigation link "My Labs" (logged-in only).
10. Handle route guards: redirect `/my-labs`, `/labs/new`, `/labs/:slug/edit` to login if not authenticated.

## Todo List

- [ ] API client methods
- [ ] my-labs.tsx list page
- [ ] lab-card.tsx component
- [ ] empty-state.tsx
- [ ] lab-editor.tsx route (new + edit modes)
- [ ] use-auto-save.ts hook
- [ ] publish-modal.tsx
- [ ] lab-preview.tsx
- [ ] Navigation link
- [ ] Auth route guards
- [ ] Wire delete with confirm

## Success Criteria

- Logged-in user thấy "My Labs" link
- Dashboard show drafts + published tách biệt
- Tạo lab mới → redirect edit page với slug auto-generated
- Auto-save hoạt động (check network tab PUT 30s sau edit)
- Publish → status badge đổi, lab xuất hiện trong public search
- Unpublish → lab biến khỏi public search, còn trong My Labs
- Delete với confirm → lab mất hoàn toàn
- Logged-out user accessing /my-labs → redirect login

## Risk Assessment

- **Auto-save race condition** → Fix: debounce + request sequence number
- **User navigate away khi chưa save** → Fix: `beforeunload` warning khi dirty
- **Delete accident** → Fix: require typing lab title trong confirm modal

## Security Considerations

- All routes check session client-side (UX) và server-side (enforcement)
- Delete/publish chỉ owner
- No direct access qua URL guessing — API trả 404 nếu không phải owner và đang draft

## Next Steps

- Unblocks Phase 5 (migration cần dashboard working để verify)
