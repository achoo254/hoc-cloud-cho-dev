# Audit — Giao thức DHCP (dhcp)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 1 | DORA flow well-explained; tldr[3].why cites RFC 2131 inline — good; T1/T2 rows lack RFC 2131 §4.4 cite |
| W Walkthrough depth | 1 | step[4].why cites RFC 2131 inline — good; other steps lack cites on protocol claims |
| C Cite coverage | 1 | 1 of 7 tldr rows has RFC cite (tldr[3] ACK row); 1 of 7 walkthrough steps has cite (step[4]); partial coverage |
| B Banned phrases | 0 | No violations found |
| **Total** | **5 / 10** | |

## Priority: Med

## Specific Violations

### TL;DR
- tldr[0].why (Discover): "Client chưa có IP → chỉ có cách broadcast. src=0.0.0.0 vì chưa có địa chỉ, dst=255.255.255.255 để đến tất cả host trong LAN." — broadcast behavior is protocol-defined (RFC 2131 §4.1), no cite
- tldr[4].why (T1 Renew): "Tại T1=50% lease, client unicast tới server gốc để gia hạn." — T1=50% is defined in RFC 2131 §4.4.5, no cite
- tldr[5].why (T2 Rebind): "Server gốc không phản hồi T1 → client broadcast rebind. Bất kỳ DHCP server nào cũng có thể xác nhận." — T2=87.5% and rebind mechanism defined in RFC 2131 §4.4.5, no cite
- tldr[6].why (Relay): "Broadcast không vượt được router. Relay agent (router) nhận broadcast, đổi thành unicast gửi tới DHCP server ở subnet khác." — relay agent defined in RFC 2131 §4.1.2 / RFC 3046, no cite

### Walkthrough
- step[1].why: "Client vừa boot, chỉ có MAC address. Nó phải broadcast vì chưa có IP — đây là điểm khởi đầu bắt buộc." — protocol mandate uncited (RFC 2131 §4.3.1)
- step[3].why: "Client broadcast Request để tất cả DHCP server trong LAN biết nó đã chọn server nào. Các server không được chọn sẽ giải phóng IP đã dự trữ." — this mechanism (broadcast Request with server identifier option) is RFC 2131 §4.3.2, uncited
- step[5].why: "Không gia hạn = IP bị thu hồi = mất kết nối mạng đột ngột. T1 và T2 là buffer tránh gián đoạn dịch vụ." — no RFC 2131 §4.4.5 cite for T1/T2 definitions

## Misconception Candidates (3–5)

1. wrong: "DHCP ACK luôn được gửi broadcast" → right: "DHCP ACK mặc định là unicast tới MAC + IP mới cấp (RFC 2131 §4.1); chỉ broadcast khi client set BROADCAST flag trong Request" — why it matters: hiểu sai dẫn đến debug Wireshark sai filter, bỏ qua ACK unicast
2. wrong: "Sau khi nhận Offer, IP đã được gán chính thức" → right: "IP chỉ được gán chính thức sau ACK; Offer chỉ là đề xuất, server chưa commit vào lease database" (RFC 2131 §4.3.1) — why it matters: nếu client crash sau Offer nhưng trước Request, server sẽ reclaim IP sau timeout
3. wrong: "DHCP chỉ cần 1 server là đủ cho mọi subnet" → right: "Broadcast không vượt router; cần Relay Agent (ip helper-address) trên mỗi router hoặc DHCP server riêng mỗi subnet" (RFC 2131 §4.1.2) — why it matters: thêm VLAN mới mà quên relay = toàn bộ VM không lên mạng
4. wrong: "Lease hết hạn = client mất IP ngay lập tức" → right: "Client có 2 cơ hội gia hạn trước khi mất IP: T1=50% lease (unicast renew), T2=87.5% lease (broadcast rebind); chỉ mất IP khi 100% lease expire mà không có server nào trả lời" (RFC 2131 §4.4.5) — why it matters: không hoang mang khi thấy log 'T1 renewal failed'
5. wrong: "DHCP Request chỉ đến server đã chọn" → right: "DHCP Request vẫn là broadcast để thông báo cho TẤT CẢ server; server không được chọn biết và giải phóng IP đã hold" (RFC 2131 §4.3.2) — why it matters: hiểu sai dẫn đến không biết tại sao có nhiều DHCP servers trong LAN vẫn an toàn

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| Discover broadcast (src=0.0.0.0, dst=255.255.255.255) | RFC 2131 §4.3.1 |
| Offer: server broadcast vì client chưa có IP | RFC 2131 §4.3.1 |
| Request broadcast + server identifier option | RFC 2131 §4.3.2 |
| ACK unicast mặc định, broadcast chỉ khi BROADCAST flag | RFC 2131 §4.1 |
| T1=50%, T2=87.5% lease time | RFC 2131 §4.4.5 |
| Relay Agent behavior | RFC 2131 §4.1.2, RFC 3046 |
| DHCP options (DNS, gateway, lease time) | RFC 2132 |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 4 / 7 (tldr[0,4,5,6] — add RFC cites)
- walkthrough steps to rewrite: 3 / 7 (step[1,3,5] — add RFC cites)
- Estimated effort: 0.5h
