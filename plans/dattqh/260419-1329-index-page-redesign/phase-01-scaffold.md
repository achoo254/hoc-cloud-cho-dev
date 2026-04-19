# Phase 01 — Scaffold Modular CSS/JS

**Priority:** P0 · **Status:** completed · **Effort:** 2h

## Goal
Chuyển inline `<style>` + `<script type="module">` trong `index.html` sang file `_shared/index-page.css` + `_shared/index-sections.js`. Zero functional change.

## Files

- **MODIFY:** `labs/index.html`
- **CREATE:** `labs/_shared/index-page.css`
- **CREATE:** `labs/_shared/index-sections.js`
- **CREATE:** `labs/_shared/index-stats.js` (empty skeleton, export computeUserStats)

## Steps

1. Copy nội dung `<style>` (dòng 8-90) trong `index.html` → `index-page.css`. Thêm comment section markers: `/* ===== Existing hero/phase/card ===== */`.
2. Tách script module:
   - `index.html` giữ: CATALOG data + DOM mount + `import { bootIndex } from './_shared/index-sections.js'; bootIndex(CATALOG);`
   - `index-sections.js` export: `bootIndex(catalog)` chứa logic render phase-group + due-banner + card menu (từ hiện tại).
   - Helpers `escapeHtml`, `formatRelTime`, `wireCardMenu` nội bộ module.
3. `index-stats.js` export stub: `export function computeUserStats() { return { labsDone: 0, cardsMastered: 0, quizAvg: 0, totalMin: 0, heatmap: [] }; }` — phase 03 implement thật.
4. Thêm `<link rel="stylesheet" href="_shared/index-page.css">` vào `<head>`.
5. Verify: `npm start` → mở `/`, catalog render giống hệt, due-banner + bookmark + card menu đều work.

## Acceptance

- `index.html` ≤ 200 dòng (target ≤150 sau phase 6).
- Không đổi UI/behavior.
- No console errors.
- Lint pass (nếu có eslint config).
