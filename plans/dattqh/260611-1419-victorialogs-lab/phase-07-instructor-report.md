---
phase: 7
title: Instructor Report
status: completed
priority: P2
effort: ''
dependencies:
  - 2
---

# Phase 7: Instructor Report

## Overview
Viết 1 file markdown báo cáo tìm hiểu VictoriaLogs để **nộp giảng viên**, tone trung lập "người tự research" (không xưng hô, không lộ AI viết), copy được. Nhúng output lệnh thật từ Phase 2 — đây là yếu tố chống AI-detection mạnh nhất + chứng minh đã làm thật.

## Requirements
- Functional: 1 file `.md` hoàn chỉnh, copy-paste nộp được; cấu trúc báo cáo tự học; có output thật.
- Non-functional: tuân content-guidelines (cấm "bạn/tôi/chúng ta"); câu dài–ngắn xen kẽ; số liệu cụ thể (port 9428, version, kích thước); citation có anchor `docs.victoriametrics.com`; KHÔNG mở bài sáo ("Trong bài viết này..."); không bullet hoá mọi thứ.

## Architecture (cấu trúc report)
1. Mục tiêu tìm hiểu (cụ thể, đo được).
2. Tổng quan kiến trúc VictoriaLogs (+ vị trí trong hệ sinh thái VictoriaMetrics — phần phụ).
3. Các thành phần (single-node vs cluster: vlinsert/vlstorage/vlselect; cổng).
4. Mô hình dữ liệu: `_msg`/`_time`/`_stream`, stream fields, column storage/compression.
5. Ingestion: syslog (đã dùng rsyslog), ES bulk, Loki, OTEL.
6. LogsQL: filter + pipe, ví dụ query (kèm output thật Phase 2).
7. Cài đặt thực tế trên VPS: các bước + output thật (đã sanitize).
8. Nhận xét & kết luận (ý kiến kèm lý do + điều kiện + nguồn, không phát biểu trống).
9. Nguồn tham khảo (đánh số, link gốc có anchor).

## Related Code Files
- Create: `plans/dattqh/260611-1419-victorialogs-lab/deliverables/victorialogs-stack-research-report-vi.md`
- Read: Phase 2 `captured-outputs/`; `docs/content-guidelines.md`

## Implementation Steps
1. Lấy output thật + số liệu đã đối chiếu docs từ Phase 2.
2. Viết theo 9 mục, văn phong người research: tránh cấu trúc liệt kê đều đặn kiểu AI, xen câu phân tích.
3. Nhúng block output thật (lệnh + kết quả) ở mục 6 & 7.
4. Citation đánh số + link anchor mục 9.
5. Tự rà checklist content-guidelines.

## Success Criteria
- [ ] File `.md` hoàn chỉnh, copy nộp được ngay.
- [ ] Có ≥1 output lệnh thật ở mục LogsQL + mục cài đặt.
- [ ] Không vi phạm ngôi xưng; mọi số liệu có nguồn anchor.
- [ ] Không mở bài/đoạn sáo rỗng dạng AI.

## Risk Assessment
- **AI-detector không đảm bảo qua** → mitigate: output thật + số liệu cụ thể + user đọc/sửa vài câu theo giọng mình (ghi rõ khuyến nghị này cho user, không cam kết "qua chắc").
- **Phụ thuộc Phase 2**: không viết mục 6/7 trước khi có output thật (tránh bịa).
- **Vị trí file**: trong plan deliverables (đúng allowed root, không tạo .md rải rác).
