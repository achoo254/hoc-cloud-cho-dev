# Phase 06 — Footer + Responsive Polish + A11y

**Priority:** P1 · **Status:** completed · **Effort:** 3h

## Goal
Thêm footer 3-cột. Polish responsive toàn trang. Pass a11y checks. Final file size audit.

## Files

- **MODIFY:** `labs/index.html` (thêm `#footer-mount`)
- **MODIFY:** `labs/_shared/index-sections.js` (renderFooter)
- **MODIFY:** `labs/_shared/index-page.css`

## Footer layout

### Desktop (>1024)

3-col grid:

```
┌────────────────┬────────────────┬────────────────┐
│ Links          │ Keyboard       │ Meta           │
│ GitHub repo    │ /    search    │ Learning Labs  │
│ Production     │ g h  home      │ v1.0.0         │
│ Docs           │ j k  nav       │ MIT License    │
│ Discord        │ r    resume    │ Built with ♥   │
└────────────────┴────────────────┴────────────────┘
```

### Tablet (640-1024)

3-col giữ nguyên, font nhỏ hơn.

### Mobile (<640)

Accordion `<details>` × 3, closed default.

## Content

### Links col

- **GitHub:** repo URL (từ `package.json` repository field hoặc hardcode placeholder).
- **Production:** `https://hoc-cloud.inetdev.io.vn`.
- **Docs:** `/docs/` (hoặc README).
- **Discord:** placeholder `#` nếu chưa có.

### Keyboard col

| Key | Action |
|-----|--------|
| `/` | Open search (có sẵn từ search-widget) |
| `g` then `h` | Go home |
| `j` / `k` | Nav prev/next lab |
| `r` | Resume last bookmark |
| `?` | Show shortcuts modal |

Lưu ý: phase-06 **chỉ hiển thị danh sách**, chưa implement `g+h`, `j/k`, `r`, `?` (out of scope).

### Meta col

- App name + version (từ `package.json`).
- License.
- "Built with ♥ by inet" (hoặc user info).
- Last deploy date (optional, build-time inject).

## Responsive polish checklist

- [ ] Test 360px viewport — no horizontal scroll trừ heatmap + roadmap scroll-x.
- [ ] Test 640px, 1024px, 1440px — layout đúng breakpoint.
- [ ] Touch targets ≥44px: CTA, chips, card, footer links.
- [ ] Line-height ≥1.5 cho body text.
- [ ] Contrast ratio ≥4.5:1 (text vs bg). Check `--text-dim` on `--bg`.
- [ ] Focus ring visible trên mọi interactive element.
- [ ] `prefers-reduced-motion`: disable smooth scroll + heatmap hover transform.

## A11y

- [ ] Heading order: H1 (hero) → H2 (mỗi section) → H3 (phase).
- [ ] Landmark: `<header>`, `<main>`, `<nav>` (toolbar), `<footer>`.
- [ ] Roadmap `<ol>` với `aria-label="Learning roadmap"`.
- [ ] Heatmap `<div role="img" aria-label="Activity last 12 weeks">`.
- [ ] Filter chips `role="radiogroup"` + `aria-checked`.
- [ ] Search input `<label>` hoặc `aria-label`.
- [ ] Skip-to-content link đầu trang.

## Final audit

1. File size:
   - `index.html` ≤ 150 dòng (target).
   - `index-page.css` ≤ 400 dòng (1 file cho toàn bộ section — nếu vượt 500, split theo section).
   - `index-sections.js` ≤ 300 dòng (nếu vượt, split `index-sections-{hero,stats,roadmap,toolbar}.js`).
   - `index-stats.js` ≤ 150 dòng.
2. Lighthouse mobile:
   - Performance ≥90
   - Accessibility ≥95
   - Best Practices ≥90
3. Manual test flow:
   - No-progress user: hero + how + features + roadmap + catalog + footer. Resume/stats ẩn.
   - Mid-progress user: resume + stats visible. Bookmark click → resume anchor đúng.
   - All-done user: streak hiển thị, heatmap dày.
4. Cross-browser: Chrome, Firefox, Edge, Safari iOS.

## Acceptance

- Footer render 3-col desktop, accordion mobile.
- Lighthouse mobile pass thresholds.
- Zero a11y axe violations.
- `index.html` ≤ 150 dòng.
- No console warnings.
- Docs impact: update `docs/codebase-summary.md` ghi chú cấu trúc `labs/_shared/index-*`.
