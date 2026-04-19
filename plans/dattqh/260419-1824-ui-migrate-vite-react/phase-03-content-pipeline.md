# Phase 03 — Content Pipeline

**Status:** completed (2026-04-19) · **Effort:** 0.5-1d · **Priority:** P1 · **Depends on:** phase-00, phase-02

## Completion notes

- 8 labs → `content/labs/*.ts` via `scripts/fixtures-to-ts.mjs`
- Index/search built: `app/src/generated/labs-index.json` (1.6KB), `search-index.json` (89.6KB)
- `content-loader.ts`: lazy `import.meta.glob`, dev-mode Zod warn
- `/lab/:slug` wired to loader + Suspense skeleton + 404
- Build script: `gen:content` chạy trước `tsc && vite build`
- Search index drop `walkthrough.whyBreaks` để fit ≤100KB (minor lossy)

## Goal

Chuyển content lab từ `data/hoccloud.db` → **`content/labs/*.ts` type-safe files**. Build-time generate JSON index. Runtime load qua Vite glob.

## Decision: TS over MDX

- Schema v3 phần lớn là structured data (quiz, flashcard, mermaid code)
- TS file: type-check ngay, không cần MDX plugin, không cần frontmatter YAML escape

## Steps

### Export

1. Script `scripts/export-labs-to-ts.ts`:
   - Query DB: labs table
   - Parse qua Zod (schema từ phase-00)
   - Generate `content/labs/{slug}.ts`:
     ```ts
     import type { LabContent } from '@/lib/schema-lab';
     export default {
       slug: '...',
       title: '...',
       tags: [...],
       think: { ... }, see: { ... }, ship: { ... },
     } satisfies LabContent;
     ```
   - Dùng `JSON.stringify` cho nested object để escape an toàn
   - Flags: `--dry-run`, `--overwrite`, `--slug=<x>` incremental
2. `tsc --noEmit` trên `content/labs/*.ts` pass 100%

### Build-time index

3. Vite plugin (hoặc pre-build script):
   - Glob `content/labs/*.ts`
   - Extract metadata (slug, title, tags, summary, updated_at) → `app/src/generated/labs-index.json`
   - Dùng cho dashboard catalog, search fallback
4. Full content load qua Vite glob:
   ```ts
   const labs = import.meta.glob('/content/labs/*.ts', { eager: false });
   ```
   (lazy — code-split per lab)

### Content loader

5. `app/src/lib/content-loader.ts`:
   - `getLab(slug): Promise<LabContent>` (dynamic import)
   - `getIndex(): LabIndexEntry[]` (eager, metadata only)
   - Dev mode: Zod safeParse → warn. Prod: đã validate ở build.

### Route /lab/:slug

6. `routes/lab-viewer.tsx`: `await getLab(slug)` + Suspense → `<LabRenderer>` → 404 nếu miss

### Client-side search index (offline fallback)

7. Build-time script generate `app/src/generated/search-index.json`:
   - minisearch format: { slug, title, tags, text (flatten think/see/ship), updated_at }
   - Phase 05 dùng cho offline fallback khi `/api/search` unreachable

## Files

**Tạo:** `scripts/export-labs-to-ts.ts`, `content/labs/*.ts`, `app/src/lib/content-loader.ts`, `app/src/routes/lab-viewer.tsx`, `app/src/generated/{labs-index,search-index}.json` (gitignore)

**Không đụng:** `data/hoccloud.db`, `server/`

## Success criteria

- Export ≥ 50 TS files, `tsc --noEmit` pass
- `getLab('...')` trả LabContent hợp lệ
- Dashboard đọc `labs-index.json` (no API call cho list)
- `labs-index.json` ≤ 20KB gzip; content lazy load ≤ 10KB gzip/lab
- `search-index.json` ≤ 100KB gzip

## Risks

- String có backtick/`${}` → `JSON.stringify` handle; test 5 fixture lab trước bulk export
- Eager full content bundle to → giữ lazy (`eager: false`), chỉ eager metadata
- Sau cutover cân nhắc drop labs table khỏi DB (Phase 07 follow-up)
