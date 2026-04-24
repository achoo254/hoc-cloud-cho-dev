---
type: brainstorm
date: 2026-04-24
slug: osi-think-depth-upgrade
lab: tcp-ip-packet-journey
status: agreed, pending plan
---

# Brainstorm — Nâng độ sâu THINK cho lab "OSI TCP/IP"

## 1. Problem statement

Lab `tcp-ip-packet-journey` (title: "Lý thuyết OSI TCP/IP") có THINK content **thiếu chiều sâu, không rõ bản chất**. Triệu chứng cụ thể:

| Gap | Tình trạng | Vi phạm |
|---|---|---|
| `misconceptions[]` TRỐNG | 0 items | Schema v3 bắt buộc ≥2 (`lab-schema-v3.md` §7) |
| `tldr[].why` toàn analogy mềm | "số phòng trong tòa nhà", "tìm đường", "tầng vật lý" | `content-guidelines.md` §6 (fact-first) |
| Không cite RFC/ISO | 0 link | `content-guidelines.md` §3 (bắt buộc cite cho claim protocol) |
| Không giải thích WHY layering | Chỉ nêu "OSI 7 tầng vs TCP/IP 4 tầng" historical | Mất giá trị pedagogy — `lab-schema-v3.md` §8 |
| Không expose "layer contract" | Mỗi layer chỉ mô tả, không nêu input/output/state-hidden | Dev không hiểu bản chất abstraction |
| Walkthrough 8 steps có analogy | "Tầng vật lý — cáp mạng, WiFi, card mạng" | Thiếu cite ARP/TTL/ICMP RFC |

## 2. Decisions locked (qua AskUserQuestion)

| Câu hỏi | Chốt |
|---|---|
| Scope | ALL 4 mảng: misconceptions + TL;DR + walkthrough + cite |
| Depth | Deep — designer-rationale, dev muốn hiểu thiết kế |
| Length tolerance | 2-3x dài hơn cho phép |
| Analogy | **Bỏ hết, strict fact-first** |
| Misconceptions | 4 meta concepts (OSI≠TCP/IP, layering rationale, ping≠service, encap order invariant) |
| Cite format | Inline link trực tiếp `[RFC 793 §2.7](url)` — theo guidelines §3 |
| Walkthrough | Rewrite ALL 8 steps deep (same pattern as TL;DR) |
| Output | Report + invoke `/ck:plan` sau để plan implementation |

## 3. Approach — "Deep fact-first rewrite"

Phân vai 3 field để không overlap:

| Field | Vai trò | Depth focus |
|---|---|---|
| `misconceptions[]` (0→4) | **Meta concepts** về layering | WHY layering, OSI vs TCP/IP wire-format, encap invariant |
| `tldr[].why` (5 rows rewrite) | **Layer contract** | Input/output/state-hidden mỗi tầng |
| `walkthrough[].why` (8 steps rewrite) | **Encap mechanics + debug hook** | Header bytes, TTL/MAC/ARP cơ chế, field-by-field |

Mỗi `why` field theo structure:
```
P1: Contract — tầng nhận gì, tạo gì, spec reference
P2: Mechanics — header/field cụ thể, state machine, RFC cite
P3: Implication cho dev — điều hiểu này đổi cách debug/deploy
```

### Sources tham chiếu (đã verify)

| RFC/ISO | Dùng cho |
|---|---|
| [ISO/IEC 7498-1:1994](https://www.iso.org/standard/20269.html) | OSI 7-layer reference model |
| [RFC 1122 §1.1.3](https://datatracker.ietf.org/doc/html/rfc1122#section-1.1.3) | TCP/IP 4-layer rationale |
| [RFC 9293](https://datatracker.ietf.org/doc/html/rfc9293) | TCP (current, thay thế RFC 793) |
| [RFC 793 §2.7](https://datatracker.ietf.org/doc/html/rfc793#section-2.7) | TCP socket 4-tuple |
| [RFC 768](https://datatracker.ietf.org/doc/html/rfc768) | UDP |
| [RFC 5681](https://datatracker.ietf.org/doc/html/rfc5681) | TCP congestion control |
| [RFC 791 §3.2](https://datatracker.ietf.org/doc/html/rfc791#section-3.2) | IP header + TTL |
| [RFC 792](https://datatracker.ietf.org/doc/html/rfc792) | ICMP echo request/reply |
| [RFC 826](https://datatracker.ietf.org/doc/html/rfc826) | ARP |
| [RFC 9110](https://datatracker.ietf.org/doc/html/rfc9110) | HTTP Semantics |
| [RFC 1035](https://datatracker.ietf.org/doc/html/rfc1035) | DNS |
| [IEEE 802.3](https://standards.ieee.org/ieee/802.3/) | Ethernet (L1/L2) |

> Ghi chú: RFC 3439 §3 "Avoid Unless Necessary: Software Layering" — KHÔNG dùng làm cite cho "layering rationale" vì §3 critique layering rigid. Thay bằng ISO/IEC 7498-1 §5 hoặc RFC 1122 §1.1.3.

---

## 4. Full content drafts

### 4.1 `misconceptions[]` — 4 items (từ 0)

```json
[
  {
    "wrong": "TCP/IP có 4 tầng vì thế giới đã bỏ OSI 7 tầng.",
    "right": "OSI (ISO/IEC 7498-1) là reference model dùng để phân tích/giảng dạy; TCP/IP (RFC 1122) là implementation thực tế trên internet. Hai mô hình co-exist, không thay thế nhau. Vendor docs (Cisco, AWS, Kubernetes) vẫn dùng OSI terminology: 'L7 firewall', 'L4 load balancer', 'L3 routing'.",
    "why": "OSI Session/Presentation không có header riêng trong wire format TCP/IP — bị Application absorb vào một tầng. Đây là lý do TCP/IP 'gộp 4 tầng' chứ không phải bỏ bớt. Khi debug AWS ALB (L7) vs NLB (L4), sự phân biệt OSI-based này là điều kiện cần để đọc docs đúng."
  },
  {
    "wrong": "Layering chỉ là khái niệm giảng dạy, thực tế code mạng vẫn phải biết từ cable đến HTTP.",
    "right": "Layering = separation of concerns ở mức protocol design. HTTP spec (RFC 9110) không nhắc gì đến Ethernet hay WiFi — vì layering cho phép HTTP chạy trên mọi L2 (Ethernet, WiFi, 5G, Starlink, VPN tunnel) mà không sửa spec. Code ứng dụng chỉ gọi socket API (BSD sockets), kernel TCP/IP stack xử lý L2/L3/L4.",
    "why": "Giá trị cụ thể: khi đổi cable copper sang cáp quang, nginx không recompile. Khi client chuyển WiFi → 4G, TCP connection có thể giữ (với MPTCP) vì L4 không biết L2 đổi. Đây là invariant, không phải lý thuyết."
  },
  {
    "wrong": "Ping thành công nghĩa là server hoạt động.",
    "right": "Ping test L3 ICMP (RFC 792) — chỉ xác nhận gói IP đi tới được host và kernel reply được. Service thật chạy ở L7, cần test thêm L4 (TCP handshake tới port đúng) và L7 (HTTP response hợp lệ).",
    "why": "Firewall có thể allow ICMP mà block TCP :443. Host có thể up, kernel reply ICMP — nhưng nginx đã crash → client vẫn nhận 502 hoặc connection refused. Ping chỉ chứng minh L1-L3 OK, không nói gì về L4-L7."
  },
  {
    "wrong": "Encapsulation order có thể thay đổi tùy protocol (ví dụ HTTPS 'bỏ qua' TCP).",
    "right": "Encap order cuối cùng LUÔN kết thúc ở L2 Link vì bit phải ra NIC → cable/WiFi với frame boundary + MAC. HTTPS không 'bỏ qua' TCP — TLS nằm giữa TCP và HTTP, giữ nguyên L4 port demux. Tunnel (VPN, WireGuard, GRE) chỉ là thêm 1 lớp encap ngoài, không skip tầng nào.",
    "why": "Constraint vật lý: NIC chỉ biết parse Ethernet frame theo IEEE 802.3, không biết IP. Nếu order biến mất → NIC không biết frame bắt đầu/kết thúc ở đâu. Hiểu invariant này → khi thấy packet capture lạ (VXLAN, GENEVE), biết ngay đó là tunnel overlay, không phải 'giao thức thay thế TCP/IP'."
  }
]
```

### 4.2 `tldr[]` — rewrite `why` field cho 5 rows

**Lưu ý:** giữ nguyên shape (`layer`, `name`, `pdu`, `device`, `protocol`, `why`, `whyBreaks`, `deploymentUse`). Chỉ rewrite `why`. `whyBreaks` và `deploymentUse` hiện đã tương đối tốt, giữ nguyên để giảm scope.

---

**Row 1 — Comparison: OSI 7 vs TCP/IP 4**

```
OSI (ISO/IEC 7498-1) định nghĩa 7 tầng reference: Physical → Data Link →
Network → Transport → Session → Presentation → Application. TCP/IP (RFC 1122
§1.1.3) gom lại còn 4 tầng implementation thực: Link (L1+L2 OSI) → Internet
(L3) → Transport (L4) → Application (L5+L6+L7 OSI).

Sự khác nhau không phải 'bỏ bớt 3 tầng' mà là wire format: TCP/IP không có
header riêng cho Session (L5) và Presentation (L6). Chức năng L5 (session
control) do app tự làm qua cookie/JWT/WebSocket. Chức năng L6 (encoding,
compression) do TLS (RFC 8446) và Content-Encoding (RFC 9110 §8.4) xử lý bên
trong L7. OSI ra đời như chuẩn ISO (1984) sau khi ARPANET đã deploy TCP/IP
(1983). TCP/IP được deploy trên ARPANET trước khi OSI spec hoàn thiện, dẫn
tới TCP/IP thành de-facto stack trong implementation; OSI giữ vai trò
reference/pedagogy trong docs + vendor terminology.

Hiểu mapping này: khi đọc 'L7 firewall' (AWS WAF), 'L4 load balancer' (AWS
NLB), 'L3 routing' (iptables) — vendor dùng OSI numbering. Hiểu sai → map
nhầm feature khi so sánh dịch vụ.
```

---

**Row 2 — L4 Application (TCP/IP) = OSI L5-L7**

```
Application layer (RFC 1122 §4) là nơi process userspace 'phát biểu' qua
socket API — HTTP request, DNS query, SSH command. Input: byte stream từ
Transport (TCP) hoặc datagram (UDP). Output: semantic message theo protocol
cụ thể (HTTP/1.1 text, HTTP/2 binary frames, DNS binary — RFC 1035 §4).

Tầng này che giấu gì cho dev: không che giấu gì khác — mọi thứ dưới L4 đã
abstract qua socket API. App không biết packet loss, reorder, fragmentation;
TCP stack đã xử lý. Lỗi ở tầng này là semantic: 400 (client format sai), 500
(server logic sai), 502 (upstream không phản hồi đúng) — không phải lỗi
mạng.

Hiểu điều này: khi curl báo 502, không phải 'mạng hỏng' — là nginx upstream
(another app) fail. Check journalctl -u nginx, docker logs, không phải
restart router.
```

---

**Row 3 — L3 Transport (TCP/IP) = OSI L4**

```
Transport layer (RFC 1122 §4) nhận IP packet từ Internet layer, demux về
socket dựa trên 4-tuple (srcIP, srcPort, dstIP, dstPort) — RFC 793 §2.7.
PORT 16-bit là cơ chế duy nhất cho phép 1 host chạy nhiều process cùng
local IP; không có port → 1 IP chỉ chạy được 1 service.

TCP (RFC 9293) thêm 3 đảm bảo mà IP không có: ordering (sequence number +
reorder buffer), reliability (cumulative ACK + retransmit theo RFC 6298),
congestion control (RFC 5681 — slow start, AIMD). UDP (RFC 768) bỏ hết —
chỉ giữ demux port + checksum 16-bit, latency 0 ms buffering.

Transport che giấu packet loss/reorder cho L4 Application — nginx không
viết code retransmit, kernel TCP stack làm. Hiểu điều này → curl timeout:
tcpdump xem TCP handshake fail ở SYN (firewall chặn) hay SYN-ACK (server
không reply) hay application không accept().
```

---

**Row 4 — L2 Internet (TCP/IP) = OSI L3**

```
Internet layer (RFC 1122 §3) nhận segment từ Transport, đóng gói thành IP
packet với header 20 bytes (RFC 791 §3.1): Source IP, Destination IP, TTL,
Protocol number (6=TCP, 17=UDP, 1=ICMP). Gửi cho L1 Link để forward qua
router dựa trên Destination IP + routing table.

Tầng này che giấu topology mạng cho Transport: L4 không biết packet đi qua
bao nhiêu router, WAN/LAN/VPN. TTL (RFC 791 §3.2) giảm 1 tại mỗi router —
chống loop vô tận, và là cơ chế traceroute exploit để xem từng hop. Routing
layer (BGP ở internet, OSPF trong AS) không thuộc IP spec — là control
plane riêng.

Internet layer là nơi 'liên mạng' xảy ra — tên 'Internet' = inter-network.
Hiểu: khi 'không ra mạng', check theo thứ tự — ip route (default route có
không?) → ping 8.8.8.8 (L3 OK?) → ping google.com (DNS OK?). Nếu ping IP
được nhưng domain không, là L7 DNS fail, không phải L3.
```

---

**Row 5 — L1 Link (TCP/IP) = OSI L1-L2**

```
Link layer (RFC 1122 §2) gom L1 Physical + L2 Data Link của OSI. Input: IP
packet từ Internet layer. Output: bit stream ra NIC theo chuẩn vật lý
(IEEE 802.3 Ethernet, IEEE 802.11 WiFi). Đóng gói thành frame với
destination MAC + source MAC + FCS (frame check sequence) trước khi
transmit.

Tầng này dùng MAC address (48-bit, IEEE 802) — địa chỉ phần cứng duy nhất
của NIC. ARP (RFC 826) resolve IP → MAC trong cùng broadcast domain: host
broadcast 'Who has 192.168.1.1?', gateway reply kèm MAC. Chú ý: frame gửi
tới server ở xa sẽ dùng MAC của next-hop gateway, không phải MAC server
(server ở domain khác, không thể reach trực tiếp L2).

Link layer che giấu medium vật lý cho Internet — IP không biết đang chạy
trên copper Ethernet, cáp quang, WiFi, hay 5G. Cáp đứt/WiFi mất sóng →
mọi tầng trên không forward được. Trên cloud VM, hypervisor + virtual
switch quản tầng này — NIC driver, MTU mismatch (ví dụ AWS Jumbo Frames
9001 vs standard 1500), hoặc AWS security group (iptables-like, tác động
L3/L4) vẫn có thể fail. Error surface thường là `Network Unreachable`
(EHOSTUNREACH) hoặc `No route to host`.
```

### 4.3 `walkthrough[]` — rewrite 8 steps `why` field

Format tương tự TL;DR (contract / mechanics / implication). `whyBreaks` và `observeWith` giữ nguyên để giảm scope.

---

**Step 0: DNS — resolve hostname → IP**

```
DNS (RFC 1034, RFC 1035) là pre-condition của mọi kết nối dùng hostname.
Socket API nhận char* "example.com" qua getaddrinfo() — libc resolver đọc
/etc/nsswitch.conf, query DNS server (thường UDP :53, fallback TCP :53
cho response >512 byte — RFC 1035 §4.2.1), parse A record (IPv4) hoặc
AAAA (IPv6).

Cơ chế recursive: stub resolver hỏi local DNS (ISP/router), local DNS hỏi
root (13 root servers, RFC 7720), root trả TLD (.com), TLD trả authoritative
(example.com's NS), authoritative trả A record. Kết quả cache theo TTL của
record. Response code phân loại lỗi (RFC 1035 §4.1.1): NXDOMAIN (rcode=3,
tên không tồn tại), SERVFAIL (rcode=2, authoritative fail), timeout (không
reach được resolver).

DNS không nằm trong packet journey của ping/curl sau khi resolve xong — nhưng
là bước 0 bắt buộc. 'Could not resolve host' LUÔN là DNS fail, không phải
mạng. Nếu dig example.com từ VPS fail → /etc/resolv.conf sai hoặc firewall
chặn UDP :53.
```

---

**Step 1: L7 Application — `ping` tạo ICMP echo request**

```
Lệnh `ping` là userspace process gọi syscall socket(AF_INET, SOCK_RAW,
IPPROTO_ICMP) — khác socket TCP (SOCK_STREAM) hoặc UDP (SOCK_DGRAM). ICMP
(RFC 792) là protocol number 1, nằm trực tiếp trên IP — không có port khái
niệm.

Kernel tạo ICMP echo request (type=8, code=0) với identifier + sequence
number để match reply, payload thường là timestamp + pattern bytes (default
56 bytes data + 8 bytes ICMP header = 64 bytes). Gửi xuống Internet layer.
Trên Linux, cần CAP_NET_RAW hoặc sysctl net.ipv4.ping_group_range cho user
không-root chạy ping.

ICMP ở L3 (Internet layer) chứ không phải L4 (Transport). CLI/UI thường
xếp `ping` cạnh `nc`/`curl` — là quy ước tool, không phản ánh vị trí trong
stack. Hệ quả: ping pass không kéo theo TCP :80 pass — firewall có thể
allow ICMP, block TCP (hoặc ngược lại).
```

---

**Step 2: L3 Internet — đóng gói IP header**

```
Kernel gắn IP header 20 bytes (RFC 791 §3.1) quanh ICMP payload. Các field
quan trọng: Source IP (địa chỉ outbound của interface được chọn bởi routing
table), Destination IP (93.184.216.34 từ DNS), Protocol=1 (ICMP), TTL=64
(Linux default, RFC 1122 §3.2.1.7 khuyến nghị 64), Header Checksum (RFC
1071).

TTL giảm 1 tại mỗi router (RFC 791 §3.2) — khi TTL=0, router drop packet và
gửi ICMP Time Exceeded (type=11) về sender. Đây là nguyên lý traceroute
khai thác: gửi packet với TTL=1, 2, 3... để nhận Time Exceeded từ từng hop.
Packet fragment nếu size > MTU của path (RFC 791 §3.2); Linux kernel enable
Path MTU Discovery mặc định (sysctl `net.ipv4.ip_no_pmtu_disc=0`, RFC 1191)
để set DF bit và avoid fragment.

Hiểu IP header → biết debug: trace Source IP bị NAT đổi khi qua router
public (router thay Source IP thành IP public của nó, server thấy IP NAT
box, không thấy IP private của client). Hiểu sai IP private (RFC 1918:
10/8, 172.16/12, 192.168/16) vs public → cấu hình firewall sai.
```

---

**Step 3: L2 Link — đóng Ethernet frame + ARP resolve MAC**

```
Kernel tra routing table (ip route) để quyết định next-hop: server
93.184.216.34 không ở LAN → gửi qua default gateway (ví dụ 192.168.1.1).
Cần MAC của gateway để đóng Ethernet frame. Kernel check ARP cache (ip neigh)
— nếu miss, trigger ARP request.

ARP (RFC 826): host broadcast frame L2 (destination MAC = FF:FF:FF:FF:FF:FF)
với query 'Who has 192.168.1.1? Tell 192.168.1.10'. Tất cả host trong
broadcast domain nhận, chỉ gateway (192.168.1.1) reply với ARP response
kèm MAC của nó. Kernel cache pair (IP, MAC) trong ARP table ~30s-1h tùy
OS, sau đó refresh.

Ethernet frame (IEEE 802.3): destination MAC = MAC gateway, source MAC =
MAC NIC, EtherType = 0x0800 (IPv4), payload = toàn bộ IP packet, FCS
(CRC-32) cuối frame. Destination MAC LUÔN là MAC next-hop, không phải MAC
server cuối cùng — nhầm điều này dẫn tới đọc sai packet capture trên Wireshark.
ARP poisoning là attack class trong LAN: attacker gửi ARP reply giả claim
MAC của mình cho IP gateway → host gửi traffic tới MAC attacker = MITM (cite
[CAPEC-141 ARP Spoofing](https://capec.mitre.org/data/definitions/141.html)).
```

---

**Step 4: Router forwarding — decap L2, lookup L3, encap L2 mới**

```
Router nhận frame → check destination MAC (đúng của router) → decap Ethernet
(bóc L2 header + FCS) → lấy IP packet → check destination IP → tra routing
table (longest prefix match, RFC 1812 §5.2). Route entry trỏ tới outgoing
interface + next-hop IP. Router decrement TTL -1, recompute IP header
checksum (RFC 1071).

Router resolve MAC của next-hop qua ARP (nếu chưa cache), đóng Ethernet frame
MỚI với destination MAC = MAC next-hop, source MAC = MAC outgoing interface.
Gửi ra NIC. Lặp lại tại mỗi router trên path tới mạng server — số hop verify
trực tiếp bằng `traceroute` hoặc `mtr` từ client cụ thể.

Điểm mấu chốt: IP header không đổi qua router (trừ TTL + checksum), Ethernet
header bị TẠO LẠI tại mỗi hop — vì MAC chỉ có ý nghĩa trong 1 broadcast
domain. Hiểu điều này → traceroute hiển thị IP (L3) không phải MAC (L2), và
'ping -r' record route options hiển thị IP của router, không phải MAC.
```

---

**Step 5: Server stack — decap Link → Internet → kernel reply ICMP**

```
Server example.com nhận frame → check destination MAC (đúng của NIC
server) → decap Ethernet → đọc IP header → check destination IP (đúng của
server) → đọc Protocol field = 1 (ICMP) → pass lên ICMP handler trong
kernel. Không có process userspace nào được invoke.

Kernel ICMP handler (RFC 792 §Echo) nhận echo request (type=8), tạo echo
reply (type=0) với identical identifier + sequence number + payload, swap
source/destination IP, gửi xuống IP layer. Reply đi ngược về client qua
routing table của server, có thể KHÁC path đi (asymmetric routing). Firewall
stateless không track pair request↔reply → drop reply nếu path reply đi
qua interface khác path request — cần stateful firewall (conntrack trên
Linux netfilter) để handle.

Vì kernel tự reply, không cần app chạy → ping hoạt động ngay cả khi
nginx/ssh/mysql đều down, chỉ cần kernel còn sống. Hệ quả debug: ping
thành công chỉ chứng minh host + kernel OK, không chứng minh service. Để
verify service, phải test L4 (nc -vz host port) và L7 (curl, protocol
command).
```

---

**Step 6: Reply ngược — `ping` đọc RTT từ kernel**

```
Kernel client nhận ICMP echo reply, match identifier + sequence với request
đã gửi, tính RTT = timestamp nhận - timestamp gửi (timestamp nằm trong
payload do kernel nhúng khi gửi). Tăng statistics (packets_received++),
pass event lên userspace process `ping` qua recvmsg().

`ping` in '64 bytes from 93.184.216.34: icmp_seq=1 ttl=54 time=12.3 ms'.
Các field: '64 bytes' = ICMP + payload (không tính IP header), 'ttl=54' =
TTL còn lại khi tới client (nếu server gửi TTL=64 → đã qua 10 hop),
'time=12.3 ms' = RTT đi + về.

Hai metric quan trọng nhất: packet loss % (sau N packet, bao nhiêu không
reply — 1-2% loss làm TCP throughput giảm do retransmit window collapse,
RFC 5681 §3.1) và jitter (biến thiên RTT — jitter > 30 ms gây audio/video
codec buffer underrun trong realtime app: VoIP, video call, game). Ping IP
cùng LAN (<1 ms expected) verify L1-L3 local; ping IP khác AS (<200 ms
intercontinental fiber) verify WAN path.
```

---

**Step 7: Insight — tại sao curl fail dù ping thành công**

```
Đây là test case tổng hợp toàn bộ stack: ping test L3 (ICMP echo),
curl/browser test L3 + L4 + L7. Ping thành công chứng minh L1→L3 OK, kernel
server reply được. Curl cần thêm:

L4 Transport (TCP, RFC 9293): 3-way handshake tới port 80/443 — SYN,
SYN-ACK, ACK. Firewall chặn port → 'connection timeout' (SYN không nhận
SYN-ACK). Host up nhưng không process nào listen port → 'connection refused'
(kernel reply TCP RST). L7 Application (HTTP, RFC 9110): nginx/app nhận
TCP byte stream, parse HTTP request, trả response. Nginx upstream fail →
502; app crash → 500; client format sai → 400.

Hiểu separation này đổi workflow debug hoàn toàn: từ 'server không vào
được' (vague) → 'test từng layer': ping (L3) → nc -vz host 443 (L4 + port
open?) → curl -v (L7 + HTTP valid?). Biết layer nào fail → biết tool nào
để observe (tcpdump cho L3-L4, journalctl/access log cho L7).
```

---

## 5. Implementation risks

| Risk | Mitigation |
|---|---|
| RFC link rot | Dùng datatracker.ietf.org (IETF official mirror, stable) thay vì tools.ietf.org |
| HTML vs Markdown trong MongoDB text | Check renderer hiện tại (likely HTML since existing uses `<code>`, `<strong>`) — plan phase quyết định format |
| `contentHash` recalc | Post-save hook Mongoose tự handle (theo `server/db/models/lab-model.js`) — plan phase verify |
| Meilisearch sync | Auto via post-save hook — không cần manual step |
| Length tăng gây UI overflow TL;DR row | TL;DR render là bảng; row dài cần check responsive. Plan phase: có thể cần redesign TL;DR render hoặc collapse dài |
| Lab content bundle size | Không impact (fetched qua `/api/labs/:slug`, không bundle) |
| Validation Zod pass | Content giữ shape schema v3; không đổi key → Zod pass |

## 6. Success criteria

- `misconceptions[]` có 4 items, mỗi item có `wrong`, `right`, `why` không trống
- Zod validation `app/src/lib/schema-lab.ts` pass (không throw)
- `contentHash` thay đổi (trigger Meilisearch reindex)
- `/api/labs/tcp-ip-packet-journey` trả content mới
- Inline RFC links hoạt động (click ra đúng section datatracker.ietf.org)
- 0 occurrences của các analogy cũ trong text mới: "số phòng", "tìm đường", "tầng vật lý" (ngoài ngữ cảnh quote OSI L1 Physical)
- Zero vi phạm `content-guidelines.md` §2 (cụm cấm) + §3 (cite nguồn) trong content mới

## 7. Next steps

1. `/ck:plan` để tạo plan detail với phase:
   - Phase 1: Verify renderer hỗ trợ HTML inline link (hoặc Markdown)
   - Phase 2: Viết mongosh script update `labs.tcp-ip-packet-journey` với content draft từ §4 report
   - Phase 3: Trigger contentHash recalc + verify Meilisearch sync
   - Phase 4: Visual QA — render lab trên FE, check TL;DR row overflow, link click
   - Phase 5: Audit lại `docs/content-guidelines.md` checklist §7
2. Nếu TL;DR render vỡ vì row quá dài → scope thêm: redesign TL;DR component collapse/expand

## 8. Resolved decisions (sau brainstorm)

| # | Question | Decision |
|---|---|---|
| 1 | Renderer format | **HTML** inline `<a href="...">` — khớp pattern existing content đã dùng `<code>`, `<strong>` |
| 2 | Audit 7 labs còn lại? | **Có** — mở rộng scope thành sub-project: audit + upgrade 7 labs (ARP, DHCP, DNS, HTTP, ICMP, IPv4, TCP/UDP) cùng pattern |
| 3 | Redesign TL;DR component? | **Có nếu cần** — plan phase verify UX khi content 3x, redesign collapse/expand nếu overflow |

## 9. Still unresolved (long-term, ngoài scope plan này)

1. `contentHash` duplicate edge case — nếu update content mới trùng hash cũ → post-save hook có skip sync không? (Plan phase verify trong `server/db/models/lab-model.js`)
2. Metric đo "độ sâu hiểu" (completion rate quiz, thời gian đọc trung bình) — không scope lần này, cần retro data sau khi deploy.
