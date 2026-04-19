# Phase 05 — Catalog Toolbar

**Priority:** P2 · **Status:** completed · **Effort:** 2h

## Goal
Thêm toolbar phía trên catalog: search inline, filter chips, sort. Giữ render logic phase-group hiện tại.

## Files

- **MODIFY:** `labs/index.html` (thêm `#catalog-toolbar-mount` trước `#phases-mount`)
- **MODIFY:** `labs/_shared/index-sections.js` (renderCatalogToolbar, applyFilter)
- **MODIFY:** `labs/_shared/index-page.css`

## Toolbar UI

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Tìm lab…      ]  [All][In Progress][Done][New][Todo]    │
│                                           [Sort: Default ▾] │
└─────────────────────────────────────────────────────────────┘
```

### Desktop

Flex row: search 40% + chips auto + sort right-aligned.

### Mobile

Stack: search full width, chips scroll-x, sort full width.

## Behavior

### Search

- Input với debounce 150ms.
- Filter `lab.title` + `lab.id` (case-insensitive).
- Empty → hiện tất cả.
- Không tích hợp với `search-widget.js` (widget đó là full-text content search, scope khác).

### Filter chips

- `All` (default active)
- `In Progress` (status=ready AND (new<total OR due>0) AND !done)
- `Done` (status=ready AND new=0 AND due=0 AND quiz exists)
- `New` (status=ready AND new=total)
- `Todo` (status=todo)

Multi-select OFF (single chip at a time). Click same chip → back to All.

### Sort

- Default (order in CATALOG)
- A-Z (by title)
- Progress desc (% complete)

## Implementation

```js
export function renderCatalogToolbar(mount, onStateChange) {
  // Render search + chips + sort select
  // onStateChange({ query, filter, sort }) called on any change
}

// bootIndex:
const toolbarState = { query: '', filter: 'all', sort: 'default' };
renderCatalogToolbar(document.getElementById('catalog-toolbar-mount'), state => {
  Object.assign(toolbarState, state);
  rerenderPhases(catalog, toolbarState);
});
```

`rerenderPhases` áp filter trước khi render phase-group. Nếu sau filter, group có 0 lab → ẩn group.

State persist vào `sessionStorage` (key `labs-toolbar-state`) — reset khi đóng tab.

## Empty state

Nếu filter/search cho 0 kết quả: show message "Không tìm thấy lab phù hợp. [Clear filter]".

## Acceptance

- Search debounce, không lag.
- Chip active có accent border.
- Sort thay đổi ngay.
- Phase group ẩn nếu 0 lab.
- State persist qua scroll, reset qua tab close.
- Touch targets ≥44px, chip spacing ≥8px.
