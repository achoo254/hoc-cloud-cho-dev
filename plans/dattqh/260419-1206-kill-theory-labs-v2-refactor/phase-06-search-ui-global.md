---
phase: 06
title: Global Search UI + API
status: pending
effort: 1d
depends_on: [02]
---

## Goal

Thêm search box ở **header mọi lab** + dashboard. Query tới `/api/search?q=` dùng FTS5 (bảng `labs_fts` từ phase 02). Trả kết quả dạng dropdown với highlight keyword.

## Files to ADD

### `server/api/search-routes.js`

```js
// Pseudo
export const searchRoutes = new Hono()
  .get('/api/search', async (c) => {
    const q = c.req.query('q')?.trim();
    if (!q || q.length < 2) return c.json({ results: [] });

    // Sanitize FTS5 query: escape double-quote, wrap in phrase
    const ftsQ = q.replace(/"/g, '""');
    const rows = db.prepare(`
      SELECT l.slug, l.module, l.title,
             snippet(labs_fts, -1, '<mark>', '</mark>', '...', 24) AS preview,
             bm25(labs_fts) AS rank
      FROM labs_fts
      JOIN labs l ON l.id = labs_fts.rowid
      WHERE labs_fts MATCH ?
      ORDER BY rank LIMIT 10
    `).all(`"${ftsQ}"*`);

    return c.json({ results: rows });
  });
```

Mount trong `server.js`: `app.route('/', searchRoutes)` (trước static catchall).

### `labs/_shared/search-widget.js`

Global search component:
- Inject search box vào header của mọi lab + dashboard (append to `<body>` nếu thiếu container)
- Debounce 200ms khi user gõ
- Fetch `/api/search?q=<input>` → render dropdown results
- Click result → navigate tới `/labs/<module>/<file>.html` (cần map slug → file path, có thể query DB hoặc lưu map trong JSON nhỏ generated lúc sync)
- Keyboard: `/` focus search, Esc đóng dropdown, arrow nav, Enter chọn

### `labs/_shared/search-widget.css`

Style: dropdown dark theme, highlight `<mark>` yellow, keyboard focus ring.

## Files to MODIFY

### `labs/_shared/lab-template.js`
Auto-inject `<script src="../_shared/search-widget.js">` và `<link rel="stylesheet" href="../_shared/search-widget.css">` khi khởi tạo template.

Hoặc: mỗi lab tự add `<script src="../_shared/search-widget.js">` trong `<head>` (KISS hơn). → **Đề xuất**: tự add, không inject magic.

### `labs/index.html`
Thêm search box to ở top dashboard (duplicate với header? — check UX). Hoặc chỉ dựa vào widget global.

### `server/scripts/sync-labs-to-db.js`
Sync thêm `file_path` vào bảng `labs` để search widget biết navigate đâu (đã có trong schema phase 02).

## Steps

1. Tạo `server/api/search-routes.js` + mount trong `server.js`
2. Test API bằng curl: `curl "http://localhost:8387/api/search?q=dns"` → JSON results
3. Test edge case: empty query, special char, Vietnamese diacritics (`unicode61 remove_diacritics 2` đã xử lý ở FTS5)
4. Tạo `labs/_shared/search-widget.js` + `search-widget.css`
5. Include widget vào 1 lab test → verify UI
6. Thêm `<script>` include vào 8 lab networking (có thể 1 sed/replace)
7. Thêm vào `labs/index.html` dashboard
8. UX check: `/` focus shortcut, Esc đóng, arrow nav
9. Performance: kiểm tra với 50 lab giả lập, query <20ms

## Acceptance Criteria

- [ ] `curl /api/search?q=dns` trả JSON ≥1 result, có preview highlight
- [ ] Mở lab bất kỳ → thấy search box ở header
- [ ] Gõ "subnet" → dropdown hiện lab 02-subnet-cidr
- [ ] Click result → navigate đúng file
- [ ] Phím `/` focus search, `Esc` đóng
- [ ] Search "dns cache" (2 từ) → vẫn trả lab DNS
- [ ] Search tiếng Việt (có dấu) → FTS5 match (diacritics removed)
- [ ] Empty/1-char query → không fetch (debounce + min length)

## Risks

| Risk | Mitigation |
|------|------------|
| FTS5 query injection | Escape `"` trong input, wrap phrase `"x"*` — không eval SQL |
| Global widget conflict với CSS riêng của lab | Prefix CSS class (`.hcl-search-*`), scope strict |
| Search chậm khi DB to | FTS5 native rất nhanh, không lo tới 1000+ lab |
| Nhiều tab mở → nhiều request khi gõ | Debounce 200ms + AbortController khi gõ tiếp |

## Out-of-scope

- Search across labs + external docs (chỉ labs hiện có)
- Filter by module (nếu cần sau)
- Search history (YAGNI)
