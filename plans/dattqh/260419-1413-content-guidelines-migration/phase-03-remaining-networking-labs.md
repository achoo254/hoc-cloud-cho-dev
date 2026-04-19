# Phase 03 — Networking Labs Còn Lại

**Status:** completed | **Priority:** P1 | **Effort:** 2–3h | **Depends on:** Phase 02 (reuse pattern)

## Files

5 lab networking còn lại trong `labs/01-networking/` (trừ 4 lab đã xử lý ở Phase 02):
- `05-arp.html` (2 "bạn" + 1 "mình" đã xác nhận trong audit)
- 4 lab khác trong module 01 — grep để xác định chính xác.

## Pre-step

```bash
cd labs/01-networking
for f in *.html; do
  echo "=== $f ==="
  grep -nE '\b(bạn|tôi|chúng ta|mình|các bạn)\b|magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất' "$f" || echo "clean"
done
```

Bỏ qua file đã xử lý ở Phase 02. Với mỗi file còn lại: áp dụng cùng pattern Phase 02.

## Steps

1. Grep toàn bộ `labs/01-networking/*.html` trừ 4 file Phase 02
2. Với mỗi file còn vi phạm:
   - Fix ngôi xưng
   - Fix cụm cấm
   - Add source link cho RFC/số liệu chưa cite
   - Checklist mục 7
3. File đã clean (theo grep) → vẫn đọc qua hero + whyBreaks + deploymentUse để verify thủ công.

## Acceptance

- `grep -rE '\b(bạn|tôi|chúng ta|mình|các bạn)\b' labs/01-networking/` → 0 match
- `grep -rEi 'magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất' labs/01-networking/` → 0 match
- 9 lab networking render OK, console clean
