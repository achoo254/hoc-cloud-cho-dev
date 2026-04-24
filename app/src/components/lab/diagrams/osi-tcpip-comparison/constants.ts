/**
 * OSI ↔ TCP/IP comparison data — single source of truth cho 2 diagrams.
 *
 * Dùng chung bởi `three-column-mapping.tsx` (Image #3) và
 * `osi-seven-layer.tsx` (Image #4). Không phụ thuộc vào content MongoDB —
 * đây là kiến thức chuẩn (ISO/IEC 7498-1 + RFC 1122).
 */

export interface OsiLayer {
  num: number // 1..7
  name: string
  pdu: string // "Data" / "Segments" / "Packets" / "Frames" / "Bits"
  shortDesc: string // One-liner (~40 chars) — render trong SVG row của diagram 2
  desc: string // Mô tả đầy đủ cho info panel
  details: string[] // Bullet points dev-oriented: headers, tools, pitfalls
  color: string // Tailwind bg utility (render qua attr, dùng inline fill)
  fill: string // Hex fill cho SVG rect
  text: string // Hex text color
}

export interface TcpIpLayer {
  name: string
  osiNums: number[] // Mapping tới OSI layers (vd Application → [7,6,5])
  fill: string
  text: string
  desc: string // Mô tả ngắn để tooltip
  role: string // Vai trò chính (encapsulation / PDU)
  details: string[] // Bullet points dev-oriented
}

// OSI 7 layers — thứ tự từ L7 (top/Application) xuống L1 (bottom/Physical).
// PDU/desc bám sát Image #4 + chuẩn ISO 7498-1.
export const OSI_LAYERS: OsiLayer[] = [
  {
    num: 7,
    name: 'Application',
    pdu: 'Data',
    shortDesc: 'Network Process to Application',
    desc: 'Tầng giao tiếp trực tiếp với end-user application. API calls, request/response, URL routing đều ở đây.',
    details: [
      'Giao thức phổ biến: HTTP/HTTPS, gRPC, WebSocket, SMTP, DNS, SSH, FTP, MQTT.',
      'Dev work hằng ngày: viết handler cho endpoint, parse header/body, validate input, serialize JSON, serve file.',
      'Tools debug: Postman, `curl -v`, browser DevTools Network tab, Wireshark filter `http`/`dns`.',
      'Thứ dev "thấy": URL path, HTTP method, headers (Authorization, Content-Type, Cookie), status code, response body.',
    ],
    color: 'emerald',
    fill: '#10b981', // emerald-500
    text: '#065f46',
  },
  {
    num: 6,
    name: 'Presentation',
    pdu: 'Data',
    shortDesc: 'Data Representation and Encryption',
    desc: 'Chuẩn hoá format dữ liệu giữa hệ thống có encoding/representation khác nhau: encoding, compression, encryption.',
    details: [
      'Việc chính: character encoding (ASCII, UTF-8, UTF-16), compression (gzip/deflate/brotli), mã hoá (TLS/SSL).',
      'Modern view: serialization (JSON, XML, Protobuf, MessagePack) có thể coi như "presentation" hiện đại — thống nhất data shape giữa client/server dùng ngôn ngữ khác nhau.',
      'Dev gặp qua: `Content-Type`, `Content-Encoding: gzip`, TLS handshake + cert validation, base64 encode, Unicode bugs (mojibake), byte order (endianness).',
      'Trong mô hình TCP/IP: L6 bị gộp vào Application → nên gọi "tầng 6" ít phổ biến khi nói về stack thực tế.',
    ],
    color: 'emerald',
    fill: '#34d399', // emerald-400
    text: '#064e3b',
  },
  {
    num: 5,
    name: 'Session',
    pdu: 'Data',
    shortDesc: 'Interhost Communication',
    desc: 'Establish, maintain, terminate "phiên" giữa 2 end. Checkpointing, recovery, synchronization.',
    details: [
      'Hầu hết giao thức modern không có L5 riêng — session thường build trên L7 (cookies, JWT, WebSocket keep-alive, OAuth token).',
      'Ví dụ lịch sử: NetBIOS, RPC, SOCKS proxy, NFS session.',
      'Dev gặp qua: session ID trong cookie, `Set-Cookie`, CSRF token, WebSocket ping/pong, gRPC stream keep-alive.',
      'Trong TCP/IP: L5 gộp vào Application → model 4 tầng phản ánh đúng thực tế hiện nay (không ai tách session riêng).',
    ],
    color: 'emerald',
    fill: '#6ee7b7', // emerald-300
    text: '#064e3b',
  },
  {
    num: 4,
    name: 'Transport',
    pdu: 'Segments',
    shortDesc: 'End-to-End Connections and Reliability',
    desc: 'End-to-end delivery giữa 2 process (không phải 2 host) qua port numbers. TCP reliable, UDP fast-but-unreliable.',
    details: [
      'TCP: 3-way handshake (SYN → SYN-ACK → ACK), ACK cho mỗi byte, retransmit nếu timeout, sliding window flow control, congestion control (Reno/Cubic/BBR).',
      'UDP: stateless, unreliable, unordered. Header chỉ 8 bytes (TCP = 20+). App tự xử lý loss/order nếu cần.',
      'Code: `socket()`, `bind(port)`, `listen()`, `accept()` → tất cả là API của L4.',
      'Tools: `ss -tan` (socket state), `netstat -tlnp`, `lsof -i :8080`, `tcpdump -i any port 443`.',
      'Head-of-line blocking của TCP: 1 packet loss → block cả stream. HTTP/3 dùng QUIC/UDP để fix.',
    ],
    color: 'lime',
    fill: '#bef264', // lime-300
    text: '#365314',
  },
  {
    num: 3,
    name: 'Network',
    pdu: 'Packets',
    shortDesc: 'Path Determination and IP (Logical Addressing)',
    desc: 'Routing giữa nhiều network dựa trên IP address. Mỗi router quyết định next-hop từ routing table.',
    details: [
      'IPv4 header tối thiểu 20 bytes: src/dst IP, TTL, protocol (TCP=6, UDP=17, ICMP=1), checksum.',
      'TTL giảm mỗi hop, =0 thì drop + gửi ICMP Time Exceeded về sender → cơ chế traceroute.',
      'Giao thức: IP (v4/v6), ICMP (error + diagnostics), IGMP (multicast), routing protocols (BGP, OSPF, RIP).',
      'Tools: `traceroute`, `mtr`, `ip route show`, `ip addr`, `tcpdump -i eth0 icmp`.',
      'Fragmentation: IPv4 có thể cắt packet khi MTU giảm; IPv6 bỏ feature này → sender phải Path MTU Discovery.',
    ],
    color: 'yellow',
    fill: '#fde047', // yellow-300
    text: '#713f12',
  },
  {
    num: 2,
    name: 'Data Link',
    pdu: 'Frames',
    shortDesc: 'MAC and LLC (Physical Addressing)',
    desc: 'Frame hoá dữ liệu với MAC addressing + error detection, điều phối medium access. Scope = 1 local segment.',
    details: [
      'Ethernet frame: MAC dest (6B) + MAC src (6B) + EtherType (0x0800=IPv4, 0x86DD=IPv6, 0x0806=ARP) + payload + FCS checksum.',
      'Switch học MAC table → forward frame đúng port, không broadcast mỗi lần như hub.',
      'Khái niệm: ARP (map IP → MAC), VLAN tag 802.1Q, broadcast domain, spanning tree (chống loop).',
      'Tools: `tcpdump -e` (hiện MAC), `arp -a`, `ip neigh`, `bridge fdb show`.',
      'Debug phổ biến: ARP spoofing, MAC flapping, duplicate MAC, VLAN trunking mis-config.',
    ],
    color: 'orange',
    fill: '#fb923c', // orange-400
    text: '#7c2d12',
  },
  {
    num: 1,
    name: 'Physical',
    pdu: 'Bits',
    shortDesc: 'Media, Signal, and Binary Transmission',
    desc: 'Biến bits thành tín hiệu: điện (copper), ánh sáng (fiber), sóng radio (WiFi, 5G).',
    details: [
      'Specs: chuẩn cáp (Cat5e/Cat6/Cat7), connector (RJ45, SFP, QSFP), voltage levels, modulation (QAM, OFDM), encoding (NRZ, PAM4).',
      'Dev ít touch trực tiếp — nhưng ảnh hưởng latency + throughput. Fiber ~5 μs/km, copper ~5 ns/m, WiFi có jitter cao hơn Ethernet.',
      'Tốc độ: 10M → 100M → 1G → 10G → 40G → 100G → 400G (và tiếp tục tăng).',
      'Tools: `ethtool eth0` (link speed, duplex, auto-neg), `iwconfig`/`iw dev` (WiFi), `mii-tool`.',
      'Debug: cáp lỏng, negotiation sai (half vs full duplex → CRC errors + collision), signal loss trên fiber.',
    ],
    color: 'red',
    fill: '#f87171', // red-400
    text: '#7f1d1d',
  },
]

// TCP/IP 4 layers — top (Application) xuống bottom (Network Interface).
// Tên theo RFC 1122. "Network Interface" = "Network Access" (cùng tầng, 2 tên).
export const TCPIP_LAYERS: TcpIpLayer[] = [
  {
    name: 'Application',
    osiNums: [7, 6, 5],
    fill: '#a7f3d0', // emerald-200
    text: '#064e3b',
    desc: 'Gộp 3 tầng OSI (Session/Presentation/Application). Nơi dev code 90% thời gian — API, serialization, encryption, session đều nằm ở đây.',
    role: 'PDU: Data. Interface giữa user application và mạng.',
    details: [
      'Framework abstraction (Express, Fastify, Spring, Django, Rails, gRPC server) đều operate ở tầng này.',
      'Bao gồm cả TLS (L6 trong OSI) và session management qua JWT/cookie (L5 trong OSI) — TCP/IP gộp lại cho gọn vì trong thực tế không ai tách riêng.',
      'Giao thức phổ biến: HTTP/HTTPS, gRPC, WebSocket, SMTP/IMAP, DNS, SSH, FTP, MQTT, AMQP.',
      'Tools: Postman, `curl -v`, browser DevTools, Wireshark filter `http`/`dns`/`tls`.',
    ],
  },
  {
    name: 'Transport',
    osiNums: [4],
    fill: '#d9f99d', // lime-200
    text: '#365314',
    desc: 'Tương đương OSI L4. Port-based multiplexing giữa nhiều process trên cùng host. TCP reliable, UDP fast.',
    role: 'PDU: Segments (TCP) / Datagrams (UDP). Port-based multiplexing.',
    details: [
      'TCP dùng khi cần reliability: HTTP/HTTPS (trừ HTTP/3), database connection, SSH, email, Git-over-SSH.',
      'UDP dùng khi ưu tiên speed/low-latency: DNS queries, VoIP/video call, game realtime, QUIC (HTTP/3 chạy trên UDP + reliability riêng).',
      'Port numbers (16-bit): 0-1023 well-known (cần root để bind trên Unix), 1024-49151 registered, 49152-65535 ephemeral.',
      'Khi code `listen(8080)` hoặc `fetch("...")` → runtime làm việc với TCP/UDP socket ở tầng này.',
    ],
  },
  {
    name: 'Internet',
    osiNums: [3],
    fill: '#fef08a', // yellow-200
    text: '#713f12',
    desc: 'Tương đương OSI L3. Best-effort routing — không đảm bảo delivery/order/integrity → TCP ở trên bù lại.',
    role: 'PDU: Packets. Best-effort delivery qua nhiều hop.',
    details: [
      'IPv4 (32-bit, ~4.3B address — đã cạn) vs IPv6 (128-bit, gần như vô hạn). Dev modern nên hỗ trợ cả 2.',
      'NAT: home router dịch private IP (10.x, 172.16-31.x, 192.168.x — RFC 1918) ↔ public IP → cách sống sót của IPv4.',
      'CIDR notation (192.168.1.0/24): /24 = 24 bit network + 8 bit host = 256 địa chỉ.',
      'Tools: `ip addr`, `ip route`, `traceroute`, `iptables`/`nftables` (Linux firewall), `tcpdump -n host 8.8.8.8`.',
      'Container: Docker bridge network, K8s CNI (Calico, Cilium) thao tác chủ yếu ở tầng này.',
    ],
  },
  {
    name: 'Network Interface',
    osiNums: [2, 1],
    fill: '#fed7aa', // orange-200
    text: '#7c2d12',
    desc: 'Gộp OSI L2+L1. NIC driver, switch, WiFi AP, cable — tất cả ở đây. MTU 1500 bytes mặc định.',
    role: 'PDU: Frames → Bits. Local delivery trong cùng segment.',
    details: [
      'Ethernet MTU 1500 bytes payload (frame ~1518 byte) quyết định max packet size upstream. Jumbo frames 9000 byte chỉ dùng trong datacenter.',
      'Virtualization: Docker `bridge`/`veth pair`, K8s CNI plugins, Linux network namespaces giả lập tầng này hoàn toàn bằng software.',
      'Tools: `ip link`, `ethtool`, `tcpdump -i eth0 -e` (hiện MAC), `bridge fdb show`, `iw dev` (WiFi).',
      'Dev ít code trực tiếp, nhưng khi debug network issue trong K8s/Docker — thường phải đi sâu xuống tầng này để hiểu veth, iptables rules, CNI routing.',
    ],
  },
]

// Protocols & Services — cột giữa của Diagram 1 (Image #3).
// Mỗi entry map tới 1 TCP/IP tier (index 0..3 tương ứng TCPIP_LAYERS).
export const PROTOCOL_GROUPS: string[][] = [
  ['HTTP', 'FTP', 'Telnet', 'NTP', 'DHCP', 'PING'], // Application
  ['TCP', 'UDP'], // Transport
  ['IP', 'ARP', 'ICMP', 'IGMP'], // Internet
  ['Ethernet'], // Network Interface
]

// Protocol info cho tooltip. Key = tên chip, value = {full, desc, port?, details?}.
export const PROTOCOL_INFO: Record<
  string,
  { full: string; desc: string; port?: string; details?: string[] }
> = {
  HTTP: {
    full: 'HyperText Transfer Protocol',
    desc: 'Nền tảng Web. Request/response model, stateless, text-based (HTTP/1.1) hoặc binary (HTTP/2, HTTP/3).',
    port: 'TCP/80 (HTTPS: TCP/443, HTTP/3: UDP/443)',
    details: [
      'Methods: GET (đọc, idempotent), POST (tạo/tác dụng phụ), PUT (thay thế, idempotent), PATCH (sửa 1 phần), DELETE, HEAD, OPTIONS (CORS preflight).',
      'Status codes: 2xx success, 3xx redirect (301 permanent vs 302 temp), 4xx client error (401 auth, 403 forbidden, 404 not found, 429 rate-limit), 5xx server error.',
      'HTTP/2: binary framing, multiplex nhiều request qua 1 TCP connection, header compression (HPACK). Vẫn bị TCP head-of-line blocking.',
      'HTTP/3: chạy trên QUIC/UDP để loại bỏ TCP HoL, built-in TLS 1.3, 0-RTT handshake.',
      'Headers quan trọng: `Content-Type`, `Authorization: Bearer ...`, `Cookie`/`Set-Cookie`, `Cache-Control`, CORS (`Origin`, `Access-Control-Allow-*`).',
    ],
  },
  FTP: {
    full: 'File Transfer Protocol',
    desc: 'Chuyển file giữa client và server. Có 2 channel: control (command) + data (file transfer).',
    port: 'TCP/21 (control), TCP/20 (active data)',
    details: [
      'Active mode: server chủ động connect ngược về client port → thường fail qua NAT/firewall.',
      'Passive mode (PASV): client mở cả 2 connection → chuẩn modern, pass qua NAT dễ hơn.',
      'SFTP ≠ FTPS: SFTP là subsystem của SSH (port 22, duy nhất 1 channel), FTPS = FTP truyền thống + TLS wrapper.',
      'Modern thay thế: SFTP, rsync over SSH, cloud storage API (S3, GCS).',
    ],
  },
  Telnet: {
    full: 'Teletype Network',
    desc: 'Remote terminal access. KHÔNG mã hoá kể cả password → cấm dùng production.',
    port: 'TCP/23',
    details: [
      'Dev vẫn dùng cho: test TCP port nhanh (`telnet host 80` rồi gõ `GET / HTTP/1.0`), debug SMTP/IMAP/Redis.',
      'Thay thế: SSH (encrypted remote shell), `nc`/`ncat` (test port flexible hơn), `tcping`, `curl -v` (cho HTTP).',
      'Legacy: một số network device cũ (switch, router đời đầu) chỉ có Telnet — nên dùng management VLAN cô lập.',
    ],
  },
  NTP: {
    full: 'Network Time Protocol',
    desc: 'Đồng bộ đồng hồ hệ thống qua mạng, chính xác tới milliseconds (LAN) hoặc chục ms (Internet).',
    port: 'UDP/123',
    details: [
      'Stratum hierarchy: 0 = atomic clock / GPS, 1 = server nối trực tiếp Stratum 0, tăng dần tới 15. Stratum 16 = unsynced.',
      'Dùng Marzullo\'s algorithm để chọn "correct" time từ nhiều peer, loại bỏ outliers.',
      'Clock skew gây nhiều bug: TLS cert validation fail ("certificate not yet valid"), JWT hết hạn sai thời điểm, log ordering sai giữa microservices, Kerberos auth reject.',
      'Modern: `chrony` (preferred), `ntpd`, `systemd-timesyncd`. Cloud instance thường có sẵn internal NTP pool.',
    ],
  },
  DHCP: {
    full: 'Dynamic Host Configuration Protocol',
    desc: 'Cấp phát động IP + subnet mask + gateway + DNS cho client khi join network.',
    port: 'UDP/67 (server), UDP/68 (client)',
    details: [
      'DORA sequence: Discover (client broadcast) → Offer (server đề xuất IP) → Request (client chọn) → Ack (server confirm).',
      'Client gửi broadcast 0.0.0.0 → 255.255.255.255 vì chưa có IP — DHCP phải chạy trước khi IP routing work.',
      'Lease time (vài giờ-ngày). Client renew ở 50% lease (T1); fail thì rebind ở 87.5% (T2); fail tiếp thì discover lại.',
      'Cấp thêm qua DHCP options: domain name, NTP server, TFTP boot, vendor-specific config.',
    ],
  },
  PING: {
    full: 'Packet Internet Groper',
    desc: 'Tool diagnostic dùng ICMP Echo Request/Reply để kiểm tra reachability + đo RTT + packet loss.',
    details: [
      'Host không trả ping ≠ "down" — có thể firewall drop ICMP. Thử TCP ping (`tcping`, `nc -zv host port`) trước khi kết luận.',
      'Flags hữu ích: `-c N` (count), `-i 0.2` (interval), `-s 1472` (payload size), `-M do` (Don\'t Fragment — test Path MTU).',
      'Đọc output: RTT min/avg/max/mdev. mdev cao = jitter — xấu cho voice/video. Packet loss > 1% = có vấn đề.',
      'Win vs Linux: Windows `ping` mặc định 4 packet rồi stop; Linux chạy vô hạn đến Ctrl+C.',
    ],
  },
  TCP: {
    full: 'Transmission Control Protocol',
    desc: 'Reliable, ordered, connection-oriented. 3-way handshake, retransmit, flow + congestion control.',
    details: [
      '3-way handshake: SYN → SYN-ACK → ACK. Mỗi connection định danh bằng 4-tuple (src_ip, src_port, dst_ip, dst_port).',
      'Reliability: ACK cho mỗi byte nhận được; sender retransmit nếu không nhận ACK trong RTO. Sliding window để flow control (receiver nói "còn bao nhiêu buffer").',
      'Congestion control: Reno → Cubic (default Linux) → BBR (Google, tối ưu throughput + RTT). Packet loss = congestion signal → sender giảm tốc.',
      'Head-of-line blocking: 1 packet mất → block cả stream chờ retransmit. HTTP/3 + QUIC giải quyết bằng cách chạy trên UDP.',
      'Tools: `ss -tan state established`, `tcpdump -i any "tcp[tcpflags] & (tcp-syn|tcp-fin) != 0"`, `netstat -s | grep -i tcp`.',
    ],
  },
  UDP: {
    full: 'User Datagram Protocol',
    desc: 'Connectionless, unreliable, unordered. Fast, low-overhead. Header chỉ 8 bytes so với TCP 20+ bytes.',
    details: [
      'Không handshake, không state — mỗi datagram độc lập. App tự xử lý loss/order nếu cần.',
      'Phù hợp: DNS query (retry đơn giản), VoIP/video (miss 1 frame còn hơn lag), game realtime, multicast (TCP không multicast được).',
      'QUIC = UDP + reliability + encryption + multiplexing do Google thiết kế → HTTP/3, gRPC over QUIC đều chạy trên UDP.',
      'Pitfall: UDP không có congestion control mặc định → app nặng UDP có thể "chiếm sóng" mạng. QUIC tự implement congestion control riêng.',
      'Tools: `nc -u host port`, `tcpdump -i any udp port 53`, `dig @8.8.8.8 example.com`.',
    ],
  },
  IP: {
    full: 'Internet Protocol',
    desc: 'Logical addressing + routing. Best-effort — không đảm bảo delivery, order, hay integrity payload.',
    details: [
      'IPv4 header tối thiểu 20 bytes: Version, TTL, Protocol (TCP=6, UDP=17, ICMP=1), src/dst IP, header checksum.',
      'TTL = "hop count" giảm mỗi router. Tới 0 → drop + gửi ICMP Time Exceeded → traceroute lợi dụng cơ chế này.',
      'CIDR: 192.168.1.0/24 nghĩa là 24 bit đầu là network, 8 bit cuối là host → 256 địa chỉ (2 dùng cho network + broadcast, 254 gán host).',
      'Private ranges (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Không route được ra Internet → cần NAT.',
      'IPv6 128-bit: không NAT, không fragment ở router, built-in IPsec, SLAAC auto-config.',
    ],
  },
  ARP: {
    full: 'Address Resolution Protocol',
    desc: 'Map IP → MAC trong cùng LAN. Host gửi broadcast "Who has 192.168.1.1?", owner trả lời với MAC.',
    details: [
      'ARP cache có timeout (phút đến vài giờ tuỳ OS). Stale entry gây gián đoạn khi host đổi NIC hoặc VM migrate.',
      'Attack phổ biến: ARP spoofing/poisoning — attacker trả lời ARP giả mạo gateway → MITM toàn bộ traffic.',
      'Gratuitous ARP: host tự announce "IP X là MAC tôi" — dùng khi failover (VRRP, keepalived) để update cache hàng xóm.',
      'IPv6 không dùng ARP — thay bằng NDP (Neighbor Discovery Protocol) dùng ICMPv6.',
      'Tools: `arp -a` (cross-platform), `ip neigh show` (Linux), `arping -D` (detect duplicate IP).',
    ],
  },
  ICMP: {
    full: 'Internet Control Message Protocol',
    desc: 'Error reporting + diagnostics cho IP. Không chở user data — chỉ metadata về delivery failure hoặc reachability.',
    details: [
      'Types chính: 0 Echo Reply, 3 Destination Unreachable (với codes 0-15 chi tiết), 8 Echo Request, 11 Time Exceeded (trace), 5 Redirect.',
      'Router drop toàn bộ ICMP = phá Path MTU Discovery → app thấy connection hang khi payload lớn ("works for small requests, fails for large").',
      'Khuyến nghị firewall: block ICMP bừa bãi KHÔNG tăng security. Cho phép ít nhất Type 3 (unreachable) + 11 (time exceeded) để TCP/IP hoạt động đúng.',
      'IPv6 yêu cầu ICMPv6 cho NDP, PMTU — không được block.',
      'Tools: `ping`, `traceroute`, `mtr`, `hping3`.',
    ],
  },
  IGMP: {
    full: 'Internet Group Management Protocol',
    desc: 'Quản lý thành viên nhóm multicast trên LAN. Router biết subnet nào cần nhận multicast stream.',
    details: [
      'Dùng cho IPv4 multicast (range 224.0.0.0/4). IPv6 thay bằng MLD (Multicast Listener Discovery) trên ICMPv6.',
      'Host gửi IGMP Join → router subscribe; gửi Leave → unsubscribe. Router chỉ forward multicast tới subnet có listener.',
      'Dev gặp khi: IPTV/streaming broadcast, service discovery (mDNS/Bonjour, SSDP cho UPnP), financial market data feed.',
      'Cloud: hầu hết cloud provider KHÔNG support multicast — cần overlay network (Tinc, nebula) nếu thực sự cần.',
    ],
  },
  Ethernet: {
    full: 'IEEE 802.3',
    desc: 'Chuẩn LAN phổ biến nhất. Frame format 14-byte header + payload + 4-byte FCS checksum.',
    details: [
      'Frame: MAC dest (6B) + MAC src (6B) + EtherType (2B) + payload (46-1500B) + FCS (4B) = tổng 64-1518 bytes.',
      'EtherType phổ biến: 0x0800 IPv4, 0x86DD IPv6, 0x0806 ARP, 0x8100 VLAN tag 802.1Q, 0x8847 MPLS.',
      'MTU mặc định 1500 bytes payload. Jumbo frames 9000 byte chỉ dùng trong datacenter (giảm CPU overhead khi throughput cao).',
      'Tốc độ: 10M (cổ) → 100M → 1G (phổ biến) → 10G (datacenter) → 25G/40G/100G/400G (spine switch, backbone). 400G chạy fiber.',
      'MAC address 48-bit: 24 bit đầu là OUI (vendor), 24 bit sau là device serial. Address đặc biệt: ff:ff:ff:ff:ff:ff broadcast.',
    ],
  },
}

// Bracket labels (Image #4): nhóm Host Layers (L7-L5) vs Media Layers (L4-L1),
// và Application Layer vs Data Flow Layer cho TCP/IP.
export const OSI_GROUPS = {
  host: { label: 'Host Layers', osiNums: [7, 6, 5] },
  media: { label: 'Media Layers', osiNums: [4, 3, 2, 1] },
} as const

export const TCPIP_GROUPS = {
  application: { label: 'Application Layer', tcpipIdx: [0] }, // Application
  dataFlow: { label: 'Data Flow Layer', tcpipIdx: [1, 2, 3] }, // Transport / Internet / Network Interface
} as const
