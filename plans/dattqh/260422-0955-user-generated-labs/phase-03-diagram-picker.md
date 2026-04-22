# Phase 3: Diagram Picker + Registry Integration

## Context Links

- [Brainstorm report](../reports/brainstorm-260422-0955-user-generated-labs.md)
- Depends on: Phase 2 (WalkthroughStepBlock ready)
- Related: `app/src/components/lab/diagrams/registry.ts`

## Overview

- **Priority:** P1
- **Effort:** 3 days
- **Status:** pending

Cho phép author chọn diagram template từ registry hiện có, preview trong editor, lưu reference (templateKey + config) vào lab document.

## Key Insights

- Registry hiện tại map `diagram.component` key → lazy-loaded React component
- Mỗi component có props signature khác nhau → cần metadata layer mô tả schema config
- Author không cần biết code — chỉ chọn template và điền inputs (optional config)

## Requirements

### Functional
- Modal picker hiển thị tất cả registered templates với thumbnail + description
- Click template → optional config form (nếu template có props) → insert
- Inline preview trong WalkthroughStep sau khi insert
- Remove/replace diagram trong step
- Output: `diagramRefs[]` trong lab document

### Non-functional
- Modal open <200ms
- Registry metadata không bloat runtime (lazy load component vẫn)

## Architecture

```
registry.ts
├─ templates: {
│    [key]: {
│      component: LazyExoticComponent,
│      meta: {
│        label, description, thumbnail,
│        configSchema: ZodSchema  // NEW
│      }
│    }
│  }

DiagramPickerModal
├─ Grid of template cards (from registry meta)
├─ Selected → ConfigForm (render from configSchema)
└─ Insert → WalkthroughStepBlock attrs
    → attrs.diagramRef = { templateKey, config }
```

## Related Code Files

**Modify:**
- `app/src/components/lab/diagrams/registry.ts` — add `meta` field với label/description/configSchema
- `app/src/components/editor/extensions/walkthrough-step-block.tsx` — add diagram slot + Change button
- `app/src/components/lab/lab-renderer.tsx` — render diagramRefs vào đúng step

**Create:**
- `app/src/components/editor/diagram-picker-modal.tsx` — modal UI
- `app/src/components/editor/diagram-config-form.tsx` — render form from Zod schema
- `app/src/components/editor/diagram-preview.tsx` — inline preview wrapper với error boundary

## Implementation Steps

1. Extend each registry entry với `meta: { label, description, thumbnail?, configSchema? }`.
2. Build `DiagramPickerModal` — grid of template cards, filter/search by label.
3. Build `DiagramConfigForm` — introspect Zod schema → render input fields. Supports string, number, enum (select), boolean (checkbox).
4. On insert: update WalkthroughStepBlock attrs với `diagramRef`.
5. Build `DiagramPreview` wrapper — lazy load component, pass config, wrap in error boundary.
6. Modify WalkthroughStepBlock: if `diagramRef` exists, render preview; show "Change" / "Remove" buttons.
7. Modify `lab-renderer.tsx` để đọc `diagramRefs[]` field và render cùng template ở viewing mode.
8. Handle template removed from registry (author referenced deleted template) → fallback empty placeholder.

## Todo List

- [ ] Extend registry.ts với meta
- [ ] Define configSchema cho tất cả existing templates
- [ ] diagram-picker-modal.tsx
- [ ] diagram-config-form.tsx (Zod → form)
- [ ] diagram-preview.tsx với error boundary
- [ ] Wire vào WalkthroughStepBlock
- [ ] Update lab-renderer.tsx để render diagramRefs
- [ ] Handle missing template fallback

## Success Criteria

- Author chọn template → config form render dynamic → insert thành công
- Preview render đúng trong editor
- Viewer mode render cùng template với cùng config
- Template deleted from registry không break lab render
- No XSS via template props (Zod validation + render as React, not innerHTML)

## Risk Assessment

- **Config schema mismatch giữa editor và renderer** → Fix: cùng schema source
- **Heavy diagram components load trong picker modal** → Fix: lazy load on hover/select
- **Author config invalid → runtime error** → Fix: Zod validate + error boundary fallback

## Security Considerations

- Template props được Zod validate ở save và render time
- Không pass raw user strings vào `dangerouslySetInnerHTML`
- Error boundary ngăn một template xấu làm crash cả lab

## Next Steps

- Unblocks Phase 4 (dashboard preview cần full render path)
