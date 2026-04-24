# Audit — Giao thức Ping (icmp-ping)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 1 | 6 rows; mechanics solid; tldr[1] (Time Exceeded) no RFC 792 cite; tldr[3] (TTL trick) no RFC cite |
| W Walkthrough depth | 2 | step[1].why: "Nhiều người nhầm ping là 'test kết nối TCP'" — banned-ish framing (§1: tránh xưng hô chung chung với người học); step[3].why cites RFC 792 inline — good; otherwise thin on mechanics |
| C Cite coverage | 1 | step[3].why has RFC 792 cite; 0/6 tldr rows cite RFC 792; partial overall |
| B Banned phrases | 1 | step[1].why: "Nhiều người nhầm ping là 'test kết nối TCP'" — "nhiều người" violates §2 ("ai cũng dùng", "đa số dev" pattern); no source for this claim |
| **Total** | **7 / 10** | |

## Priority: High

## Specific Violations

### TL;DR
- tldr[0].why (Echo Request/Reply): "Đây là những gì `<code>ping</code>` thực sự gửi. Không phải 'kiểm tra mạng dùng được không' — chỉ kiểm tra L3 reachability." — `<code>` HTML tag in why field; ICMP Type 8/0 defined RFC 792, uncited
- tldr[1].why (Time Exceeded): "Router nhận packet có TTL=0 phải gửi ICMP Time Exceeded về sender kèm IP của chính nó. Đây là cơ sở của traceroute." — Type 11 defined RFC 792, uncited; "phải gửi" = obligation, needs RFC cite
- tldr[2].why (Destination Unreachable): "Khi router không tìm được đường (host unreachable), hoặc port đóng (port unreachable) → gửi loại này." — Type 3 codes defined RFC 792, uncited
- tldr[3].why (TTL trick): "TTL không phải thời gian — là số hop. Mỗi router giảm 1." — TTL as hop counter defined RFC 791 §3.2, uncited
- tldr[5].why (RTT): "RTT = thời gian từ lúc gửi ICMP Echo Request tới khi nhận Echo Reply. Đo latency giữa 2 điểm ở L3." — no cite; "Nếu ping Singapore→Europe ~200ms" — unsourced figure

### Walkthrough
- step[1].why: "Nhiều người nhầm ping là 'test kết nối TCP'." — **BANNED PHRASE PATTERN**: "nhiều người" is equivalent to "đa số dev" (§2) — unverifiable claim about learner behavior, no source
- step[1].why: "Thực ra ping chỉ hoạt động ở L3 (IP), không cần port, không cần process listen." — ICMP operates at L3 per RFC 792, uncited
- step[3].why: "Mỗi router phải báo lại khi drop packet TTL=0 — đây là nghĩa vụ theo RFC 792." — good, RFC 792 cited correctly ✓; but observeWith note "nghĩa vụ theo RFC 792" is in step[3].why not step[3].observeWith — cite placement correct
- step[5].why (Destination Unreachable subtypes): "Code trong ICMP Destination Unreachable cho biết lý do cụ thể: code 0 = net unreachable, code 1 = host unreachable, code 3 = port unreachable." — code definitions RFC 792, uncited

## Misconception Candidates (3–5)

1. wrong: "Ping fail = server down" → right: "Ping tests ICMP Echo (L3 reachability only); firewall có thể block ICMP inbound (GCP/AWS default) → ping fail nhưng service TCP/UDP vẫn hoạt động bình thường" (RFC 792 không bắt buộc host reply ICMP) — why it matters: false alarm monitoring, hoang mang khi VPS không ping được
2. wrong: "Dấu * trong traceroute = đường đứt tại hop đó" → right: "* nghĩa là router đó không gửi ICMP Time Exceeded (có thể do policy/firewall), không phải packet bị drop; nếu hop tiếp theo reply bình thường = đường thông" (RFC 792 — Time Exceeded gửi là optional behavior nhiều router disable) — why it matters: kết luận sai dẫn đến leo thang sự cố nhầm
3. wrong: "TTL là thời gian sống tính bằng giây" → right: "TTL là hop counter; mỗi router decrement 1 khi forward; không liên quan đến thời gian thực" (RFC 791 §3.2: "This field indicates the maximum time the datagram is allowed to remain in the internet system. If this field contains the value zero, then the datagram must be destroyed.") — why it matters: debug traceroute output sai nếu nghĩ TTL là giây
4. wrong: "RTT cao ở hop giữa = bottleneck tại router đó" → right: "Router ưu tiên forward traffic hơn xử lý ICMP (ICMP rate limiting/deprioritization); RTT cao ở intermediate hop nhưng hop cuối bình thường = router de-prioritize ICMP, không phải congestion thật" — why it matters: escalate vấn đề mạng sai router
5. wrong: "ping -s 1500 fail = mạng bị chặn" → right: "ping -s 1472 fail với DF bit set = MTU mismatch trên đường đi, không phải firewall block; router gửi ICMP Type 3 Code 4 (Fragmentation Needed) nhưng thường bị firewall drop → PMTUD broken" (RFC 1191) — why it matters: VPN/tunnel MTU issue hay bị chẩn đoán nhầm là firewall

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| ICMP Echo Request Type 8, Echo Reply Type 0 | RFC 792 |
| ICMP Time Exceeded Type 11 (router obligation khi TTL=0) | RFC 792 |
| ICMP Destination Unreachable Type 3, codes 0/1/3 | RFC 792 |
| TTL là hop counter, mỗi router decrement 1 | RFC 791 §3.2 |
| PMTU Discovery + ICMP Fragmentation Needed (Type 3 Code 4) | RFC 1191 |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 4 / 6 (tldr[0,1,2,3] — strip HTML from tldr[0], add RFC cites; tldr[5] remove unsourced RTT figure)
- walkthrough steps to rewrite: 3 / 6 (step[1] fix banned phrase + add cite; step[4] add RFC 792 code definitions; step[5] add cite)
- Estimated effort: 0.75h
