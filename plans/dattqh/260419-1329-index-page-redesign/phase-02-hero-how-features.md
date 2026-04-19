# Phase 02 — Hero + How It Works + Features

**Priority:** P0 · **Status:** completed · **Effort:** 3h

## Goal
Thay hero hiện tại bằng hero 2-cột + thêm section How-it-works (4 step) + Features (4 tile).

## Files

- **MODIFY:** `labs/index.html` (thêm mount points: `#hero-mount`, `#how-mount`, `#features-mount`)
- **MODIFY:** `labs/_shared/index-page.css` (styles)
- **MODIFY:** `labs/_shared/index-sections.js` (renderers)

## Design

### Hero

```
Desktop (>1024): 2-col, text-left trái, metric-chip phải
Tablet/Mobile: stack, metric-chip dưới
```

- H1: "Học DevOps kiểu WHY-first"
- Sub: "1 lab = 1 buổi · quiz + flashcard SM-2 · offline-first"
- CTA primary: "Xem roadmap ↓" → scroll smooth to `#roadmap-mount`
- CTA secondary: "Bắt đầu ngay" → href lab đầu tiên có status=ready
- Metric chip (right): 3 số — `{labsReady} labs · {totalCards} flashcards · {npm start}` (code-block copy button giữ nguyên)

### How it works (4 step)

Flexbox row desktop, column mobile. Mỗi step:
- Number `01..04` mono, lớn, accent color
- Title 1 dòng: "Đọc WHY-first" / "Làm Quiz" / "Ôn Flashcard SM-2" / "Revisit"
- Desc 1 dòng ≤15 từ
- Arrow `→` giữa steps (desktop), hidden mobile

### Features (4 tile)

Grid: 4×1 desktop, 2×2 tablet, 1-col mobile. Mỗi tile:
- Icon emoji 24px
- Title bold
- 1 dòng desc

Features:
1. **WHY-first** — "Hiểu vì sao trước khi học cách làm"
2. **Spaced Repetition** — "SM-2 algorithm chọn thẻ cần ôn đúng lúc"
3. **Offline-first** — "localStorage sync, không mất tiến độ"
4. **Multi-device** — "Cookie UUID đồng bộ progress cross-device"

## Implementation

```js
// index-sections.js
export function renderHero(mount, catalog) { /* 2-col grid + CTA + metric */ }
export function renderHowItWorks(mount) { /* 4 step array */ }
export function renderFeatures(mount) { /* 4 tile array */ }

// In bootIndex:
renderHero(document.getElementById('hero-mount'), catalog);
renderHowItWorks(document.getElementById('how-mount'));
renderFeatures(document.getElementById('features-mount'));
```

Smooth scroll: `document.querySelector('#roadmap-mount')?.scrollIntoView({ behavior: 'smooth', block: 'start' });`

## Acceptance

- Hero 2-col >1024, stack <1024.
- CTA "Xem roadmap" scroll tới placeholder (phase-04 sẽ fill).
- CTA "Bắt đầu ngay" href lab đầu tiên ready.
- 4 step numbered, 4 feature tile đúng layout.
- Touch targets ≥44px.
- No horizontal scroll ở 360px.
