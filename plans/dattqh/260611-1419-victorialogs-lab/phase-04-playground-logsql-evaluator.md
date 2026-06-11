---
phase: 4
title: Playground LogsQL Evaluator
status: completed
priority: P2
effort: ''
dependencies:
  - 1
---

# Phase 4: Playground LogsQL Evaluator (Mode 2)

## Overview
Mode 2 — **mini-evaluator LogsQL**: parser + filter client-side chạy thật trên mock dataset, edit query thấy kết quả đổi. Hỗ trợ **tập con LogsQL** (không phải engine đầy đủ). Đây là phần rủi ro correctness cao nhất — phải khớp ngữ nghĩa LogsQL thật.

## Requirements
- Functional: ô nhập query + preset chips; parse tập con LogsQL → lọc `MOCK_LOGS` → render bảng kết quả/đếm; báo lỗi parse rõ ràng (không crash); disclaimer "tập con minh hoạ".
- Tập con hỗ trợ (chốt cứng, không phình): (1) word/phrase filter trên `_msg`; (2) `field:value` filter (vd `level:error`, `host:web1`); (3) time filter dạng hiển thị `_time:5m` (lọc theo mock timestamp tương đối); (4) stream filter `_stream:{app="nginx"}`; (5) pipe `| stats count()` (+ `by (field)`); (6) `| sort by (field)`; (7) `| limit N`. Toán tử ngoài tập con → báo "chưa hỗ trợ trong demo".
- Non-functional: parser thuần, không eval chuỗi; file <200 dòng (tách parser ra `vlogs-logsql-parser.ts` nếu cần); đối chiếu cú pháp với `docs.victoriametrics.com/victorialogs/logsql/`.

## Architecture
- `vlogs-logsql-parser.ts`: `parseLogsQL(q) → { filters[], pipes[] } | { error }`. Tokenize đơn giản theo `|`, mỗi filter token map sang predicate.
- `vlogs-logsql-playground.tsx`: input + presets + gọi parser + apply predicate trên `MOCK_LOGS` + render bảng. Preset lấy từ query thật đã chạy ở Phase 2 (để demo khớp output thật).
- Áp dụng pipe tuần tự: filter → stats/sort/limit.

## Related Code Files
- Create: `app/src/components/lab/diagrams/vlogs-logsql-parser.ts` (logic tách riêng để test được)
- Modify (fill stub): `app/src/components/lab/diagrams/vlogs-logsql-playground.tsx`
- Read: `vlogs-mock-data.ts`; output query thật từ Phase 2 (`captured-outputs/`) để chọn preset + đối chiếu.

## Implementation Steps
1. Đọc trang LogsQL docs, liệt kê chính xác cú pháp 7 nhóm tập con (ghi anchor link).
2. Viết `parseLogsQL` + predicate cho từng nhóm; lỗi → trả `{error}` có message.
3. Viết apply-pipes (`stats count by`, `sort by`, `limit`).
4. UI: input + chips preset (≥5, khớp query Phase 2) + bảng kết quả (cột `_time`,`_stream`,`level`,`_msg`) + dòng đếm.
5. Disclaimer "tập con minh hoạ — engine thật xem docs".
6. Test thủ công từng preset; so kết quả với output thật Phase 2.
7. Typecheck.

## Success Criteria
- [ ] 7 nhóm cú pháp tập con chạy đúng trên mock data.
- [ ] Preset cho kết quả **khớp** output thật đã thu ở Phase 2.
- [ ] Query sai cú pháp → message lỗi, không crash (bọc error boundary vẫn an toàn).
- [ ] Toán tử ngoài tập con → báo "chưa hỗ trợ", không hiểu nhầm.
- [ ] Parser tách file riêng; tổng file <200 dòng mỗi file; typecheck pass.

## Risk Assessment
- **Ngữ nghĩa LogsQL hiểu sai** (rủi ro chính) → đối chiếu docs từng operator (bước 1); preset đối chiếu output thật Phase 2 làm "golden test".
- **Parser phình to** → chốt cứng tập con 7 nhóm, từ chối phần còn lại tường minh.
- **Fallback:** nếu evaluator quá rủi ro lúc execution → hạ về canned (preset cố định + kết quả tĩnh), KHÔNG đổi schema/registry. Quyết định fallback report cho user, không tự ý bỏ tính năng đã chốt.
