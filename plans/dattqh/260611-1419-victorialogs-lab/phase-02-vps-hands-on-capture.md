---
phase: 2
title: VPS Hands-on Capture
status: completed
priority: P1
effort: ''
dependencies: []
---

# Phase 2: VPS Hands-on Capture

## Overview
Cài VictoriaLogs + rsyslog thật trên VPS Linux, gửi log thật, query bằng LogsQL, **thu output thật** (text/log) để nhúng vào nội dung lab (Phase 6) + report (Phase 7). Output thật là phòng vệ mạnh nhất chống "lộ AI viết" và đảm bảo command chạy được, không phải lý thuyết.

## Requirements
- Functional: stack chạy được; log từ rsyslog xuất hiện trong VictoriaLogs; truy vấn LogsQL trả kết quả; có Grafana datasource (optional); có nửa metrics (vmagent→vmsingle, optional).
- Non-functional: mọi port/flag/version đối chiếu `docs.victoriametrics.com` (không dựa trí nhớ); output lưu lại nguyên văn (kèm sanitize IP/hostname nhạy cảm).

## ⚠️ Prerequisite (BLOCKER)
AI Agent cần **SSH access tới VPS Linux**. Nếu không có lúc execution → BLOCKED, escalate xin credential. Fallback (nếu user đồng ý): Docker local sinh output thực — nhưng user đã chọn "VPS / bài thật", nên ưu tiên VPS.

## Architecture (stack dựng thật)
```
journald/app ─▶ rsyslog (omfwd) ─▶ VictoriaLogs syslog listener ─▶ vlstorage
                                          (:9428 HTTP, syslog port riêng)
query: curl /select/logsql/query  +  vmui (/select/vmui)  +  Grafana datasource
(optional) node_exporter ─▶ vmagent ─▶ vmsingle (:8428) ─▶ MetricsQL
```

## Related Code Files
- Create: `plans/dattqh/260611-1419-victorialogs-lab/deliverables/captured-outputs/` — lưu output thật (raw .txt) để Phase 6/7 trích.
- Không sửa code app trong phase này.

## Implementation Steps
1. Xác nhận SSH access (hoặc escalate). Ghi distro + kernel.
2. Tải binary `victoria-logs` (single-node), tạo systemd unit, `-httpListenAddr=:9428` + bật **syslog ingestion** (`-syslog.listenAddr.tcp`/`udp` — đối chiếu docs VictoriaLogs syslog). Khởi động + `systemctl status` → lưu output.
3. Cấu hình rsyslog `omfwd` forward về cổng syslog VictoriaLogs (RFC5424). Restart rsyslog → lưu output + lỗi quyền nếu có (fail/fix evidence cho walkthrough).
4. Sinh log thật (`logger`, hoặc service thật). Verify qua `curl -G '/select/logsql/query' --data-urlencode 'query=...'` → lưu kết quả JSON.
5. Chạy bộ query LogsQL mẫu (word filter, `_stream:{...}`, `| stats count`, `| sort`, `| limit`) → lưu output từng query (cũng dùng cho preset Phase 4 + bảng mock đối chiếu).
6. (optional) Grafana: thêm datasource VictoriaLogs, screenshot 1 panel → lưu vào captured-outputs.
7. (optional, metrics phụ) node_exporter + vmagent + vmsingle, 1 MetricsQL query → lưu output.
8. Sanitize: xoá IP public/hostname/credential khỏi output trước khi commit.

## Success Criteria
- [ ] VictoriaLogs chạy, `:9428` healthy.
- [ ] Log từ rsyslog truy vấn được bằng LogsQL (có output JSON lưu lại).
- [ ] ≥5 query LogsQL mẫu có output thật lưu trong `captured-outputs/`.
- [ ] Mọi port/flag đã đối chiếu docs (ghi link cạnh từng số liệu).
- [ ] Output đã sanitize, không lộ thông tin nhạy cảm.

## Risk Assessment
- **Không có VPS access** → BLOCKER, escalate sớm (đặt phase này chạy đầu để lộ blocker trước khi đầu tư Phase 6/7).
- **Syslog ingestion flag sai** → đối chiếu trang VictoriaLogs syslog docs; test bằng `logger` trước khi nối rsyslog.
- **Lộ thông tin VPS** → sanitize bắt buộc ở bước 8.
