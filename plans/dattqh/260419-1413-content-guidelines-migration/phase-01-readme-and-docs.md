# Phase 01 — README + docs/*.md

**Status:** completed | **Priority:** P0 | **Effort:** 1–2h

## Files

- `README.md` (5 "bạn" + "hộp đen" + "thuần code app" + "lý thuyết suông" + "không phải magic" + 2 khuyến nghị trần)
- `docs/*.md` (audit sample: thấp — chủ yếu clean, verify lại)

## Steps

1. **README.md**
   - Rewrite hero (L3–L16) bỏ "bạn", "hộp đen", "thuần code app"; giữ fact: repo là gì, ai học được, học được gì.
   - L13 "đọc lý thuyết suông" → rewrite neutral: "đọc không kèm thực hành".
   - L42 "Node.js (khuyến nghị)" → giữ "khuyến nghị" + lý do ngắn: "khuyến nghị vì có live-reload".
   - L21 "đánh số theo thứ tự nên học" → bỏ "nên", viết: "đánh số theo thứ tự học".
   - L66 "bạn đã làm đến đâu" → "tiến độ đã hoàn thành".
   - L127 `# file bạn đang đọc` → `# README`.
   - L168 "đặc biệt ở phần Try at home" giữ nguyên ý nhưng bỏ "bạn".
   - L189 "Cloud không phải magic..." → xoá hoặc rewrite: liệt kê 3 thứ thực chất (Linux + network + automation), không dùng "magic".

2. **docs/*.md**
   - Grep `\b(bạn|tôi|chúng ta|mình|các bạn)\b` và `magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất` trong `docs/`.
   - Fix từng match theo rule ngôi xưng + cụm cấm.

3. **Checklist review mục 7** cho README.md và mỗi docs file đã sửa.

## Acceptance

- `grep -rE '\b(bạn|tôi|chúng ta|mình|các bạn)\b' README.md docs/` → 0 match
- `grep -rEi 'magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất' README.md docs/` → 0 match
- README vẫn truyền tải đủ: mục đích repo, ai học được, cách chạy, cấu trúc, quy tắc học.
