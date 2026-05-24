# So sánh — DHCP Lab của user vs Peer PR INET-Support/cloud-labs#3

**Date**: 2026-05-24
**Peer reference**: https://github.com/INET-Support/cloud-labs/pull/3/commits/540833caebf57e4b3ac5a09ef4d1fad917b9a715 (MinhVuDinh23, 2026-05-23)
**User's lab source**: `~/dhcp-lab/STEP-BY-STEP.md` trên VM `192.168.81.128` (đã archive)
**Note**: KHÔNG sao chép nội dung peer; báo cáo này chỉ là phân tích đối sánh.

---

## Yêu cầu gốc của INET

> 1 Node Server - 1 Node Client (Option: **+1 node client set IP manual trùng IP với client DHCP trước đó**)
> Sử dụng tcpdump, wireshark bắt gói tin kiểm tra điều gì xảy ra

## Bảng đối sánh

| Tiêu chí | User's lab | Peer lab | Đánh giá |
|---|---|---|---|
| DHCP daemon | isc-dhcp-server | dnsmasq | Cả 2 đều hợp lệ |
| Topology | 3 VM cùng subnet 192.168.81.0/24 (share VMware NAT) | 2 VM, server 2 NIC làm DHCP + NAT Gateway riêng cho host-only 192.168.100.0/24 | Peer realistic hơn cho prod; user gọn hơn cho lab |
| Số node client thực sự | **2 (Client1 + Client2)** | 1 client + Server tự claim IP | **User đáp ứng đúng yêu cầu "+1 node client"** |
| "set IP manual trùng IP với client DHCP trước đó" | Trực tiếp: Client2 cướp IP Client1 đang giữ | Gián tiếp: Server giả lập claim qua Gratuitous ARP | **User đúng tinh thần yêu cầu hơn** |
| Conflict scenarios | A=manual TRƯỚC + B=manual SAU (2 case) | TH1=manual chưa cấp + TH2=Gratuitous ARP (server giả) | User cover đủ 2 thứ tự; Peer cover 2 cơ chế |
| Pool | .200-.201 (2 IP, cố ý exhaust nhanh) | .100-.110 (11 IP) | User dễ test pool exhaustion |
| Lease | 120s/300s | 12h | User observe T1/T2 trong vài phút |
| Gói bắt | D-O-R-A (4) | R-D-O-R-A (5, có Release) | Peer thêm Release |
| Phân tích field protocol | Surface (Wireshark filter guide) | **Bảng field từng gói + options 53/54/61/55/50/51/58/59/1/3/6** | Peer **deep hơn đáng kể** |
| Cơ chế chống conflict dạy | ICMP ping-check (server-side ISC dhcpd) | ARP Probe RFC 5227 + DAD (client-side OS) | Khác cơ chế — bổ sung lẫn nhau |
| RFC cite | RFC 2131 §4.x | RFC 2131 + RFC 5227 + RFC 3927 | Peer rộng hơn |
| Real-world debug | **7 bẫy** (CAP_NET_RAW, AF_PACKET vs iptables, nftables netdev/ingress, INIT-REBOOT cache, networkd-dispatcher, sudo+heredoc, pool teo) | Không có | **User mạnh hơn rất nhiều ở thực chiến** |
| Screenshots | 0 (text-only) | 26 ảnh | Peer trực quan hơn |
| APIPA fallback (169.254/16) | Không demo | Có (RFC 3927) | Peer cover trường hợp client DECLINE |

## Verdict

| Khía cạnh | Winner |
|---|---|
| Đáp ứng đúng yêu cầu gốc của INET (2 client thực, manual trùng IP đã cấp) | **User** |
| Độ sâu phân tích protocol-level (field, options) | **Peer** |
| Bẫy thực tế / production debug | **User** |
| Tính trực quan (screenshots) | **Peer** |
| Cover được nhiều cơ chế khác nhau | **Tied** (user: ping-check + ARP flap; peer: ARP Probe + Gratuitous + APIPA) |
| Reproducibility (script + config) | **User** (lib.sh, helper scripts, persist-filter) |

## Quyết định codify

**User chọn**: giữ nguyên Approach 3 — codify thuần nội dung user's lab, không pull thêm content từ peer.

**Lý do hợp lý**:
- Yêu cầu gốc INET ưu tiên: user đáp ứng chính xác hơn
- 7 bẫy debug + 2 case scenario là điểm khác biệt giá trị → giữ
- Tránh risk bản quyền peer's content
- Scope brainstorm sẽ blow-up nếu pull thêm 5 fields phân tích × 5 gói

**Defer cho session sau (nếu muốn enrich)**:
- DHCP field analysis deep (op/htype/hlen/flags/ciaddr/yiaddr/siaddr/giaddr/chaddr + options) — viết lại từ RFC 2131 §3 + §4 dưới góc nhìn riêng
- Gói Release: thêm walkthrough step về `dhcpcd --release` trigger DHCPRELEASE
- ARP Probe RFC 5227 + APIPA RFC 3927: bổ sung misconceptions

## Cách dùng

- Khi codify, tham khảo bảng "User mạnh / yếu" để biết phần nào cần polish trong từng phase
- Khi review code: đảm bảo lab content đúng 2-client scenario (giữ đúng spirit user's lab)
- Khi explain cho học viên: có thể link tới PR peer như alternative implementation với cùng yêu cầu
