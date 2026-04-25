# CSE473S — Introduction to Computer Networks (Bản dịch tiếng Việt — Chương 1-3)

**Nguồn:** [CSE473S Spring 2025 — Prof. Raj Jain (Washington University in St. Louis)](https://www.cse.wustl.edu/~jain/cse473-25/index.html)
**Sách giáo khoa:** Kurose & Ross — *Computer Networking: A Top-Down Approach* (8th Ed., 2021)
**Phạm vi:** Chương 1 (Mạng & Internet) → Chương 2 (Application Layer) → Chương 3 (Transport Layer)

---

## 📘 Chương 1 — Mạng máy tính và Internet

### 1. Mạng là gì?
Tập hợp **node** (máy tính, router, switch...) kết nối qua **link** (cáp đồng, cáp quang, sóng vô tuyến) để trao đổi dữ liệu.

**Internet** = "mạng của các mạng" — hàng triệu mạng nhỏ kết nối với nhau qua các ISP.

### 2. Cấu trúc Internet
- **Edge (rìa):** thiết bị đầu cuối — laptop, điện thoại, server
- **Core (lõi):** router/switch chuyển packet
- **Access network:** đoạn nối edge với core — DSL, Cable, **FTTH** (cáp quang tới nhà), Wi-Fi, 4G/5G
- **ISP phân tầng:** Tier-1 (toàn cầu) → Tier-2 (vùng) → Tier-3 (địa phương)

### 3. Phương tiện truyền dẫn
| Loại | Đặc điểm |
|------|----------|
| Twisted Pair (TP) — UTP/STP, Cat5e/Cat6/Cat7 | Cáp đồng xoắn đôi, dùng Ethernet |
| Cáp quang (optical fiber) | Tốc độ cao, ít suy hao, đắt |
| Sóng vô tuyến | Wi-Fi, 4G/5G, vệ tinh |

### 4. Multiplexing (ghép kênh)
Nhiều luồng dữ liệu chia sẻ cùng một đường truyền:
- **TDM** — chia theo thời gian
- **FDM** — chia theo tần số
- **CDM** — chia theo mã

### 5. Đo hiệu năng mạng
- **Throughput** — bit/giây thực tế
- **Loss rate** — tỉ lệ packet bị mất
- **Delay (độ trễ)** = trễ xử lý + trễ hàng đợi + trễ truyền + trễ lan truyền

### 6. Mô hình phân tầng (Protocol Layers)
**Tại sao chia tầng?** Mỗi tầng có 1 nhiệm vụ → dễ thiết kế, dễ debug, đổi 1 tầng không ảnh hưởng tầng khác.

| Tầng OSI (7) | Tầng TCP/IP (5) | Đơn vị dữ liệu (PDU) |
|--------------|-----------------|----------------------|
| Application | Application | Message |
| Presentation | (gộp vào App) | — |
| Session | (gộp vào App) | — |
| Transport | Transport | Segment |
| Network | Network | Packet/Datagram |
| Data Link | Link | Frame |
| Physical | Physical | Bit |

**SDU** (Service Data Unit) = dữ liệu nhận từ tầng trên; **PDU** = SDU + header của tầng đó.

### 7. An ninh mạng cơ bản
- **Malware:** virus, worm, trojan, ransomware, spyware
- **Tấn công phổ biến:** sniffing (nghe trộm), spoofing (giả mạo), DoS/**DDoS** (làm sập dịch vụ)
- 3 trụ cột bảo mật: **Confidentiality, Integrity, Availability** (CIA)

---

## 📘 Chương 2 — Tầng Application

### 1. Hai mô hình kiến trúc app
| Client-Server | Peer-to-Peer (P2P) |
|---------------|---------------------|
| Server cố định, IP công khai | Mọi peer vừa client vừa server |
| Khả năng mở rộng phụ thuộc server | Mở rộng tự nhiên theo số peer |
| Ví dụ: Web, Email | Ví dụ: BitTorrent |

### 2. Process communication
2 process trao đổi qua **socket**, mỗi process xác định bằng:
- **IP address** — định danh máy
- **Port number** — định danh process trên máy đó

### 3. HTTP (HyperText Transfer Protocol)
Giao thức nền của Web. Cấu trúc **request-response**:

**Request:**
```
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1234

<html>...</html>
```

**Khái niệm cốt lõi:**
- **Persistent vs non-persistent connection** — dùng lại 1 TCP connection cho nhiều request (HTTP/1.1+) thay vì mở/đóng liên tục
- **Cookie** — server lưu trạng thái người dùng (vì HTTP vốn stateless)
- **Web cache (proxy):** cache nội dung gần user → giảm latency + tải server gốc
- **Conditional GET:** `If-Modified-Since` — chỉ tải lại nếu file đã đổi

### 4. Email — SMTP
**SMTP** đẩy mail từ client → server, từ server → server.

```
S: 220 mail.example.com
C: HELO sender.com
C: MAIL FROM: <a@x.com>
C: RCPT TO: <b@y.com>
C: DATA
C: Subject: hello
C: .
S: 250 OK
```

**SMTP vs HTTP:**
- HTTP: pull (kéo về), client request
- SMTP: push (đẩy đi), gửi tới server đích

**Đọc mail:** **POP3** (tải về, xoá khỏi server) hoặc **IMAP** (đồng bộ, để lại server).

### 5. DNS — Domain Name Service
"Danh bạ Internet": dịch `www.google.com` → `74.125.73.104`.

**Cây phân cấp:**
```
                    .  (root)
                   /|\
              .com .org .vn ...
              /
         google.com
            /
      www.google.com
```

**Cách hoạt động:**
1. PC hỏi local DNS resolver
2. Resolver hỏi root → root chỉ tới TLD `.com`
3. Resolver hỏi TLD → TLD chỉ tới authoritative server của `google.com`
4. Authoritative trả IP

**DNS records phổ biến:** A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail server), NS (name server).

**DNS vulnerability:** cache poisoning, DNS spoofing → giải pháp: **DNSSEC**.

### 6. P2P — BitTorrent
- File chia thành nhiều **chunk**
- Peer download chunk từ nhiều peer cùng lúc, đồng thời upload chunk mình đã có
- **Tracker** điều phối danh sách peer
- Càng đông peer → càng nhanh (ngược với client-server)

### 7. Streaming Video
- **DASH** (Dynamic Adaptive Streaming over HTTP): server chia video thành nhiều chunk ở nhiều mức bitrate. Client tự chọn bitrate phù hợp với băng thông hiện tại.
- **CDN** (Content Distribution Network): đặt server cache ở nhiều vị trí địa lý → user lấy video từ server gần nhất (Akamai, Cloudflare, AWS CloudFront).

---

## 📘 Chương 3 — Tầng Transport

### 1. Chức năng tầng Transport
Mở rộng dịch vụ host-to-host (do tầng Network cung cấp) thành **process-to-process**.

**Multiplexing/Demultiplexing:**
- Sender: gom dữ liệu nhiều process → đóng segment có port → gửi xuống tầng dưới
- Receiver: dựa vào port number để chuyển segment đúng process

### 2. UDP — User Datagram Protocol
Đơn giản, không kết nối, không tin cậy:
- Header chỉ 8 byte: src port, dst port, length, checksum
- **Không** retransmit, **không** đảm bảo thứ tự
- Phù hợp: DNS, streaming, gaming, VoIP — chỗ cần nhanh, chấp nhận mất 1 ít

**Checksum (1s complement):** cộng các word 16-bit, lấy bù 1 → phát hiện lỗi bit cơ bản.

### 3. Flow Control & Sliding Window
**Vấn đề:** sender gửi quá nhanh → receiver không xử lý kịp.

**Stop-and-Wait** (đơn giản nhưng chậm): gửi 1 packet → đợi ACK → gửi tiếp.

**Sliding Window** (hiệu quả hơn): cho phép gửi nhiều packet "đang bay" trước khi cần ACK.
- **Window size** càng lớn → throughput càng cao
- Hiệu suất phụ thuộc vào **bandwidth-delay product (BDP)** — nhân băng thông với RTT

### 4. Error Control — Retransmissions (ARQ)
**Go-Back-N:** nếu mất packet N → gửi lại N và **toàn bộ** packet sau đó. Đơn giản nhưng tốn băng thông.

**Selective Repeat:** chỉ gửi lại đúng packet bị mất. Phức tạp hơn nhưng hiệu quả.

**Quy tắc window size cho Selective Repeat:** ≤ ½ không gian sequence number (tránh ambiguity).

### 5. TCP — Transmission Control Protocol
Tin cậy, có kết nối, có thứ tự, kiểm soát luồng + nghẽn.

**TCP Header (20 byte cơ bản):**
- Src port, dst port
- Sequence number, ACK number
- Flags: SYN, ACK, FIN, RST, PSH, URG
- Window size (cho flow control)
- Checksum, urgent pointer

**Connection management — 3-way handshake:**
```
Client                  Server
  |  ---- SYN ----->     |
  |  <-- SYN+ACK ---     |
  |  ---- ACK ----->     |
  |  (connection open)   |
```

**Close: 4-way (FIN/ACK x2).**

**RTT estimation:** TCP đo Round Trip Time để tính timeout retransmit. Dùng **EWMA** (Exponentially Weighted Moving Average): `EstimatedRTT = (1-α)·old + α·sample`.

### 6. TCP Congestion Control (chuyên môn của Raj Jain)
**Vấn đề:** quá nhiều sender → router quá tải → packet drop → mạng "sụp".

**Cơ chế chính:**
1. **Slow Start:** mở đầu, **cwnd** (congestion window) tăng **gấp đôi** mỗi RTT (exponential).
2. **Congestion Avoidance / AIMD** (Additive Increase, Multiplicative Decrease):
   - Không có loss → cwnd **+1** mỗi RTT (cộng tuyến tính)
   - Có loss → cwnd **÷2** (giảm nửa)
   - Đảm bảo công bằng + ổn định
3. **Fast Retransmit:** nhận 3 duplicate ACK → gửi lại ngay, không đợi timeout.
4. **ECN (Explicit Congestion Notification):** router đặt cờ "sắp nghẽn" trong header → sender chủ động giảm tốc trước khi mất gói (chế độ hiện đại, không dựa vào loss).

**TCP throughput trung bình:** ≈ `(MSS / RTT) · (1 / √p)` với p = loss rate. → Mất gói nhỏ thôi cũng giảm throughput nhiều.

---

## 🎯 Bộ kết nối với 8 câu hỏi cốt lõi của khoá học

| Câu hỏi | Trả lời ở đâu |
|---------|---------------|
| Web/email/file transfer trao đổi message gì? | Ch.2 (HTTP, SMTP) |
| Tên miền dịch sang IP thế nào? | Ch.2 (DNS) |
| Tránh nghẽn ra sao? | Ch.3 (TCP congestion control) |
| Bit packet bị hỏng thì sao? | Ch.3 (checksum + retransmit) |

---

## 📎 Liên hệ với repo `hoc-cloud-cho-dev`

Các lab hiện có trong repo bám sát Ch.1-3:
- **OSI/TCP-IP comparison** → Ch.1 (protocol layers)
- **DNS lab** → Ch.2 (DNS)
- **HTTP lab** → Ch.2 (HTTP)
- **TCP/UDP lab** → Ch.3 (transport layer)
- **DHCP, ARP, ICMP, subnet/CIDR** → Ch.1 + Ch.4 (network layer — sẽ chuẩn bị cho chương sau)

Bản dịch này có thể dùng làm reference content cho phần `why` 3-paragraph và `misconceptions` của lab content theo chuẩn đã codify trong `docs/content-guidelines.md`.
