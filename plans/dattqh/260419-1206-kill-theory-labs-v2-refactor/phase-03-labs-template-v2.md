---
phase: 03
title: Labs Template v2 — Warn Rules + Callout Rendering
status: pending
effort: 1d
depends_on: [02]
---

## Goal

Cập nhật `lab-template.js` + `lab-template.css` để hỗ trợ 4 chân kiềng Deploy-Ready (WHY + WHEN-IT-BREAKS + SEE-IT-ON-VPS + DEPLOY-READY). Warn console nếu thiếu trường bắt buộc. Render 3 callout type mới.

## Schema v2 (reference từ `plans/dattqh/260419-1048-why-schema-v2/schema-v2-design.md`)

Trường bắt buộc ở mỗi row:

| Block | why | whyBreaks | observeWith | deploymentUse |
|-------|-----|-----------|-------------|---------------|
| TL;DR | ✅ | ✅ | - | ✅ |
| Walkthrough | ✅ | ✅ | ✅ | ⭕ optional |
| tryAtHome | ⭕ | - | ✅ | - |
| flashcards | ✅ | - | - | - |
| quiz (whyCorrect/whyOthersWrong) | ✅ | - | - | - |

Trường optional: `misconceptions`, `dependsOn`, `enables`, `estimatedMinutes`, `prerequisites`, `cloudEquivalent`, `vpsExercise`.

## Files to MODIFY

### `labs/_shared/lab-template.js`

Thêm function `validateLabData(data)`:

```js
// Pseudo — implement trong file thật
function validateLabData(data) {
  if (window.SKIP_WHY_WARN) return;
  const warn = (msg) => console.warn(`[lab] ${msg}`);

  (data.tldr || []).forEach((row, i) => {
    if (!row.why) warn(`tldr[${i}] missing 'why'`);
    if (!row.whyBreaks) warn(`tldr[${i}] missing 'whyBreaks'`);
    if (!row.deploymentUse) warn(`tldr[${i}] missing 'deploymentUse'`);
  });

  (data.walkthrough || []).forEach((step, i) => {
    if (!step.why) warn(`walkthrough[${i}] missing 'why'`);
    if (!step.whyBreaks) warn(`walkthrough[${i}] missing 'whyBreaks'`);
    if (!step.observeWith) warn(`walkthrough[${i}] missing 'observeWith'`);
  });

  (data.tryAtHome || []).forEach((item, i) => {
    if (!item.observeWith) warn(`tryAtHome[${i}] missing 'observeWith'`);
  });

  (data.quiz || []).forEach((q, i) => {
    if (!q.whyCorrect) warn(`quiz[${i}] missing 'whyCorrect'`);
    if (!q.whyOthersWrong) warn(`quiz[${i}] missing 'whyOthersWrong'`);
  });

  (data.flashcards || []).forEach((c, i) => {
    if (!c.why) warn(`flashcards[${i}] missing 'why'`);
  });
}
```

Thêm render logic cho 3 callout mới:
- `whyBreaks` → callout đỏ nhạt `⚠️ Khi hỏng`
- `observeWith` → callout xanh `👁️ Quan sát` (ngay dưới code block)
- `deploymentUse` → callout tím `🚀 Khi deploy thật`

Mở rộng toggle "💡 Ẩn WHY" thành **3 nút độc lập**:
- `💡 WHY` (giữ nguyên hành vi hiện tại)
- `⚠️ BREAKS` (toggle `whyBreaks`)
- `👁️ OBSERVE` (toggle `observeWith`)
- `🚀 DEPLOY` (toggle `deploymentUse`)

State persist localStorage: `lab:toggle:why`, `lab:toggle:breaks`, `lab:toggle:observe`, `lab:toggle:deploy`.

Render `misconceptions` (optional) ở đầu lab dạng numbered list với background vàng nhạt — "📚 Đọc trước khi học".

Render `dependsOn`/`enables` (optional) ở hero dạng 2 badge nhỏ — "← cần biết: X" / "→ dùng cho: Y".

### `labs/_shared/lab-template.css`

Thêm CSS class:

```css
.callout-breaks { --callout-color: #f87171; --callout-bg: #2a1717; }
.callout-observe { --callout-color: #60a5fa; --callout-bg: #14202f; }
.callout-deploy { --callout-color: #a78bfa; --callout-bg: #1e1a2e; }
.callout {
  border-left: 3px solid var(--callout-color);
  background: var(--callout-bg);
  padding: 10px 14px; border-radius: 4px; margin: 10px 0;
  font-size: 13px; color: var(--text);
}
.callout-icon { margin-right: 6px; }

.misconceptions-block { background: #2d2819; border-left: 3px solid #fbbf24; /* ... */ }
.dep-badge { display: inline-block; padding: 2px 8px; border-radius: 10px;
             background: var(--bg-input); font-size: 11px; margin-right: 4px; }

.why-toggle-group { display: flex; gap: 4px; }
.why-toggle-btn { padding: 4px 10px; font-size: 11px; /* ... */ }
.why-toggle-btn.hidden-state { opacity: 0.4; }
```

Thêm class utility `hide-whyBreaks`, `hide-observeWith`, `hide-deploymentUse` (apply trên body, CSS hide tương ứng).

## Steps

1. Mở `labs/_shared/lab-template.js`, thêm `validateLabData()` — gọi sau khi parse `lab-data`
2. Refactor render logic: extract `renderCallout(type, content)` helper
3. Thêm render block cho `whyBreaks` / `observeWith` / `deploymentUse` ở mỗi position (TL;DR row, walkthrough step, tryAtHome)
4. Thêm render `misconceptions` block ở đầu lab (sau hero, trước TL;DR)
5. Thêm render `dependsOn`/`enables` badge ở hero
6. Implement toggle group 4 nút (WHY/BREAKS/OBSERVE/DEPLOY), state persist localStorage
7. Cập nhật `lab-template.css` thêm 3 callout class + misconceptions + dep-badge + toggle styles
8. Test với 1 lab hiện tại (chưa có field mới) → phải thấy warn console cho từng row thiếu
9. Test với lab DNS refactored (phase 04) → warn sạch

## Acceptance Criteria

- [ ] Mở `labs/01-networking/01-tcp-ip-packet-journey.html` (chưa refactor) → console warn đầy đủ từng field thiếu
- [ ] 4 nút toggle ở góc lab hoạt động, state persist qua reload
- [ ] Ẩn BREAKS → callout đỏ biến mất, các phần khác giữ nguyên
- [ ] Callout render đúng màu (đỏ/xanh/tím) + icon (⚠️/👁️/🚀)
- [ ] `window.SKIP_WHY_WARN = true` → không còn warn
- [ ] Dev mode: sửa lab-template.js → SSE reload → browser refresh tự động

## Risks

| Risk | Mitigation |
|------|------------|
| Lab cũ thiếu field → console warn quá nhiều, spam | OK — chính là goal: buộc refactor. Thêm flag skip cho dev mode tạm. |
| Toggle state xung đột với toggle cũ | Rename state cũ `lab:hideWhy` → migrate sang `lab:toggle:why` khi load |
| CSS dark mode break với màu callout mới | Check trên browser, chỉnh biến `--callout-bg` contrast đủ |

## Out-of-scope

- Actual refactor lab content (phase 04-05)
- Search widget (phase 06)
- Progress client sync (phase 07)
