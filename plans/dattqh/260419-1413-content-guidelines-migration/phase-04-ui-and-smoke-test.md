# Phase 04 — UI Fix + Smoke Test

**Status:** completed | **Priority:** P1 | **Effort:** 30–60 phút | **Depends on:** Phase 01–03

## Files

- `labs/_shared/index-sections-stats.js:82` — `<h2>Tiến độ của bạn</h2>`

## Steps

1. **Fix UI string** — L82 `Tiến độ của bạn` → `Tiến độ học`.
2. **Grep toàn repo** (scope guidelines):
   ```bash
   grep -rnE '\b(bạn|tôi|chúng ta|mình|các bạn)\b' README.md docs/ labs/ --include='*.html' --include='*.md' --include='*.js' --include='*.css'
   grep -rnEi 'magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất' README.md docs/ labs/
   ```
   → Cả hai phải 0 match (trừ match trong `labs/_shared/` là CSS class hoặc code variable, và trong chính `docs/content-guidelines.md` liệt kê cụm cấm).
3. **Smoke test**:
   - `npm run dev` → không lỗi startup.
   - Mở `http://localhost:3000/` → dashboard render OK.
   - Mở 9 lab trong module 01-networking → mỗi lab: hero render OK, 4 chân kiềng callouts hiển thị đủ, quiz click OK, flashcard flip OK, console không error.
   - Check `## References` block cuối mỗi lab Phase 02 hiển thị đúng.
4. **Spot-check link** — mở 5 random RFC link → trỏ đúng section.

## Acceptance

- 2 grep command ở step 2 → 0 match nội dung (match trong guideline file `content-guidelines.md` là expected, ignore)
- Dev server start clean
- 9 lab networking render clean, console không error
- 5 RFC link spot-check load đúng

## Ghi chú

- Nếu grep còn match ở file thuộc out-of-scope (module 02–08 lab chưa refactor schema v2, plans/, server/, node_modules/) → skip, không fix ở phase này.
