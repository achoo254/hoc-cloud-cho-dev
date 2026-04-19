---
phase: 05
title: Refactor 7 Lab Networking Còn Lại Theo Schema v2
status: pending
effort: 1.5d
depends_on: [04]
---

## Goal

Apply schema v2 cho 7 lab còn lại trong `labs/01-networking/`. Dùng DNS (phase 04) làm reference.

## Scope — 7 Lab

| # | File | Concept chính | deploymentUse hint |
|---|------|---------------|---------------------|
| 01 | `01-tcp-ip-packet-journey.html` | OSI, 4 layer, packet encap | Debug `curl -v`, tcpdump `-vvv` khi app 502 |
| 02 | `02-subnet-cidr.html` | Subnet, CIDR, netmask | Chia VPC, set security group IP range |
| 03 | `03-tcp-udp.html` | 3-way handshake, SYN/ACK, port | Chọn protocol cho app (TCP: HTTP/SSH; UDP: DNS/QUIC) |
| 04 | `04-icmp-ping.html` | ICMP, ping, traceroute | Health check firewall, debug unreachable |
| 05 | `05-arp.html` | ARP table, MAC↔IP | Ít chạm deploy-ready, chỉ cần hiểu khi debug Layer 2 |
| 06 | `06-dhcp.html` | DHCP lease, options | Chủ yếu hiểu concept; cloud thường dùng static/IPAM |
| 07 | `07-http.html` | HTTP method, status, header | Debug app response, cấu hình reverse proxy |

Lab 08 DNS đã xong ở phase 04.

## Files to MODIFY

Mỗi file lab: thay block `<script id="lab-data">` với schema v2.

**Không đụng**: HTML layout, CSS playground riêng, JS playground riêng — chỉ thay JSON data.

## Steps (lặp cho mỗi lab)

1. Mở file, xác định danh sách concept TL;DR hiện có
2. Mỗi TL;DR row: viết thêm `whyBreaks` (1-2 câu triệu chứng) + `deploymentUse` (1-2 câu dev chạm ở đâu)
3. Mỗi walkthrough step: thêm `whyBreaks` + `observeWith` (command + lookAt)
4. Mỗi tryAtHome: thêm `observeWith`
5. Thêm 2-3 `misconceptions` ở top
6. Thêm `dependsOn`/`enables` (dựa bảng mapping trong `plans/dattqh/260419-1048-why-schema-v2/schema-v2-design.md`)
7. Thêm `estimatedMinutes` ước lượng
8. Mở browser lab → verify console warn sạch
9. `npm run sync-labs` → DB update
10. Commit từng lab riêng (1 lab = 1 commit) để dễ revert nếu sai

## vpsExercise

**Chỉ thêm cho lab cuối module** (08-dns, đã xong phase 04). 7 lab còn lại KHÔNG có `vpsExercise` — YAGNI, tránh nhồi 8 bài tập VPS cho 1 module.

Ngoại lệ: có thể thêm `vpsExercise` cho **02-subnet-cidr** (deploy scenario: chia subnet trong VPS firewall rule) nếu user muốn.

## Acceptance Criteria

- [ ] 7 lab mở browser đều console sạch warn
- [ ] `SELECT COUNT(*) FROM labs WHERE module='01-networking'` = 8
- [ ] FTS5 search "TCP handshake", "subnet", "ARP", "HTTP 502" đều trả đúng lab
- [ ] Toggle 4 nút hoạt động đồng nhất trên tất cả 8 lab
- [ ] Dashboard `/` list đúng 8 lab với metadata (estimatedMinutes nếu có)

## Risks

| Risk | Mitigation |
|------|------------|
| Viết `whyBreaks` trùng lặp giữa lab (ví dụ TCP + HTTP cùng nhắc timeout) | OK — cùng concept ở tầng khác, dev đọc vẫn có giá trị |
| Lab ARP/DHCP ít liên quan deploy-ready → viết `deploymentUse` gượng | Ghi thẳng: *"Dev ít chạm — concept này dùng khi debug Layer 2"*. Honest better than fake. |
| 7 lab × ~30 phút/lab = >3h viết, fatigue | Chia 2 session: 4 lab ngày 1, 3 lab ngày 2 |

## Out-of-scope

- Module 02-08 (đợt riêng sau)
- Sửa playground/interactive logic (chỉ đụng JSON data)
- Viết quiz mới (giữ quiz hiện có)
