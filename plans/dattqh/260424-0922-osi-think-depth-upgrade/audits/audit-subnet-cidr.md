# Audit — IPv4 Subnet/CIDR (subnet-cidr)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 1 | 14 rows; math-only rows (steps 1–5 walkthrough) correctly skip RFC; protocol/range rows lack RFC 791/1918/4632 cites; only tldr[12] (private ranges) has RFC 1918 cite |
| W Walkthrough depth | 0 | All 7 walkthrough steps are math/calculation focused — no protocol claims requiring RFC; observeWith is tool-based; acceptable for this lab type |
| C Cite coverage | 1 | 1/14 tldr rows has RFC cite (tldr[12]); 13 rows with protocol-adjacent claims (private ranges, classful, CIDR concept) uncited |
| B Banned phrases | 1 | tldr[5].why (NAT): "Khi bạn curl từ laptop, server log ghi IP của NAT gateway" — "bạn" is a banned pronoun (§1) |
| **Total** | **5 / 10** | |

## Priority: Med

## Specific Violations

### TL;DR
- tldr[0].why (Class A): "Nhận biết Class A: octet đầu từ 1–126. Network ID chỉ 8 bit đầu (1 octet), còn lại 24 bit cho host → mỗi mạng Class A chứa ~16 triệu host." — classful addressing defined RFC 791 §3.2, uncited; "Dành cho tổ chức cực lớn (ISP, chính phủ)" — no source
- tldr[1].why (Class B): "Nhận biết Class B: octet đầu từ 128–191." — RFC 791 §3.2, uncited
- tldr[2].why (Class C): "Nhận biết Class C: octet đầu từ 192–223." — RFC 791 §3.2, uncited
- tldr[4].why (Private vs Public): "Private IP (10/8, 172.16/12, 192.168/16) dùng trong LAN/VPC — ai cũng có thể dùng, không cần đăng ký." — private ranges defined RFC 1918 §3, uncited in this row (cite only in tldr[12])
- tldr[5].why (NAT): "Khi **bạn** curl từ laptop, server log ghi IP của NAT gateway" — **BANNED PRONOUN** "bạn" (§1); NAT defined RFC 3022, uncited
- tldr[9].why (CIDR /n): "Cách viết gọn của subnet mask. /24 nghĩa là 24 bit đầu dành cho network, 8 bit còn lại cho host. Thay thế Class A/B/C cũ kỹ." — CIDR defined RFC 4632, uncited
- tldr[13].why (VLSM): "Chia subnet không đều theo nhu cầu." — VLSM concept from RFC 1009/RFC 1812 era; not RFC-critical but CIDR supernetting context is RFC 4632

### Walkthrough
- No walkthrough violations (all steps are math/binary calculation — RFC not applicable per audit spec)

## Misconception Candidates (3–5)

1. wrong: "Class C = /24, luôn luôn" → right: "Class C là range địa chỉ (192–223 octet đầu); prefix length là khái niệm riêng của CIDR (RFC 4632); một block Class C (192.168.1.0) có thể được chia thành /25, /26, /27 với VLSM" — why it matters: nhầm lẫn classful với CIDR dẫn đến không thiết kế được subnet tùy ý
2. wrong: "Private IP không thể trùng nhau giữa các công ty" → right: "Private ranges (RFC 1918 §3) không routable trên internet và bất kỳ tổ chức nào cũng có thể dùng độc lập; khi kết nối 2 công ty qua VPN, IP overlap là vấn đề thực và phổ biến" — why it matters: thiết kế VPN site-to-site mà không check overlap = tunnel fail
3. wrong: "Usable hosts = 2^(32-n)" → right: "Usable = 2^(32-n) − 2 vì phải trừ network address (host bits all-0) và broadcast address (host bits all-1); AWS còn reserved thêm 5 IP/subnet nên usable thực tế = 2^(32-n) − 7 trên AWS VPC" — why it matters: chọn subnet quá nhỏ → hết IP khi scale, re-subnetting rất tốn công
4. wrong: "NAT gateway thấy IP thật của từng máy trong LAN" → right: "NAT thay source IP từ private → public khi ra internet; server bên ngoài chỉ thấy IP public của NAT gateway, không biết IP private nào gốc; chỉ với CGNAT thêm port tracking mới map ngược được" (RFC 3022) — why it matters: logging và audit compliance cần hiểu đúng IP nào được ghi
5. wrong: "127.x.x.x là Class A" → right: "127.0.0.0/8 là loopback range (RFC 5735 §3), reserved — không phải Class A usable; Class A usable bắt đầu từ 1.0.0.0; 0.0.0.0/8 cũng reserved, không dùng được" — why it matters: nhầm lẫn 127.x là public Class A dẫn đến cấu hình sai

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| Classful addressing: Class A/B/C bit ranges | RFC 791 §3.2 |
| Private address ranges (10/8, 172.16/12, 192.168/16) | RFC 1918 §3 |
| CIDR notation và variable-length prefix | RFC 4632 §3 |
| NAT (source address translation) | RFC 3022 |
| Loopback range 127.0.0.0/8 | RFC 5735 §3 |
| Broadcast address (all-host-bits-1) | RFC 919 |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 6 / 14 (tldr[0,1,2,4,5,9] — add RFC cites; tldr[5] fix "bạn" → neutral noun)
- walkthrough steps to rewrite: 0 / 7 (math-only steps, no RFC needed)
- Estimated effort: 0.5h
