/**
 * One-shot migration — THINK depth upgrade cho lab `tcp-ip-packet-journey`.
 *
 * Source of truth content: brainstorm §4.1 (misconceptions), §4.2 (tldr.why×5),
 *   §4.3 (walkthrough.why×8).
 * Invariant:
 *   - Chỉ patch field `why` của tldr rows và walkthrough steps đã chỉ định.
 *   - Các field khác (`whyBreaks`, `deploymentUse`, `observeWith`, …) giữ nguyên.
 *   - Thêm `misconceptions` (4 items) — field này vốn không tồn tại trong doc.
 *   - contentHash = ISO timestamp (cache-bust, Meili re-sync).
 *
 * Safety:
 *   - Backup full doc (tldr + walkthrough + misconceptions + contentHash) ra
 *     `backup-osi-lab-pre-update.json` TRƯỚC khi update.
 *   - Abort nếu tldr.length !== 5 hoặc walkthrough.length !== 8 (index mismatch).
 *   - findOneAndUpdate trigger post-hook → Meilisearch auto-sync.
 *
 * Run:
 *   node --env-file=.env.development \
 *     plans/dattqh/260424-0922-osi-think-depth-upgrade/scripts/update-osi-lab-think-depth.js
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMongo, disconnectMongo } from '../../../../server/db/mongo-client.js';
import { Lab } from '../../../../server/db/models/index.js';

const SLUG = 'tcp-ip-packet-journey';
const EXPECTED_TLDR_LEN = 5;
const EXPECTED_WALKTHROUGH_LEN = 8;

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_PATH = join(__dirname, 'backup-osi-lab-pre-update.json');

// ── Content §4.1 misconceptions × 4 ─────────────────────────────────────────────

const MISCONCEPTIONS = [
  {
    wrong: 'TCP/IP có 4 tầng vì thế giới đã bỏ OSI 7 tầng.',
    right:
      'OSI (<a href="https://www.iso.org/standard/20269.html">ISO/IEC 7498-1</a>) là reference model dùng để phân tích/giảng dạy; TCP/IP (<a href="https://datatracker.ietf.org/doc/html/rfc1122#section-1.1.3">RFC 1122</a>) là implementation thực tế trên internet. Hai mô hình co-exist, không thay thế nhau. Vendor docs (Cisco, AWS, Kubernetes) vẫn dùng OSI terminology: "L7 firewall", "L4 load balancer", "L3 routing".',
    why: 'OSI Session/Presentation không có header riêng trong wire format TCP/IP — bị Application absorb vào một tầng. Đây là lý do TCP/IP "gộp 4 tầng" chứ không phải bỏ bớt. Khi debug AWS ALB (L7) vs NLB (L4), sự phân biệt OSI-based này là điều kiện cần để đọc docs đúng.',
  },
  {
    wrong: 'Layering chỉ là khái niệm giảng dạy, thực tế code mạng vẫn phải biết từ cable đến HTTP.',
    right:
      'Layering = separation of concerns ở mức protocol design. HTTP spec (<a href="https://datatracker.ietf.org/doc/html/rfc9110">RFC 9110</a>) không nhắc gì đến Ethernet hay WiFi — vì layering cho phép HTTP chạy trên mọi L2 (Ethernet, WiFi, 5G, Starlink, VPN tunnel) mà không sửa spec. Code ứng dụng chỉ gọi socket API (BSD sockets), kernel TCP/IP stack xử lý L2/L3/L4.',
    why: 'Giá trị cụ thể: khi đổi cable copper sang cáp quang, nginx không recompile. Khi client chuyển WiFi → 4G, TCP connection có thể giữ (với MPTCP) vì L4 không biết L2 đổi. Đây là invariant, không phải lý thuyết.',
  },
  {
    wrong: 'Ping thành công nghĩa là server hoạt động.',
    right:
      'Ping test L3 ICMP (<a href="https://datatracker.ietf.org/doc/html/rfc792">RFC 792</a>) — chỉ xác nhận gói IP đi tới được host và kernel reply được. Service thật chạy ở L7, cần test thêm L4 (TCP handshake tới port đúng) và L7 (HTTP response hợp lệ).',
    why: 'Firewall có thể allow ICMP mà block TCP :443. Host có thể up, kernel reply ICMP — nhưng nginx đã crash → client vẫn nhận 502 hoặc connection refused. Ping chỉ chứng minh L1-L3 OK, không nói gì về L4-L7.',
  },
  {
    wrong: 'Encapsulation order có thể thay đổi tùy protocol (ví dụ HTTPS "bỏ qua" TCP).',
    right:
      'Encap order cuối cùng LUÔN kết thúc ở L2 Link vì bit phải ra NIC → cable/WiFi với frame boundary + MAC. HTTPS không "bỏ qua" TCP — TLS nằm giữa TCP và HTTP, giữ nguyên L4 port demux. Tunnel (VPN, WireGuard, GRE) chỉ là thêm 1 lớp encap ngoài, không skip tầng nào.',
    why: 'Constraint vật lý: NIC chỉ biết parse Ethernet frame theo <a href="https://standards.ieee.org/ieee/802.3/">IEEE 802.3</a>, không biết IP. Nếu order biến mất → NIC không biết frame bắt đầu/kết thúc ở đâu. Hiểu invariant này → khi thấy packet capture lạ (VXLAN, GENEVE), biết ngay đó là tunnel overlay, không phải "giao thức thay thế TCP/IP".',
  },
];

// ── Content §4.2 tldr.why × 5 rows ──────────────────────────────────────────────
// Index matches existing tldr array order. Verify via backup print before commit.

const TLDR_WHY_BY_INDEX = [
  // Row 0: OSI 7 vs TCP/IP 4
  'OSI (<a href="https://www.iso.org/standard/20269.html">ISO/IEC 7498-1</a>) định nghĩa 7 tầng reference: Physical → Data Link → Network → Transport → Session → Presentation → Application. TCP/IP (<a href="https://datatracker.ietf.org/doc/html/rfc1122#section-1.1.3">RFC 1122 §1.1.3</a>) gom lại còn 4 tầng implementation thực: Link (L1+L2 OSI) → Internet (L3) → Transport (L4) → Application (L5+L6+L7 OSI).\n\nSự khác nhau không phải "bỏ bớt 3 tầng" mà là wire format: TCP/IP không có header riêng cho Session (L5) và Presentation (L6). Chức năng L5 (session control) do app tự làm qua cookie/JWT/WebSocket. Chức năng L6 (encoding, compression) do TLS (<a href="https://datatracker.ietf.org/doc/html/rfc8446">RFC 8446</a>) và Content-Encoding (<a href="https://datatracker.ietf.org/doc/html/rfc9110#section-8.4">RFC 9110 §8.4</a>) xử lý bên trong L7. OSI ra đời như chuẩn ISO (1984) sau khi ARPANET đã deploy TCP/IP (1983), dẫn tới TCP/IP thành de-facto stack trong implementation; OSI giữ vai trò reference/pedagogy trong docs + vendor terminology.\n\nHiểu mapping này: khi đọc "L7 firewall" (AWS WAF), "L4 load balancer" (AWS NLB), "L3 routing" (iptables) — vendor dùng OSI numbering. Hiểu sai → map nhầm feature khi so sánh dịch vụ.',

  // Row 1: L4 Application (TCP/IP) = OSI L5-L7
  'Application layer (<a href="https://datatracker.ietf.org/doc/html/rfc1122#section-4">RFC 1122 §4</a>) là nơi process userspace "phát biểu" qua socket API — HTTP request, DNS query, SSH command. Input: byte stream từ Transport (TCP) hoặc datagram (UDP). Output: semantic message theo protocol cụ thể (HTTP/1.1 text, HTTP/2 binary frames, DNS binary — <a href="https://datatracker.ietf.org/doc/html/rfc1035#section-4">RFC 1035 §4</a>).\n\nTầng này che giấu gì cho dev: không che giấu gì khác — mọi thứ dưới L4 đã abstract qua socket API. App không biết packet loss, reorder, fragmentation; TCP stack đã xử lý. Lỗi ở tầng này là semantic: 400 (client format sai), 500 (server logic sai), 502 (upstream không phản hồi đúng) — không phải lỗi mạng.\n\nHiểu điều này: khi curl báo 502, không phải "mạng hỏng" — là nginx upstream (another app) fail. Check <code>journalctl -u nginx</code>, <code>docker logs</code>, không phải restart router.',

  // Row 2: L3 Transport (TCP/IP) = OSI L4
  'Transport layer (<a href="https://datatracker.ietf.org/doc/html/rfc1122#section-4">RFC 1122 §4</a>) nhận IP packet từ Internet layer, demux về socket dựa trên 4-tuple (srcIP, srcPort, dstIP, dstPort) — <a href="https://datatracker.ietf.org/doc/html/rfc793#section-2.7">RFC 793 §2.7</a>. PORT 16-bit là cơ chế duy nhất cho phép 1 host chạy nhiều process cùng local IP; không có port → 1 IP chỉ chạy được 1 service.\n\nTCP (<a href="https://datatracker.ietf.org/doc/html/rfc9293">RFC 9293</a>) thêm 3 đảm bảo mà IP không có: ordering (sequence number + reorder buffer), reliability (cumulative ACK + retransmit theo <a href="https://datatracker.ietf.org/doc/html/rfc6298">RFC 6298</a>), congestion control (<a href="https://datatracker.ietf.org/doc/html/rfc5681">RFC 5681</a> — slow start, AIMD). UDP (<a href="https://datatracker.ietf.org/doc/html/rfc768">RFC 768</a>) bỏ hết — chỉ giữ demux port + checksum 16-bit, latency 0 ms buffering.\n\nTransport che giấu packet loss/reorder cho L4 Application — nginx không viết code retransmit, kernel TCP stack làm. Hiểu điều này → curl timeout: tcpdump xem TCP handshake fail ở SYN (firewall chặn) hay SYN-ACK (server không reply) hay application không <code>accept()</code>.',

  // Row 3: L2 Internet (TCP/IP) = OSI L3
  'Internet layer (<a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3">RFC 1122 §3</a>) nhận segment từ Transport, đóng gói thành IP packet với header 20 bytes (<a href="https://datatracker.ietf.org/doc/html/rfc791#section-3.1">RFC 791 §3.1</a>): Source IP, Destination IP, TTL, Protocol number (6=TCP, 17=UDP, 1=ICMP). Gửi cho L1 Link để forward qua router dựa trên Destination IP + routing table.\n\nTầng này che giấu topology mạng cho Transport: L4 không biết packet đi qua bao nhiêu router, WAN/LAN/VPN. TTL (<a href="https://datatracker.ietf.org/doc/html/rfc791#section-3.2">RFC 791 §3.2</a>) giảm 1 tại mỗi router — chống loop vô tận, và là cơ chế traceroute exploit để xem từng hop. Routing layer (BGP ở internet, OSPF trong AS) không thuộc IP spec — là control plane riêng.\n\nInternet layer là nơi "liên mạng" xảy ra — tên "Internet" = inter-network. Hiểu: khi "không ra mạng", check theo thứ tự — <code>ip route</code> (default route có không?) → <code>ping 8.8.8.8</code> (L3 OK?) → <code>ping google.com</code> (DNS OK?). Nếu ping IP được nhưng domain không, là L7 DNS fail, không phải L3.',

  // Row 4: L1 Link (TCP/IP) = OSI L1-L2
  'Link layer (<a href="https://datatracker.ietf.org/doc/html/rfc1122#section-2">RFC 1122 §2</a>) gom L1 Physical + L2 Data Link của OSI. Input: IP packet từ Internet layer. Output: bit stream ra NIC theo chuẩn vật lý (<a href="https://standards.ieee.org/ieee/802.3/">IEEE 802.3</a> Ethernet, IEEE 802.11 WiFi). Đóng gói thành frame với destination MAC + source MAC + FCS (frame check sequence) trước khi transmit.\n\nTầng này dùng MAC address (48-bit, IEEE 802) — địa chỉ phần cứng duy nhất của NIC. ARP (<a href="https://datatracker.ietf.org/doc/html/rfc826">RFC 826</a>) resolve IP → MAC trong cùng broadcast domain: host broadcast "Who has 192.168.1.1?", gateway reply kèm MAC. Chú ý: frame gửi tới server ở xa sẽ dùng MAC của next-hop gateway, không phải MAC server (server ở domain khác, không thể reach trực tiếp L2).\n\nLink layer che giấu medium vật lý cho Internet — IP không biết đang chạy trên copper Ethernet, cáp quang, WiFi, hay 5G. Cáp đứt/WiFi mất sóng → mọi tầng trên không forward được. Trên cloud VM, hypervisor + virtual switch quản tầng này — NIC driver, MTU mismatch (ví dụ AWS Jumbo Frames 9001 vs standard 1500), hoặc AWS security group (iptables-like, tác động L3/L4) vẫn có thể fail. Error surface thường là <code>Network Unreachable</code> (EHOSTUNREACH) hoặc <code>No route to host</code>.',
];

// ── Content §4.3 walkthrough.why × 8 steps ──────────────────────────────────────

const WALKTHROUGH_WHY_BY_INDEX = [
  // Step 0: DNS resolve
  'DNS (<a href="https://datatracker.ietf.org/doc/html/rfc1034">RFC 1034</a>, <a href="https://datatracker.ietf.org/doc/html/rfc1035">RFC 1035</a>) là pre-condition của mọi kết nối dùng hostname. Socket API nhận <code>char* "example.com"</code> qua <code>getaddrinfo()</code> — libc resolver đọc <code>/etc/nsswitch.conf</code>, query DNS server (thường UDP :53, fallback TCP :53 cho response >512 byte — <a href="https://datatracker.ietf.org/doc/html/rfc1035#section-4.2.1">RFC 1035 §4.2.1</a>), parse A record (IPv4) hoặc AAAA (IPv6).\n\nCơ chế recursive: stub resolver hỏi local DNS (ISP/router), local DNS hỏi root (13 root servers, <a href="https://datatracker.ietf.org/doc/html/rfc7720">RFC 7720</a>), root trả TLD (.com), TLD trả authoritative (example.com\'s NS), authoritative trả A record. Kết quả cache theo TTL của record. Response code phân loại lỗi (<a href="https://datatracker.ietf.org/doc/html/rfc1035#section-4.1.1">RFC 1035 §4.1.1</a>): NXDOMAIN (rcode=3, tên không tồn tại), SERVFAIL (rcode=2, authoritative fail), timeout (không reach được resolver).\n\nDNS không nằm trong packet journey của ping/curl sau khi resolve xong — nhưng là bước 0 bắt buộc. <code>Could not resolve host</code> LUÔN là DNS fail, không phải mạng. Nếu <code>dig example.com</code> từ VPS fail → <code>/etc/resolv.conf</code> sai hoặc firewall chặn UDP :53.',

  // Step 1: L7 Application — ping tạo ICMP echo request
  'Lệnh <code>ping</code> là userspace process gọi syscall <code>socket(AF_INET, SOCK_RAW, IPPROTO_ICMP)</code> — khác socket TCP (<code>SOCK_STREAM</code>) hoặc UDP (<code>SOCK_DGRAM</code>). ICMP (<a href="https://datatracker.ietf.org/doc/html/rfc792">RFC 792</a>) là protocol number 1, nằm trực tiếp trên IP — không có port khái niệm.\n\nKernel tạo ICMP echo request (type=8, code=0) với identifier + sequence number để match reply, payload thường là timestamp + pattern bytes (default 56 bytes data + 8 bytes ICMP header = 64 bytes). Gửi xuống Internet layer. Trên Linux, cần <code>CAP_NET_RAW</code> hoặc sysctl <code>net.ipv4.ping_group_range</code> cho user không-root chạy ping.\n\nICMP ở L3 (Internet layer) chứ không phải L4 (Transport). CLI/UI thường xếp <code>ping</code> cạnh <code>nc</code>/<code>curl</code> — là quy ước tool, không phản ánh vị trí trong stack. Hệ quả: ping pass không kéo theo TCP :80 pass — firewall có thể allow ICMP, block TCP (hoặc ngược lại).',

  // Step 2: L3 Internet — đóng gói IP header
  'Kernel gắn IP header 20 bytes (<a href="https://datatracker.ietf.org/doc/html/rfc791#section-3.1">RFC 791 §3.1</a>) quanh ICMP payload. Các field quan trọng: Source IP (địa chỉ outbound của interface được chọn bởi routing table), Destination IP (93.184.216.34 từ DNS), Protocol=1 (ICMP), TTL=64 (Linux default, <a href="https://datatracker.ietf.org/doc/html/rfc1122#section-3.2.1.7">RFC 1122 §3.2.1.7</a> khuyến nghị 64), Header Checksum (<a href="https://datatracker.ietf.org/doc/html/rfc1071">RFC 1071</a>).\n\nTTL giảm 1 tại mỗi router (<a href="https://datatracker.ietf.org/doc/html/rfc791#section-3.2">RFC 791 §3.2</a>) — khi TTL=0, router drop packet và gửi ICMP Time Exceeded (type=11) về sender. Đây là nguyên lý traceroute khai thác: gửi packet với TTL=1, 2, 3... để nhận Time Exceeded từ từng hop. Packet fragment nếu size > MTU của path (<a href="https://datatracker.ietf.org/doc/html/rfc791#section-3.2">RFC 791 §3.2</a>); Linux kernel enable Path MTU Discovery mặc định (sysctl <code>net.ipv4.ip_no_pmtu_disc=0</code>, <a href="https://datatracker.ietf.org/doc/html/rfc1191">RFC 1191</a>) để set DF bit và avoid fragment.\n\nHiểu IP header → biết debug: trace Source IP bị NAT đổi khi qua router public (router thay Source IP thành IP public của nó, server thấy IP NAT box, không thấy IP private của client). Hiểu sai IP private (<a href="https://datatracker.ietf.org/doc/html/rfc1918">RFC 1918</a>: 10/8, 172.16/12, 192.168/16) vs public → cấu hình firewall sai.',

  // Step 3: L2 Link — đóng Ethernet frame + ARP resolve MAC
  'Kernel tra routing table (<code>ip route</code>) để quyết định next-hop: server 93.184.216.34 không ở LAN → gửi qua default gateway (ví dụ 192.168.1.1). Cần MAC của gateway để đóng Ethernet frame. Kernel check ARP cache (<code>ip neigh</code>) — nếu miss, trigger ARP request.\n\nARP (<a href="https://datatracker.ietf.org/doc/html/rfc826">RFC 826</a>): host broadcast frame L2 (destination MAC = FF:FF:FF:FF:FF:FF) với query "Who has 192.168.1.1? Tell 192.168.1.10". Tất cả host trong broadcast domain nhận, chỉ gateway (192.168.1.1) reply với ARP response kèm MAC của nó. Kernel cache pair (IP, MAC) trong ARP table ~30s-1h tùy OS, sau đó refresh.\n\nEthernet frame (<a href="https://standards.ieee.org/ieee/802.3/">IEEE 802.3</a>): destination MAC = MAC gateway, source MAC = MAC NIC, EtherType = 0x0800 (IPv4), payload = toàn bộ IP packet, FCS (CRC-32) cuối frame. Destination MAC LUÔN là MAC next-hop, không phải MAC server cuối cùng — nhầm điều này dẫn tới đọc sai packet capture trên Wireshark. ARP poisoning là attack class trong LAN: attacker gửi ARP reply giả claim MAC của mình cho IP gateway → host gửi traffic tới MAC attacker = MITM (<a href="https://capec.mitre.org/data/definitions/141.html">CAPEC-141 ARP Spoofing</a>).',

  // Step 4: Router forwarding
  'Router nhận frame → check destination MAC (đúng của router) → decap Ethernet (bóc L2 header + FCS) → lấy IP packet → check destination IP → tra routing table (longest prefix match, <a href="https://datatracker.ietf.org/doc/html/rfc1812#section-5.2">RFC 1812 §5.2</a>). Route entry trỏ tới outgoing interface + next-hop IP. Router decrement TTL -1, recompute IP header checksum (<a href="https://datatracker.ietf.org/doc/html/rfc1071">RFC 1071</a>).\n\nRouter resolve MAC của next-hop qua ARP (nếu chưa cache), đóng Ethernet frame MỚI với destination MAC = MAC next-hop, source MAC = MAC outgoing interface. Gửi ra NIC. Lặp lại tại mỗi router trên path tới mạng server — số hop verify trực tiếp bằng <code>traceroute</code> hoặc <code>mtr</code> từ client cụ thể.\n\nĐiểm mấu chốt: IP header không đổi qua router (trừ TTL + checksum), Ethernet header bị TẠO LẠI tại mỗi hop — vì MAC chỉ có ý nghĩa trong 1 broadcast domain. Hiểu điều này → traceroute hiển thị IP (L3) không phải MAC (L2), và <code>ping -r</code> record route options hiển thị IP của router, không phải MAC.',

  // Step 5: Server stack — decap Link → Internet → kernel reply ICMP
  'Server example.com nhận frame → check destination MAC (đúng của NIC server) → decap Ethernet → đọc IP header → check destination IP (đúng của server) → đọc Protocol field = 1 (ICMP) → pass lên ICMP handler trong kernel. Không có process userspace nào được invoke.\n\nKernel ICMP handler (<a href="https://datatracker.ietf.org/doc/html/rfc792">RFC 792 §Echo</a>) nhận echo request (type=8), tạo echo reply (type=0) với identical identifier + sequence number + payload, swap source/destination IP, gửi xuống IP layer. Reply đi ngược về client qua routing table của server, có thể KHÁC path đi (asymmetric routing). Firewall stateless không track pair request↔reply → drop reply nếu path reply đi qua interface khác path request — cần stateful firewall (conntrack trên Linux netfilter) để handle.\n\nVì kernel tự reply, không cần app chạy → ping hoạt động ngay cả khi nginx/ssh/mysql đều down, chỉ cần kernel còn sống. Hệ quả debug: ping thành công chỉ chứng minh host + kernel OK, không chứng minh service. Để verify service, phải test L4 (<code>nc -vz host port</code>) và L7 (<code>curl</code>, protocol command).',

  // Step 6: Reply ngược — ping đọc RTT
  'Kernel client nhận ICMP echo reply, match identifier + sequence với request đã gửi, tính RTT = timestamp nhận − timestamp gửi (timestamp nằm trong payload do kernel nhúng khi gửi). Tăng statistics (<code>packets_received++</code>), pass event lên userspace process <code>ping</code> qua <code>recvmsg()</code>.\n\n<code>ping</code> in <code>64 bytes from 93.184.216.34: icmp_seq=1 ttl=54 time=12.3 ms</code>. Các field: <code>64 bytes</code> = ICMP + payload (không tính IP header), <code>ttl=54</code> = TTL còn lại khi tới client (nếu server gửi TTL=64 → đã qua 10 hop), <code>time=12.3 ms</code> = RTT đi + về.\n\nHai metric quan trọng nhất: packet loss % (sau N packet, bao nhiêu không reply — 1-2% loss làm TCP throughput giảm do retransmit window collapse, <a href="https://datatracker.ietf.org/doc/html/rfc5681#section-3.1">RFC 5681 §3.1</a>) và jitter (biến thiên RTT — jitter > 30 ms gây audio/video codec buffer underrun trong realtime app: VoIP, video call, game). Ping IP cùng LAN (<1 ms expected) verify L1-L3 local; ping IP khác AS (<200 ms intercontinental fiber) verify WAN path.',

  // Step 7: Insight — curl fail dù ping OK
  'Đây là test case tổng hợp toàn bộ stack: <code>ping</code> test L3 (ICMP echo), <code>curl</code>/browser test L3 + L4 + L7. Ping thành công chứng minh L1→L3 OK, kernel server reply được. Curl cần thêm:\n\nL4 Transport (TCP, <a href="https://datatracker.ietf.org/doc/html/rfc9293">RFC 9293</a>): 3-way handshake tới port 80/443 — SYN, SYN-ACK, ACK. Firewall chặn port → "connection timeout" (SYN không nhận SYN-ACK). Host up nhưng không process nào listen port → "connection refused" (kernel reply TCP RST). L7 Application (HTTP, <a href="https://datatracker.ietf.org/doc/html/rfc9110">RFC 9110</a>): nginx/app nhận TCP byte stream, parse HTTP request, trả response. Nginx upstream fail → 502; app crash → 500; client format sai → 400.\n\nHiểu separation này đổi workflow debug hoàn toàn: từ "server không vào được" (vague) → "test từng layer": <code>ping</code> (L3) → <code>nc -vz host 443</code> (L4 + port open?) → <code>curl -v</code> (L7 + HTTP valid?). Biết layer nào fail → biết tool nào để observe (<code>tcpdump</code> cho L3-L4, <code>journalctl</code>/access log cho L7).',
];

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  await connectMongo();

  // Step 1: Fetch current doc
  const current = await Lab.findOne({ slug: SLUG }).lean();
  if (!current) {
    throw new Error(`Lab slug=${SLUG} not found — abort`);
  }

  // Step 2: Sanity-check array lengths
  if (!Array.isArray(current.tldr) || current.tldr.length !== EXPECTED_TLDR_LEN) {
    throw new Error(
      `tldr.length mismatch: expected ${EXPECTED_TLDR_LEN}, got ${current.tldr?.length} — abort`,
    );
  }
  if (
    !Array.isArray(current.walkthrough) ||
    current.walkthrough.length !== EXPECTED_WALKTHROUGH_LEN
  ) {
    throw new Error(
      `walkthrough.length mismatch: expected ${EXPECTED_WALKTHROUGH_LEN}, got ${current.walkthrough?.length} — abort`,
    );
  }

  console.log(`[osi-update] slug=${SLUG}`);
  console.log(`[osi-update] db=${current._id ? 'connected' : 'unknown'}`);
  console.log(`[osi-update] tldr.length=${current.tldr.length}`);
  console.log(`[osi-update] walkthrough.length=${current.walkthrough.length}`);
  console.log(
    `[osi-update] misconceptions.current=${Array.isArray(current.misconceptions) ? current.misconceptions.length : 'FIELD_MISSING'}`,
  );
  console.log(`[osi-update] contentHash.current=${current.contentHash}`);

  // Step 3: Backup
  const backup = {
    slug: current.slug,
    tldr: current.tldr,
    walkthrough: current.walkthrough,
    misconceptions: current.misconceptions ?? null,
    contentHash: current.contentHash,
    updatedAt: current.updatedAt,
  };
  writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`[osi-update] backup saved → ${BACKUP_PATH}`);

  // Step 4: Build patched arrays (deep clone, mutate only .why)
  const nextTldr = current.tldr.map((row, idx) => ({
    ...row,
    why: TLDR_WHY_BY_INDEX[idx],
  }));
  const nextWalkthrough = current.walkthrough.map((step, idx) => ({
    ...step,
    why: WALKTHROUGH_WHY_BY_INDEX[idx],
  }));

  // Step 5: Apply update — trigger Mongoose post-hook → Meili auto-sync
  const newContentHash = new Date().toISOString();
  await Lab.findOneAndUpdate(
    { slug: SLUG },
    {
      $set: {
        tldr: nextTldr,
        walkthrough: nextWalkthrough,
        misconceptions: MISCONCEPTIONS,
        contentHash: newContentHash,
      },
    },
    { new: true },
  );

  // Step 6: Verify
  const fresh = await Lab.findOne({ slug: SLUG }).lean();
  console.log('');
  console.log('[osi-update] ───── VERIFY ─────');
  console.log(`[osi-update] misconceptions.length=${fresh.misconceptions.length} (expect 4)`);
  console.log(`[osi-update] contentHash.new=${fresh.contentHash}`);
  console.log(`[osi-update] tldr[0].why[0..80]=${fresh.tldr[0].why.slice(0, 80)}…`);
  console.log(
    `[osi-update] walkthrough[0].why[0..80]=${fresh.walkthrough[0].why.slice(0, 80)}…`,
  );
  console.log(
    `[osi-update] misconceptions[0].wrong=${fresh.misconceptions[0].wrong.slice(0, 60)}…`,
  );

  if (fresh.misconceptions.length !== 4) {
    throw new Error('Verify failed: misconceptions.length !== 4');
  }
  if (fresh.contentHash !== newContentHash) {
    throw new Error('Verify failed: contentHash mismatch');
  }

  console.log('[osi-update] ✓ DONE');
}

main()
  .then(() => disconnectMongo())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[osi-update] ERROR:', err);
    await disconnectMongo().catch(() => {});
    process.exit(1);
  });
