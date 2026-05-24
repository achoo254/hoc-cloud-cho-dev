# Phase 7 — Smoke Test FE + Screenshot Load Verify

**Status:** pending | **Priority:** high | **Effort:** 1h | **Depends on:** Phase 2, 6

## Context

Sau khi schema + renderer extension + content drafts đã commit và Mongo updated → cần verify end-to-end mọi thứ render đúng và không có regression.

## Test matrix

| Test | Method | Pass criteria |
|------|--------|---------------|
| Typecheck | `pnpm --dir app run typecheck` | 0 error |
| Build FE | `pnpm --dir app run build` | success, output `app/dist/` |
| Lab DHCP render | Mở `/labs/dhcp` → tab TRY IT | 6 core phase card + 3 optional collapsed |
| Screenshot load | DevTools Network tab | 17 ảnh core 200 OK, click expand optional load thêm 6 ảnh |
| Lab cũ regression | Mở `/labs/dns`, `/labs/osi`, `/labs/tcpdump` | tryAtHome render flat như cũ (no console error) |
| Mobile responsive | DevTools mobile view (iPhone 14) | Card stack vertical, ảnh full-width, no overflow |
| Build output ảnh | `ls app/dist/labs/dhcp/screenshots/` | 23 PNG (17 core + 6 optional) |
| Server API | `curl http://localhost:8387/api/labs/dhcp \| jq '.tryAtHome \| length'` | 9 (hoặc 6 nếu skip Optional) |
| Meilisearch sync | `curl http://localhost:8387/api/search?q=DHCP+practical` | Lab dhcp trong results |
| Dark mode | Toggle dark theme | Callout `analysis` + figure border đọc được |

## Manual UX verification

1. **Phase card visual**:
   - Title + badge SBS + chip VM target + chip estimated time hiển thị đúng row
   - `cmd` block syntax highlight đúng (bash)
   - Steps list ordered 1→N, mỗi step có expect italic + screenshot dưới
   - Screenshot figcaption đọc được, không truncate
2. **Analysis callout**:
   - 3 row Quan sát / Cơ chế / Bài học visual khác biệt
   - HTML trong mechanism sanitize OK (test inject `<script>` không exec)
3. **Optional accordion**:
   - Closed by default
   - Click expand smooth, không jump scroll

## Failure modes to test

| Inject | Expected behavior |
|--------|-------------------|
| `tryAtHome` không có `steps[]` | Render flat legacy view, no console error |
| `screenshot.src` 404 | `<img>` alt hiển thị, không crash render |
| `analysis` thiếu 1 field | Zod validation fail → log warn nhưng vẫn render |
| `phaseType` invalid value | Zod enum reject → fallback render |

## Bug fix loop

Nếu phát hiện bug → fix tại Phase 2 (renderer) hoặc Phase 4-5 (content) → re-run Phase 6 update script → re-test.

## Acceptance criteria

- [ ] Tất cả 10 test trên pass
- [ ] Manual UX visual verification OK
- [ ] 4 failure mode tested, behavior an toàn
- [ ] Báo cáo `reports/smoke-test-260524-1726.md` tóm tắt kết quả + screenshot lab render
