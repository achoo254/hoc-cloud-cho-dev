# Phase 2: Tiptap Editor Core + Custom Blocks

## Context Links

- [Brainstorm report](../reports/brainstorm-260422-0955-user-generated-labs.md)
- Depends on: Phase 1 (API endpoints)
- Related: `app/src/components/lab/lab-renderer.tsx` (target render output)

## Overview

- **Priority:** P1
- **Effort:** 7 days
- **Status:** pending

Install Tiptap, configure ProseMirror schema với 5 custom block extensions (TL;DR, Walkthrough, Quiz, Flashcard, TryAtHome). Build adapter JSON ↔ existing lab shape.

## Key Insights

- Tiptap output = ProseMirror JSON. Existing renderer expects flat schema (tldr[], walkthrough[], quiz[], flashcards[], tryAtHome[]).
- Custom blocks need `atom: true` để prevent nested editing inside quiz/flashcard structures.
- React node views cho phép render block UI thông qua React components.

## Requirements

### Functional
- Editor hỗ trợ insert block qua slash command `/tldr`, `/quiz`, etc.
- Blocks có structured inputs (không free-text)
- Live preview song song editor
- Save as draft và publish qua API từ Phase 1
- Load existing lab vào editor (for edit mode)

### Non-functional
- Bundle size impact <200kb gzipped
- Editor render <500ms on cold load
- No DOM manipulation ngoài React/Tiptap

## Architecture

```
Tiptap Editor
├─ StarterKit (heading, paragraph, bold, italic, lists)
├─ Custom Extensions
│  ├─ TldrBlock (atom, React node view)
│  ├─ WalkthroughStepBlock
│  ├─ QuizBlock
│  ├─ FlashcardBlock
│  └─ TryAtHomeBlock
├─ SlashCommand extension
└─ Placeholder

Output JSON → tiptap-to-lab-adapter.ts → Lab API shape
Lab shape → lab-to-tiptap-adapter.ts → Tiptap JSON (for editing)
```

## Related Code Files

**Create:**
- `app/src/components/editor/lab-editor.tsx` — main editor component
- `app/src/components/editor/extensions/tldr-block.tsx`
- `app/src/components/editor/extensions/walkthrough-step-block.tsx`
- `app/src/components/editor/extensions/quiz-block.tsx`
- `app/src/components/editor/extensions/flashcard-block.tsx`
- `app/src/components/editor/extensions/try-at-home-block.tsx`
- `app/src/components/editor/extensions/slash-command.tsx`
- `app/src/lib/tiptap-to-lab-adapter.ts`
- `app/src/lib/lab-to-tiptap-adapter.ts`

**Modify:**
- `app/package.json` — add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `tippy.js`

## Implementation Steps

1. Install Tiptap packages + peer deps.
2. Base `lab-editor.tsx` với StarterKit + Placeholder.
3. Implement `TldrBlock` extension: 4-field form (what/why/whyBreaks/deploymentUse) as React node view. Atom node.
4. Implement `WalkthroughStepBlock`: title + content textarea + diagram slot placeholder (filled Phase 3).
5. Implement `QuizBlock`: question + 2-4 answers + correct index select.
6. Implement `FlashcardBlock`: front/back textarea.
7. Implement `TryAtHomeBlock`: command input + description.
8. Implement SlashCommand extension (tippy.js popup) — `/` triggers menu để insert block.
9. Build `tiptap-to-lab-adapter.ts`: walk Tiptap doc JSON → extract blocks by type → return `{ title, module, tldr[], walkthrough[], quiz[], flashcards[], tryAtHome[] }`.
10. Build `lab-to-tiptap-adapter.ts`: inverse direction.
11. Wire Save button → adapter → `POST /api/labs` or `PUT /api/labs/:slug`.
12. Snapshot test round-trip: lab → tiptap → lab preserves all fields.

## Todo List

- [ ] Install Tiptap packages
- [ ] Base lab-editor.tsx
- [ ] TldrBlock extension
- [ ] WalkthroughStepBlock extension
- [ ] QuizBlock extension
- [ ] FlashcardBlock extension
- [ ] TryAtHomeBlock extension
- [ ] SlashCommand extension
- [ ] Tiptap → Lab adapter
- [ ] Lab → Tiptap adapter
- [ ] Wire Save/Update buttons
- [ ] Round-trip snapshot test

## Success Criteria

- Slash command menu xuất hiện khi gõ `/`
- Insert 5 block types thành công
- Adapter chuyển đổi 2 chiều không mất data
- Save button gọi đúng API endpoint
- Load existing lab → edit → save giữ nguyên content khác
- No console errors or React key warnings

## Risk Assessment

- **ProseMirror schema conflicts giữa blocks** → Fix: namespace node types (`labTldrBlock`, etc.)
- **Adapter không handle edge cases (empty blocks)** → Fix: Zod validation trước save
- **Bundle bloat** → Fix: lazy load editor route, measure với `vite-bundle-visualizer`

## Security Considerations

- DOMPurify cho mọi HTML output từ Tiptap
- Disable raw HTML paste extension
- Content length check ở adapter layer (throw if exceed Phase 1 caps)

## Next Steps

- Unblocks Phase 3 (diagram picker plugs vào WalkthroughStepBlock)
- Unblocks Phase 4 (dashboard cần editor route)
