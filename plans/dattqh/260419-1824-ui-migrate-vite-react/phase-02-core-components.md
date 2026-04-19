# Phase 02 — Core Components

**Status:** completed (2026-04-19) · **Effort:** 1d · **Priority:** P1 · **Depends on:** phase-00, phase-01

## Completion notes

- Schema v3 Zod port sang `app/src/lib/schema-lab.ts` + inferred types
- `lib/sm2.ts` port từ `labs/_shared/lab-template.js:28-43`
- Components: lab-renderer, quiz-block, flashcard-sm2, code-block (shiki lazy), mermaid-diagram (lazy + error boundary), progress-bar
- `/dev/playground` smoke test parse `fixtures/dns.json` và render đủ 5 components
- Hooks: `useProgress` (React Query, optimistic)
- `tsc --noEmit` 0 errors, `npm run build` pass (warning: mermaid chunk size — tối ưu bằng `manualChunks` phase sau)

## Open items cho phase sau

- `/dev/playground` nên gate `import.meta.env.DEV` (hiện render prod cũng có)
- `opened_at` POST mỗi mount LabRenderer — dedupe với `useRef` nếu rate-limit

**Pre-requisite:** Schema v3 Zod từ phase-00 đã pin, fixture parse ≥ 95%. **Không** reverse-engineer từ `lab-template.js` — dùng fixtures làm source of truth.

## Goal

Xây dựng Zod schema v3 + bộ components tái sử dụng thay cho `labs/_shared/lab-template.js` (868 LOC).

## Steps

1. **Zod schema v3** — đã có từ phase-00 (`app/src/lib/schema-lab.ts`). Phase 02 chỉ refine types nếu cần khi viết component, không rewrite schema.

2. **`<LabRenderer>`** (`components/lab/lab-renderer.tsx`):
   - Input: `LabContent` object
   - Render title, meta, sections theo thứ tự THINK → SEE → SHIP
   - Slot cho Mermaid diagrams, code blocks (syntax highlight qua `shiki` hoặc `prism-react-renderer`)

3. **`<QuizBlock>`** (`components/lab/quiz-block.tsx`):
   - Multiple choice, reveal answer, score tracking
   - Animation reveal (Framer Motion)
   - Callback `onScore(score)` → sync progress

4. **`<FlashcardSM2>`** (`components/lab/flashcard-sm2.tsx`):
   - Port SRS algorithm từ `labs/_shared/` (nếu có) sang `lib/sm2.ts`
   - Flip animation (Framer Motion `rotateY`)
   - Rating buttons: Again/Hard/Good/Easy → update next review

5. **`<CodeBlock>`** (`components/lab/code-block.tsx`):
   - Shiki highlight, copy button, language badge

6. **`<MermaidDiagram>`** (`components/lab/mermaid-diagram.tsx`):
   - Lazy-load `mermaid`, render client-side, error boundary

7. **`<ProgressBar>`** + `useProgress(labSlug)` hook (`lib/hooks/use-progress.ts`):
   - React Query: GET `/api/progress` (cached), POST mutation
   - Optimistic update

## Files tạo mới

- `app/src/lib/schema-lab.ts`, `lib/sm2.ts`, `lib/hooks/use-progress.ts`
- `app/src/components/lab/*.tsx`

## Files tham khảo (không đụng)

- `labs/_shared/lab-template.js` (868 LOC — reverse reference)
- `labs/_shared/progress-sync.js`
- `server/routes/progress.ts`

## Success criteria

- Zod parse 1 lab fixture JSON không lỗi
- Storybook-less smoke: route `/dev/playground` render đủ Lab/Quiz/Flashcard/Code/Mermaid
- Flashcard flip animation 60fps
- Quiz score POST đúng vào Hono `/api/progress`

## Risks

- Schema v3 có edge case chưa đoán được → chuẩn bị `.passthrough()` tạm, refine sau khi import content
- Shiki bundle size lớn → lazy load, chỉ load ngôn ngữ cần (bash, yaml, js, ts, go)
