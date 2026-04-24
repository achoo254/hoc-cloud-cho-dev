# Audit — Tìm hiểu UDP/TCP (tcp-udp)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 1 | 6 rows; mechanics solid; tldr[2] (3-way handshake) no RFC 9293 cite; tldr[5] (HTTP/3 QUIC) no RFC 9000 cite |
| W Walkthrough depth | 1 | step[1].why: "nc tạo 1 process lắng nghe port 9000" — process binding claim, no RFC/man page cite; step[7].why cites RFC 793 inline (TIME_WAIT) — good |
| C Cite coverage | 1 | step[7].why has RFC 793 cite; 0/6 tldr rows have RFC cites; partial |
| B Banned phrases | 0 | No violations found |
| **Total** | **5 / 10** | |

## Priority: Med

## Specific Violations

### TL;DR
- tldr[0].why (TCP): "TCP đảm bảo bằng cách retransmit khi mất gói — không cần tự xử lý mất gói trong application code." — reliable delivery mechanism defined RFC 9293 §3.5, uncited
- tldr[1].why (UDP): "Dùng khi tốc độ quan trọng hơn độ chính xác (DNS, VoIP, game, streaming). Mỗi ms latency trong game = cảm giác lag rõ ràng — TCP overhead quá đắt." — UDP defined RFC 768; "mỗi ms latency = cảm giác lag" is qualitative claim without source
- tldr[2].why (3-way handshake): "TCP cần xác nhận cả 2 chiều đều thông trước khi gửi data. Nếu bỏ qua bước này, 1 bên có thể gửi vào hư không khi mạng bất đối xứng." — 3-way handshake defined RFC 9293 §3.3, uncited
- tldr[3].why (ports): "Port phân biệt nhiều service trên cùng 1 IP. Không có port, server không biết giao packet cho nginx hay ssh. Well-known cần root để bảo vệ khỏi giả mạo." — port multiplexing RFC 9293 §3.1; well-known ports IANA registry; uncited
- tldr[4].why (header size): "Với DNS (hàng tỷ query/giây), tiết kiệm 12 byte mỗi packet = tiết kiệm hàng GB/giây băng thông mạng toàn cầu." — "hàng tỷ query/giây" unsourced; TCP header 20-60 bytes RFC 9293 §3.1; UDP header 8 bytes RFC 768
- tldr[5].why (HTTP/3 QUIC): "QUIC xây reliability ở tầng app trên UDP, tránh Head-of-Line blocking của TCP — khi mất 1 stream không chặn stream khác. Đây là lý do HTTP/3 nhanh hơn HTTP/2." — QUIC defined RFC 9000; HTTP/3 defined RFC 9114; "nhanh hơn" claim unsourced

### Walkthrough
- step[1].why: "nc tạo 1 process lắng nghe port 9000. Không có process listen thì TCP SYN nhận RST ngay (connection refused)." — RST on closed port behavior RFC 9293 §3.5.2, uncited; "nc tạo 1 process" is implementation detail, no man page cite
- step[2].why: "Nhìn tận mắt SYN/SYN-ACK/ACK là cách học nhanh nhất. Flag [S] = SYN, [S.] = SYN-ACK, [.] = ACK." — TCP flag encoding RFC 9293 §3.1, uncited
- step[6].why: "DNS là ví dụ kinh điển nhất cho UDP: query và response fit vào 1 packet <512 byte." — DNS UDP message size limit defined RFC 1035 §2.3.4 (512 byte original limit), uncited

## Misconception Candidates (3–5)

1. wrong: "TCP retransmit là tức thì khi mất gói" → right: "TCP dùng RTO (Retransmission Timeout) tính theo RTT với công thức Jacobson/Karels (RFC 6298 §2); timeout tối thiểu 1s theo RFC 6298 §2.4 — không phải tức thì; đây là nguồn gốc của HOL blocking trong HTTP/1.1" — why it matters: hiểu đúng latency penalty của TCP retransmit để chọn đúng protocol
2. wrong: "UDP không reliable = không dùng được cho app quan trọng" → right: "UDP có thể xây reliability layer ở tầng app (sequence number, ACK, retransmit) như QUIC (RFC 9000) đã làm; DNS-over-TCP fallback cũng chứng minh UDP đủ cho hầu hết query" — why it matters: QUIC/WebRTC dùng UDP nhưng vẫn reliable cho thấy binary thinking TCP=reliable/UDP=unreliable là sai
3. wrong: "TIME_WAIT là lỗi và cần tắt đi" → right: "TIME_WAIT là trạng thái bắt buộc theo RFC 9293 §3.3.2 (duration = 2×MSL) để đảm bảo delayed duplicate packets không corrupt connection mới; tắt TIME_WAIT = risk data corruption; SO_REUSEADDR là cách đúng để bypass khi dev" — why it matters: sysctl tcp_tw_recycle (đã removed) gây bug production thực tế
4. wrong: "Port < 1024 bị giới hạn vì lý do hiệu năng" → right: "Well-known ports (0–1023) yêu cầu CAP_NET_BIND_SERVICE (trên Linux) hoặc root vì đây là security boundary — chỉ privileged process mới claim ports quan trọng, tránh user-space process giả mạo SSH/HTTP; không liên quan đến hiệu năng" — why it matters: cấu hình container/systemd capabilities đúng
5. wrong: "SYN flood attack làm server hết RAM vì mỗi connection tốn nhiều bộ nhớ" → right: "Half-open connection (SYN_RCVD state) tốn tương đối ít memory (~280 bytes/connection trên Linux); SYN flood exhausts backlog queue (net.ipv4.tcp_max_syn_backlog) thay vì RAM; SYN cookies giải quyết bằng cách không lưu state cho half-open" (RFC 4987) — why it matters: mitigation strategy khác nhau tùy root cause đúng

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| TCP reliable delivery, retransmission | RFC 9293 §3.5 |
| TCP 3-way handshake | RFC 9293 §3.3 |
| TCP header format (20–60 bytes), port fields | RFC 9293 §3.1 |
| RST on closed port (connection refused) | RFC 9293 §3.5.2 |
| TIME_WAIT duration (2×MSL) | RFC 9293 §3.3.2 |
| TCP RTO calculation | RFC 6298 §2 |
| UDP header format (8 bytes) | RFC 768 |
| DNS message size limit 512 bytes | RFC 1035 §2.3.4 |
| QUIC protocol | RFC 9000 |
| HTTP/3 over QUIC | RFC 9114 |
| SYN flood và SYN cookies | RFC 4987 |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 5 / 6 (tldr[0,1,2,3,5] — add RFC cites; fix unsourced "hàng tỷ query" and "nhanh hơn" claims)
- walkthrough steps to rewrite: 3 / 7 (step[1,2,6] — add RFC cites)
- Estimated effort: 0.5h
