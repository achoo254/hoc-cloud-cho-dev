# Audit — Giao thức ARP (arp)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 1 | why fields explain mechanics well; no RFC 826 cite in any row |
| W Walkthrough depth | 1 | step[5].why cites RFC 826 via HTML link — good; other steps lack RFC anchor |
| C Cite coverage | 2 | 7 tldr rows: 0 RFC cites. Walkthrough: 1 cite (step 5 whyBreaks inline link to RFC 826) |
| B Banned phrases | 0 | No violations found |
| **Total** | **6 / 10** | |

## Priority: High

## Specific Violations

### TL;DR
- tldr[0].why: "IP là địa chỉ logic (L3), MAC là địa chỉ vật lý (L2). Frame Ethernet yêu cầu MAC đích — app chỉ biết IP — ARP lấp khoảng trống đó." — no RFC 826 cite on the protocol claim
- tldr[1].why: "Broadcast FF:FF:FF:FF:FF:FF đến mọi máy trong LAN để tìm đúng chủ." — broadcast mechanism is protocol-defined (RFC 826 §2), uncited
- tldr[3].why: "Sau ARP thành công, MAC được lưu cache 1–5 phút." — cache duration is implementation-specific; no cite
- tldr[6].why: "Attacker gửi ARP Reply giả nhanh hơn... Không cần crack mật khẩu — chỉ cần ở cùng LAN." — ARP lack-of-auth is RFC 826 by-design, no cite

### Walkthrough
- step[1].why: "Kernel Linux kiểm tra bảng ARP (ip neigh) trước khi phát broadcast... Cache hit = tiết kiệm ~1ms" — ~1ms figure uncited (no source)
- step[3].why: "Timing: ARP resolve xảy ra trong <1ms khi host alive" (in observeWith) — <1ms claim uncited
- step[4].why: "ARP cho 192.168.1.1, không phải 8.8.8.8. Frame gửi với MAC gateway. Dev hay nhầm điểm này khi debug MITM." — correct, but no RFC 826 cite on next-hop ARP behavior

## Misconception Candidates (3–5)

1. wrong: "ARP request đi tới IP đích trực tiếp" → right: "ARP request là broadcast FF:FF:FF:FF:FF:FF gửi đến toàn bộ LAN; chỉ host có IP đó mới reply" (RFC 826 §2) — why it matters: dev hiểu sai sẽ không debug được 'no ARP reply' khi VLAN isolation sai
2. wrong: "Ping 8.8.8.8 → hệ điều hành ARP cho 8.8.8.8" → right: "Kernel tra routing table, tìm next-hop (gateway); ARP được gửi cho IP gateway, không phải IP đích" — why it matters: hiểu sai dẫn đến debug firewall sai layer
3. wrong: "ARP cache giữ mãi không xóa" → right: "ARP entry có TTL thay đổi theo trạng thái: REACHABLE (~30s) → STALE → DELAY → PROBE → FAILED; kernel tự expire theo neighbor subsystem" — why it matters: không biết STALE là bình thường sẽ flush cache không cần thiết
4. wrong: "Chỉ có 1 loại ARP message" → right: "ARP có Request (hỏi) và Reply (trả lời); ngoài ra còn Gratuitous ARP (gửi không được yêu cầu, để update cache và detect IP conflict)" — why it matters: không phân biệt gratuitous ARP dẫn đến đọc sai tcpdump khi debug failover
5. wrong: "ARP hoạt động qua router" → right: "ARP là L2, broadcast không vượt qua router; mỗi subnet có ARP domain riêng; router dùng IP routing để forward, ARP chỉ hoạt động trong broadcast domain" — why it matters: dev hiểu sai sẽ không cấu hình được relay/routing đúng

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| ARP request là broadcast, reply là unicast | RFC 826 §2 |
| ARP packet format (Hardware type, Protocol type, opcode) | RFC 826 §3 |
| Gratuitous ARP behavior | RFC 5227 §2 (IPv4 Address Conflict Detection) |
| ARP không có authentication (by design) | RFC 826 (implicit — no auth field in spec) |
| Neighbor cache state machine (REACHABLE/STALE/PROBE) | RFC 4861 §7.3 (NDP state machine, Linux follows same model) |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 4 / 7 (add RFC 826 cite to tldr[0,1,3,6])
- walkthrough steps to rewrite: 3 / 7 (add cites/fix unsourced claims in step[1,3,4])
- Estimated effort: 0.75h
