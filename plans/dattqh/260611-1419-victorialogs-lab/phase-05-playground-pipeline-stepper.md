---
phase: 5
title: Playground Pipeline Stepper
status: completed
priority: P3
effort: ''
dependencies:
  - 1
---

# Phase 5: Playground Pipeline Stepper (Mode 3)

## Overview
Mode 3 — **pipeline stepper "Dựng stack"**: đi từng bước dựng VictoriaLogs trên VPS (① binary → ② systemd → ③ rsyslog forward → ④ gửi log → ⑤ query LogsQL). Mỗi bước: 1 hình/state + lệnh + "kỳ vọng thấy gì". Ít chữ, click tiến/lùi.

## Requirements
- Functional: stepper 5 bước, highlight bước hiện tại; mỗi bước hiện command + expected output (lấy từ output thật Phase 2); progress visual.
- Non-functional: lệnh khớp Phase 2 (đã verify trên VPS thật); file <200 dòng; reduced-motion safe.

## Architecture
- `vlogs-pipeline-stepper.tsx`: data 5 bước (array `{ n, title, command, expect, note? }`) — nguồn từ Phase 2 captured-outputs.
- State `activeStep`; nav prev/next + click stepper dot. Command render qua `CodeBlock` (component lab có sẵn). Expected output render gọn (`<pre>` thu nhỏ).
- DRY: nếu data trùng `try_at_home` (Phase 6) → cân nhắc share 1 nguồn data, nhưng stepper là tóm tắt trực quan (ít chữ), try_at_home là bản đầy đủ — chấp nhận tách, miễn lệnh nhất quán.

## Related Code Files
- Modify (fill stub): `app/src/components/lab/diagrams/vlogs-pipeline-stepper.tsx`
- Read: `app/src/components/lab/code-block.tsx`; Phase 2 `captured-outputs/`

## Implementation Steps
1. Lấy 5 bước + command + expected từ Phase 2 (đã chạy thật).
2. Dựng stepper UI (dot + active highlight), nav prev/next.
3. Mỗi bước: title + CodeBlock(command) + expected output gọn + note (cite docs nếu có flag lạ).
4. Reduced-motion: tắt transition.
5. Typecheck + kiểm tra trong shell.

## Success Criteria
- [ ] 5 bước hiển thị đúng thứ tự, nav tiến/lùi + click dot.
- [ ] Command khớp Phase 2 (chạy được thật).
- [ ] Expected output là output thật, không bịa.
- [ ] File <200 dòng; typecheck pass.

## Risk Assessment
- **Lệnh lệch giữa stepper và try_at_home** → cùng nguồn Phase 2; review chéo ở Phase 8.
- **Phụ thuộc Phase 2**: nếu Phase 2 chưa có output → stepper dùng placeholder tạm + đánh dấu TODO, hoàn thiện sau khi Phase 2 xong (không chốt nội dung trước khi có output thật).
