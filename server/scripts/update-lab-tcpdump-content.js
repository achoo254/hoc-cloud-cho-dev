/**
 * update-lab-tcpdump-content.js
 * Static content additions for tcpdump entries in icmp-ping and http labs.
 * Shapes follow Zod schema in app/src/lib/schema-lab.ts (source of truth).
 */

export const ICMP_ADDITIONS = {
  tryAtHome: [
    {
      cmd: 'tcpdump -i any -n icmp',
      why: 'Bắt mọi gói ICMP trên mọi interface, không resolve DNS (-n)',
      observeWith: 'Chạy `ping 8.8.8.8` ở terminal khác — quan sát cặp echo request/reply',
    },
    {
      cmd: 'tcpdump -i any -n -X icmp',
      why: 'Cờ -X in payload dạng hex+ASCII, thấy data ping kèm pattern timestamp',
      observeWith: 'So sánh bytes payload giữa request và reply — nội dung copy nguyên xi',
    },
    {
      cmd: "tcpdump -i any -n 'icmp and host 8.8.8.8'",
      why: 'Filter BPF combine: chỉ ICMP đi/đến 8.8.8.8 (giảm noise)',
      observeWith: 'Verify request → reply chạy đúng cặp, source/destination IP swap',
    },
  ],

  misconceptions: [
    {
      wrong: 'tcpdump tự bắt mọi interface',
      right: 'Mặc định chỉ 1 interface đầu (`tcpdump -D` để liệt kê); cần `-i any` để bắt tất cả',
      why: 'libpcap yêu cầu explicit interface; `any` là pseudo-device riêng của Linux, có thể không có trên macOS/BSD',
    },
    {
      wrong: 'tcpdump bắt được loopback ngay',
      right: 'Loopback cần `-i lo` hoặc `-i any`; `-i eth0` không thấy `ping 127.0.0.1`',
      why: 'Traffic loopback đi qua interface `lo` (kernel virtual), không qua NIC vật lý',
    },
  ],

  tldr: [
    {
      term: 'tcpdump',
      why: 'CLI sniffer chuẩn debug network Linux. Dùng BPF filter (`icmp`, `tcp port 80`, `host X`); cờ phổ biến: `-i` interface, `-n` no DNS, `-X` hex+ASCII, `-w` ghi pcap, `-r` đọc pcap. Output cột: timestamp/proto/src→dst',
      whyBreaks: 'Sai cờ `-i` → không thấy gói. Quên `-n` → DNS lookup mỗi packet làm chậm + nhiễu output. Permission denied → cần sudo hoặc setcap CAP_NET_RAW.',
    },
  ],

  walkthrough: [
    {
      step: 'tcpdump-1',
      what: 'Quan sát ping bằng tcpdump',
      why: 'Chạy `tcpdump -i any -n icmp` rồi `ping -c 1 8.8.8.8` ở terminal khác. Mapping cột tcpdump ↔ field IP/ICMP header (timestamp / src→dst / type echo request hoặc reply / id+seq).',
      observeWith: 'Đối chiếu cột id, seq giữa request và reply — phải khớp đôi một',
    },
  ],

  quiz: [
    {
      q: 'Filter BPF nào bắt được CẢ ICMP echo request và echo reply?',
      options: [
        'icmp',
        'icmp[icmptype] == 8',
        'icmp[icmptype] == 0',
        'host 8.8.8.8 and tcp',
      ],
      correct: 0,
      whyCorrect: '`icmp` không filter type → bắt tất cả gói ICMP (request type 8, reply type 0, lẫn các loại khác như unreachable).',
      whyWrong: {
        '1': '`icmptype == 8` chỉ request',
        '2': '`icmptype == 0` chỉ reply',
        '3': 'TCP filter, hoàn toàn không liên quan ICMP',
      },
    },
  ],

  flashcards: [
    {
      front: 'Cờ `-X` trong tcpdump làm gì?',
      back: 'In payload dạng hex + ASCII bên cạnh header summary, hữu ích để debug content rỗng/nhiễu/ASCII text.',
    },
  ],
};

export const HTTP_ADDITIONS = {
  tryAtHome: [
    {
      cmd: "tcpdump -i any -n -A 'tcp port 80'",
      why: '`-A` in payload ASCII → đọc HTTP request/response thô (chỉ áp dụng cho plaintext)',
      observeWith: '`curl http://example.com` ở terminal khác — quan sát GET / HTTP/1.1 và status line 200 OK',
    },
    {
      cmd: "tcpdump -i any -n -s0 -w /tmp/http.pcap 'tcp port 80'",
      why: '`-s0` capture full packet (không truncate), `-w` ghi pcap để mở Wireshark hoặc tải vào playground SEE',
      observeWith: 'Sau capture: `tcpdump -r /tmp/http.pcap` đọc lại; hoặc kéo file vào tab Upload .pcap ở SEE section',
    },
    {
      cmd: "tcpdump -i any -n 'tcp[tcpflags] & tcp-syn != 0'",
      why: 'Filter SYN packet để debug 3-way handshake / connection storm',
      observeWith: 'Đếm SYN khi browser load 1 trang — mỗi origin host thường 1 SYN/connection',
    },
  ],

  misconceptions: [
    {
      wrong: 'tcpdump thấy được HTTPS plaintext',
      right: 'HTTPS encrypt với TLS; tcpdump chỉ thấy TLS records (handshake + ciphertext), không thấy GET/POST body',
      why: 'Cần SSLKEYLOGFILE + Wireshark để decrypt phía dev/test. tcpdump không decrypt traffic.',
    },
    {
      wrong: '`tcp port 80` đủ bắt mọi HTTP',
      right: 'HTTP có thể trên port 8080, 8000, 3000, 8443… Cần filter port cụ thể của app, hoặc dùng `tcp portrange 8000-8999`',
      why: 'Port 80 là default chuẩn nhưng app dev thường dùng port khác để tránh sudo bind',
    },
  ],

  tldr: [
    {
      term: 'tcpdump + HTTP',
      why: 'HTTP plaintext → dùng `-A` in ASCII payload, filter `tcp port 80` (hoặc port app); kết hợp `-w` lưu pcap để mở Wireshark phân tích timeline.',
      whyBreaks: 'HTTPS không readable bằng tcpdump. Filter sai port → mất gói. Capture trên Linux container thường cần `--cap-add NET_ADMIN`.',
    },
  ],

  walkthrough: [
    {
      step: 'tcpdump-http-1',
      what: 'Bắt 1 HTTP GET với tcpdump',
      why: 'Chạy `tcpdump -i any -n -A "tcp port 80"` rồi `curl http://example.com`. Mapping: 3-way handshake (SYN, SYN-ACK, ACK) → GET request → 200 OK response → FIN. Đọc cột Flags để phân biệt từng pha.',
      observeWith: 'Kéo pcap vào tab Upload .pcap (lab `http` SEE section) để xem layer tree từng gói',
    },
  ],

  quiz: [
    {
      q: 'Vì sao tcpdump KHÔNG thấy được HTTP body khi truy cập https://example.com?',
      options: [
        'Vì HTTPS dùng UDP',
        'Vì payload bị mã hoá bởi TLS',
        'Vì tcpdump chặn HTTPS',
        'Vì port 443 không hỗ trợ filter',
      ],
      correct: 1,
      whyCorrect: 'TLS mã hoá toàn bộ application data sau handshake; tcpdump chỉ thấy TLS records (handshake plaintext + ciphertext bên trong).',
      whyWrong: {
        '0': 'HTTPS vẫn dùng TCP',
        '2': 'tcpdump không chặn protocol nào',
        '3': 'Port 443 hoàn toàn capture được, chỉ là payload encrypted',
      },
    },
  ],

  flashcards: [
    {
      front: 'Filter BPF chỉ bắt SYN packet?',
      back: '`tcp[tcpflags] & tcp-syn != 0` — kiểm tra bit SYN trong flags byte (offset 13 trong TCP header).',
    },
  ],
};
