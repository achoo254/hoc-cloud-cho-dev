# Phase 02 — Index Dashboard-First

**Status:** pending | **Effort:** 2h | **Priority:** P1

**Status:** completed

## Goal

`labs/index.html` mở ra = thấy ngay "DUE TODAY" (block lớn nhất) + "Resume lab dang dở", không còn hero pitch / how-it-works / features cards.

## Files to modify

- `labs/index.html` (xoá mount points hero/how/features, thêm due-mount, đổi thứ tự)
- `labs/_shared/index-sections.js` (bỏ render hero/how/features, thêm renderDueToday)
- `labs/_shared/index-sections-hero.js` (xoá hoặc trống — KHÔNG export hero/how/features nữa)
- `labs/_shared/index-sections-stats.js` (giữ renderResume — có sẵn rồi)
- `labs/_shared/index-page.css` (style cho .due-today block)

## Files to create

- `labs/_shared/index-sections-due.js` (renderDueToday)

## Steps

### 1. Xoá mount points trong `labs/index.html`

Bỏ:
- `<section id="hero-mount">`
- `<section id="how-mount">`
- `<section id="features-mount">`

Thêm trước `roadmap-mount`:
- `<section id="due-mount" class="due-section"></section>`

Giữ vị trí: `resume-mount`, `roadmap-mount`, `stats-mount`, `heatmap-mount`, `catalog-toolbar-mount`, `phases-mount`, `footer-mount`.

Thứ tự mới (top→bottom):
```
toolbar (search/theme) → due-mount → resume-mount → roadmap-mount
→ catalog-toolbar-mount → phases-mount → stats-mount → heatmap-mount → footer-mount
```

### 2. Tạo `labs/_shared/index-sections-due.js`

API: `renderDueToday(mount, catalog, stats)`

Logic:
- Loop catalog → cộng `LabTemplate.getDueCount(lab.id, lab.cards)` cho status='ready'
- Tổng `due` + tổng `new` across all labs
- Render block lớn (CTA size):
  ```html
  <div class="due-today-card">
    <div class="due-num">{totalDue}</div>
    <div class="due-label">thẻ cần ôn hôm nay</div>
    <div class="due-meta">{labsWithDue} lab · {totalNew} thẻ mới</div>
    <a class="due-cta" href="{firstLabWithDue.href}">Ôn ngay →</a>
  </div>
  ```
- Empty state: nếu `totalDue === 0 && totalNew === 0` → render text "Chưa có thẻ. Mở lab bất kỳ để tạo flashcard."
- Nếu `totalDue === 0 && totalNew > 0` → "Hết thẻ due. {totalNew} thẻ mới sẵn sàng."

### 3. Update `labs/_shared/index-sections.js`

Thay đổi imports + bootIndex:
```js
// Bỏ:
import { renderHero, renderHowItWorks, renderFeatures } from './index-sections-hero.js';
// Thêm:
import { renderDueToday } from './index-sections-due.js';

// Trong bootIndex(): bỏ 3 dòng renderHero/HowItWorks/Features
// Thêm trước renderRoadmap:
renderDueToday(document.getElementById('due-mount'), catalog, null);

// Sau khi compute stats:
renderDueToday(document.getElementById('due-mount'), catalog, stats);
```

### 4. Xoá content `labs/_shared/index-sections-hero.js`

Option A: xoá file luôn (preferred — KISS).
Option B: giữ file nhưng comment "deprecated".

→ Chọn A. `git rm labs/_shared/index-sections-hero.js`.

### 5. Style trong `labs/_shared/index-page.css`

Thêm cuối file:
```css
.due-section { margin: 24px 0; }
.due-today-card {
  background: var(--bg-elevated);
  border: 2px solid var(--accent);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
}
.due-today-card .due-num { font-size: 64px; font-weight: 700; color: var(--accent); line-height: 1; }
.due-today-card .due-label { font-size: 18px; color: var(--text); margin-top: 8px; }
.due-today-card .due-meta { font-size: 13px; color: var(--text-dim); margin-top: 4px; }
.due-today-card .due-cta {
  display: inline-block; margin-top: 20px; padding: 12px 32px;
  background: var(--accent); color: var(--bg); border-radius: 6px;
  font-weight: 600; text-decoration: none;
}
.due-today-card.empty { border-color: var(--border); }
.due-today-card.empty .due-num { color: var(--text-dim); }
```

### 6. Resume block

Đã có `renderResume` trong `index-sections-stats.js` → chỉ cần đảm bảo `resume-mount` được render KHÔNG bị `hidden=true` khi không có data, mà render empty state nhỏ "Chưa có lab nào dang dở."

Check `index-sections-stats.js` `renderResume()`:
- Nếu hiện tại return early khi không có position data → sửa render text empty.

## Acceptance

- [ ] `labs/index.html` không còn `hero-mount`, `how-mount`, `features-mount`
- [ ] `labs/_shared/index-sections-hero.js` không tồn tại
- [ ] Mở `http://localhost:3000` → block "DUE TODAY" hiển thị above the fold (1080p)
- [ ] Click "Ôn ngay" → mở lab có due cards
- [ ] DevTools console không error
- [ ] `grep -c "renderHero\|renderHowItWorks\|renderFeatures" labs/_shared/*.js` = 0
