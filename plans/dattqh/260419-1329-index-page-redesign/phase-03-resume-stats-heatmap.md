# Phase 03 — Resume Strip + Stats + Heatmap

**Priority:** P0 · **Status:** completed · **Effort:** 4h

## Goal
Thay due-banner đơn lẻ bằng 3-card resume strip. Thêm stats 4-tile + heatmap 12 tuần. Ẩn toàn bộ nếu user chưa có progress.

## Files

- **MODIFY:** `labs/_shared/index-stats.js` (implement thật)
- **MODIFY:** `labs/_shared/index-sections.js` (renderResume, renderStats, renderHeatmap)
- **MODIFY:** `labs/_shared/index-page.css`

## Data sources

- `LabTemplate.getDueCount(labId, total)` — SRS state per lab.
- `LabTemplate.getQuizScore(labId)` — quiz attempts.
- `LabTemplate.getPosition(labId)` — bookmark `{ section, snippet, pct, ts, anchor }`.
- `window.ProgressSync.fetchAll()` — server sync `{ progress: [{ lab_slug, opened_at, completed_at, quiz_score }] }`.
- localStorage key pattern cho review timestamps (đọc từ SM-2 state, field `lastReviewed`/`ts`).

## index-stats.js API

```js
export async function computeUserStats(catalog) {
  // Merge local SRS + server ProgressSync
  return {
    labsDone: Number,       // completed_at != null
    cardsMastered: Number,  // SRS interval >= 21d
    quizAvg: Number,        // mean quiz_score
    totalMin: Number,       // sum estimatedMinutes của lab đã open
    dueTotal: Number,       // total due cards hôm nay
    streak: Number,         // consecutive days có review activity
    lastBookmark: { lab, pos } | null,
    heatmap: Array<{ date: 'YYYY-MM-DD', count: Number }>, // 84 ngày
    hasData: Boolean,       // false → ẩn resume + stats + heatmap
  };
}

export function bucketHeatmapLevel(count) { /* 0..4 */ }
```

## Resume strip (3 card)

```
[📍 Tiếp tục đọc]        [🔥 Cần ôn hôm nay]     [⚡ Streak]
 "TCP/IP Layer"            23 thẻ đang due          7 ngày
 65% · 12p trước           3 lab ảnh hưởng          best: 14d
 → click: resume anchor    → click: scroll catalog  → click: stats
```

- Card 1: null → hide card. Click → navigate `{lab.href}#{pos.anchor}`.
- Card 2: `dueTotal === 0` → hide card.
- Card 3: streak === 0 → hide card.
- Nếu cả 3 hide → ẩn section.

## Stats tiles (4×1 desktop)

- Labs done (X / total)
- Cards mastered (absolute)
- Quiz avg (%)
- Total time (hr + min)

Mỗi tile: label mono small, value large bold, subline dim.

## Heatmap

- 12 tuần × 7 ngày = 84 cell SVG.
- Cell size 12px desktop, 10px tablet, scroll-x mobile.
- 5 levels màu: `--heatmap-0..4` (thêm vào `lab-template.css`).
- Tooltip on hover: `{date}: {count} reviews`.
- Legend: "ít ← → nhiều".

## Implementation steps

1. Implement `computeUserStats` merge local + server.
2. Implement `bucketHeatmapLevel` (0, 1-2, 3-5, 6-9, 10+).
3. `renderResume(mount, stats)` — conditional hide.
4. `renderStats(mount, stats)` — 4 tile grid.
5. `renderHeatmap(mount, stats)` — SVG inline.
6. `bootIndex`: nếu `!stats.hasData` → set `display:none` cho `#resume-mount`, `#stats-mount`, `#heatmap-mount`.
7. Loading state: skeleton `.skel` cho 4 tile + heatmap shell, replace khi fetch xong.

## Acceptance

- No-data user: không thấy section 2-3.
- Has-data user: resume trong viewport (no scroll ở 1024px tall).
- Heatmap render đúng 84 cell, tooltip hoạt động.
- Skeleton <200ms, không layout shift lớn (CLS <0.1).
- Mobile heatmap scroll-x snap tuần.
