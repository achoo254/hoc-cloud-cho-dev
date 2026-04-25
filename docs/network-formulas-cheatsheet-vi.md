# Cheatsheet — Công thức & số liệu mạng máy tính

**Mục đích:** Tổng hợp công thức tính toán, hằng số, số liệu chuẩn dùng cho lab nội dung mạng. Bám theo Kurose & Ross 8th ed + RFC.

**File liên quan:**
- [cse473-networks-ch1-3-vi.md](./cse473-networks-ch1-3-vi.md)
- [cse473-networks-ch4-6-vi.md](./cse473-networks-ch4-6-vi.md)
- [cse473-networks-ch7-8-vi.md](./cse473-networks-ch7-8-vi.md)

---

## 1. Độ trễ (Delay) — Packet Switching

**Tổng độ trễ tại 1 nút (nodal delay):**

```
d_nodal = d_proc + d_queue + d_trans + d_prop
```

| Thành phần | Công thức | Đơn vị thường gặp |
|------------|-----------|-------------------|
| **Processing** `d_proc` | thời gian router check header, lookup table | µs (~ngắn) |
| **Queueing** `d_queue` | phụ thuộc tải, có thể vô hạn | µs → ms → ∞ |
| **Transmission** `d_trans` | `L / R` | L=packet size (bit), R=link rate (bps) |
| **Propagation** `d_prop` | `d / s` | d=khoảng cách (m), s=tốc độ lan truyền (m/s) |

**Tốc độ lan truyền `s`:**
- Cáp đồng / cáp quang: ~`2 × 10⁸ m/s` (≈ 2/3 tốc độ ánh sáng)
- Sóng vô tuyến trong không khí: `3 × 10⁸ m/s`

**Ví dụ:**
- Packet 1500 byte = 12 000 bit, link 1 Gbps → `d_trans = 12 µs`
- 1000 km cáp quang → `d_prop = 1000 km / 2×10⁸ m/s = 5 ms`

### Queueing — traffic intensity
```
ρ = L · a / R
```
- `a` = arrival rate (packet/s)
- `L` = packet size (bit)
- `R` = link rate (bps)

| ρ | Hành vi |
|---|---------|
| < 0.5 | Queue ngắn, ít delay |
| ~ 0.8 | Delay tăng nhanh |
| → 1 | Delay → ∞ (mạng "sụp") |

### Little's Law
```
L = λ · W
```
- `L` = số packet trung bình trong queue
- `λ` = arrival rate
- `W` = thời gian trung bình trong queue

---

## 2. Throughput

**End-to-end throughput** trên đường có nhiều link:
```
Throughput = min(R₁, R₂, ..., Rₙ)   (bottleneck)
```

**N user chia sẻ link `R` cùng nhau:**
```
Throughput per user = R / N
```
(Khi mỗi user có access link riêng `R_a` → throughput = `min(R_a, R/N)`)

### Bandwidth-Delay Product (BDP)
"Lượng bit có thể đang bay trong đường ống":
```
BDP = bandwidth × RTT
```
**Ví dụ:** 1 Gbps × 30 ms = `30 × 10⁶ bit ≈ 3.75 MB`

→ Window size TCP cần ≥ BDP để dùng hết băng thông.

---

## 3. Sliding Window — Utilization

**Stop-and-Wait:**
```
U = (L/R) / (RTT + L/R)
```
Với link nhanh + RTT lớn, U → 0 → cực kỳ không hiệu quả.

**Sliding Window (window size = N):**
```
U = min(1, N · L / (R · RTT))
```

**Window size tối ưu:**
```
N_opt = ceil((R · RTT) / L) = ceil(BDP / L)
```

---

## 4. TCP

### TCP throughput xấp xỉ (loss model)
```
Throughput ≈ (MSS / RTT) · (1.22 / √p)
```
- `MSS` = Maximum Segment Size (byte)
- `p` = packet loss rate
- → loss tăng nhẹ, throughput giảm mạnh

**Ví dụ:** MSS=1460 B, RTT=100ms, p=10⁻⁴ → throughput ≈ 1.4 MBps

### TCP Congestion Control
| Giai đoạn | cwnd update |
|-----------|-------------|
| Slow Start | `cwnd ← cwnd + 1 MSS` mỗi ACK → gấp đôi mỗi RTT |
| Congestion Avoidance (AIMD) | `cwnd ← cwnd + MSS · MSS / cwnd` mỗi ACK → +1 MSS mỗi RTT |
| 3 dup ACK | `ssthresh ← cwnd / 2`, `cwnd ← ssthresh + 3 MSS` (Fast Recovery) |
| Timeout | `ssthresh ← cwnd / 2`, `cwnd ← 1 MSS` (về Slow Start) |

### RTT estimation (Jacobson)
```
EstimatedRTT = (1 - α) · EstimatedRTT + α · SampleRTT     (α = 0.125)
DevRTT       = (1 - β) · DevRTT + β · |SampleRTT - EstimatedRTT|   (β = 0.25)
TimeoutInterval = EstimatedRTT + 4 · DevRTT
```

### TCP Header
- Min size: **20 byte** (không option)
- Max size: 60 byte (option)
- Sequence number: 32 bit → 4 GB không lặp
- Window size: 16 bit → max 64 KB (mở rộng đến 1 GB qua **window scaling option**)

---

## 5. UDP / IP

### UDP Header (8 byte cố định)
| Field | Bit |
|-------|-----|
| Src port | 16 |
| Dst port | 16 |
| Length | 16 |
| Checksum | 16 |

### IPv4 Header
- Min: **20 byte**, max: 60 byte (option)
- TTL: 8 bit (0-255), giảm 1 mỗi router; 0 → drop + ICMP Time Exceeded
- Identification + Flags (3 bit: reserved/DF/MF) + Fragment Offset (13 bit) — cho fragmentation
- Total Length 16 bit → max **65 535 byte**

### IPv6 Header
- **Cố định 40 byte**, không có checksum, không option (dùng extension header)
- Address: 128 bit
- Hop Limit: 8 bit (= TTL)
- MTU tối thiểu bắt buộc: **1280 byte** (vs IPv4: 68 byte)

---

## 6. CIDR & Subnetting

### Số lượng host
Subnet `/n` (32-n bit cho host) → **`2^(32-n) - 2`** host (-2 cho network + broadcast).

| Prefix | Subnet mask | Số host | Block size |
|--------|-------------|---------|------------|
| /24 | 255.255.255.0 | 254 | 256 |
| /25 | 255.255.255.128 | 126 | 128 |
| /26 | 255.255.255.192 | 62 | 64 |
| /27 | 255.255.255.224 | 30 | 32 |
| /28 | 255.255.255.240 | 14 | 16 |
| /29 | 255.255.255.248 | 6 | 8 |
| /30 | 255.255.255.252 | 2 | 4 (link p2p) |
| /31 | 255.255.255.254 | 2 (RFC 3021) | 2 |
| /32 | 255.255.255.255 | 1 (host route) | 1 |

### Private ranges (RFC 1918)
- `10.0.0.0/8` — 16M host
- `172.16.0.0/12` — 1M host
- `192.168.0.0/16` — 65k host
- `100.64.0.0/10` — CGNAT (RFC 6598)
- `169.254.0.0/16` — link-local APIPA

### Special
- `127.0.0.0/8` — loopback
- `224.0.0.0/4` — multicast
- `0.0.0.0/0` — default route

---

## 7. Ethernet & Link Layer

### Frame size
| | Min | Max |
|--|-----|-----|
| Ethernet payload | **46 byte** (pad nếu < 46) | **1500 byte** (MTU chuẩn) |
| Frame total | 64 byte (incl. header+FCS) | 1518 byte |
| Jumbo frame | — | **9000 byte** |

**Vì sao min 46?** Để frame ≥ 64 byte → CSMA/CD detect collision được trước khi gửi xong (slot time).

### Ethernet header
- Preamble: 7 byte + SFD 1 byte
- Dst MAC: 6 byte
- Src MAC: 6 byte
- Type/Length: 2 byte (0x0800 = IPv4, 0x86DD = IPv6, 0x0806 = ARP)
- Payload: 46-1500 byte
- FCS (CRC-32): 4 byte

### Tốc độ Ethernet chuẩn
| Chuẩn | Tốc độ | Năm |
|-------|--------|-----|
| 10Base-T | 10 Mbps | 1990 |
| 100Base-TX | 100 Mbps | 1995 |
| 1000Base-T | 1 Gbps | 1999 |
| 10GBase-T | 10 Gbps | 2006 |
| 40G/100G | 40/100 Gbps | 2010 |
| 200G/400G | 200/400 Gbps | 2017 |
| 800G | 800 Gbps | 2022 |

### CSMA/CD — Slot time + binary exponential backoff
- 10/100 Mbps Ethernet slot time = **512 bit times** (51.2 µs cho 10M)
- Backoff sau lần thứ k: chờ random từ `[0, 2^k - 1]` slot times
- k tối đa = 10 (chờ tối đa 1023 slot)
- Sau 16 lần fail → bỏ frame

---

## 8. Wi-Fi (802.11)

### Tốc độ chuẩn
| Chuẩn | Tốc độ tối đa | Băng tần |
|-------|----------------|----------|
| 802.11b | 11 Mbps | 2.4 GHz |
| 802.11a/g | 54 Mbps | 5 / 2.4 GHz |
| 802.11n (Wi-Fi 4) | 600 Mbps | 2.4/5 GHz |
| 802.11ac (Wi-Fi 5) | 6.9 Gbps | 5 GHz |
| 802.11ax (Wi-Fi 6/6E) | 9.6 Gbps | 2.4/5/6 GHz |
| 802.11be (Wi-Fi 7) | 46 Gbps | 2.4/5/6 GHz |

### CSMA/CA timing
- **SIFS** (Short InterFrame Space): 10 µs (802.11b) / 16 µs (802.11a/g)
- **DIFS** (Distributed): SIFS + 2·slot time
- **Slot time:** 20 µs (b) / 9 µs (a/g/n)
- ACK gửi sau SIFS, data sau DIFS + backoff

### Channel widths
- 802.11b/g: **20 MHz**
- 802.11n: 20/40 MHz
- 802.11ac: 20/40/80/160 MHz
- 802.11ax/be: 20/40/80/160/320 MHz

---

## 9. Channel capacity — Shannon & Nyquist

**Nyquist** (kênh không nhiễu, M mức tín hiệu):
```
C = 2B · log₂(M)        bps
```

**Shannon** (có nhiễu, SNR là tỉ số tín hiệu/nhiễu, không phải dB):
```
C = B · log₂(1 + SNR)   bps
```

**Chuyển dB sang ratio:**
```
SNR_ratio = 10^(SNR_dB / 10)
```

**Ví dụ:** B=4 kHz, SNR=30 dB (=1000) → `C = 4000 · log₂(1001) ≈ 40 kbps`

---

## 10. Error Detection — CRC

**Polynomial chuẩn:**
| Tên | Polynomial | Dùng cho |
|-----|------------|----------|
| CRC-8 | x⁸ + x² + x + 1 | ATM header |
| CRC-16-CCITT | x¹⁶ + x¹² + x⁵ + 1 | Bluetooth, HDLC |
| CRC-32 (IEEE 802) | x³² + x²⁶ + x²³ + ... + 1 | **Ethernet, ZIP, PNG** |

**Khả năng phát hiện:**
- CRC-r phát hiện mọi lỗi burst độ dài ≤ r
- Phát hiện lỗi burst > r với xác suất `1 - 2^(-r)` (CRC-32: 99.99999998%)

---

## 11. DNS

### TTL phổ biến
| Record | TTL điển hình |
|--------|---------------|
| A/AAAA cho website | 300 - 3600s |
| A cho hostname ổn định | 86400s (1 ngày) |
| Negative cache | 60 - 3600s |
| MX | 3600 - 86400s |

### Record types
| Type | Code | Mục đích |
|------|------|----------|
| A | 1 | IPv4 |
| AAAA | 28 | IPv6 |
| CNAME | 5 | Alias |
| MX | 15 | Mail server |
| NS | 2 | Authoritative name server |
| TXT | 16 | Free text (SPF, DKIM, DMARC) |
| SRV | 33 | Service location |
| PTR | 12 | Reverse DNS |
| SOA | 6 | Zone metadata |

### Port: 53 (UDP normal, TCP cho zone transfer + response > 512 byte)

---

## 12. Port numbers chuẩn

| Port | Protocol | Dịch vụ |
|------|----------|---------|
| 20/21 | TCP | FTP data / control |
| 22 | TCP | SSH |
| 23 | TCP | Telnet |
| 25 | TCP | SMTP |
| 53 | UDP/TCP | DNS |
| 67/68 | UDP | DHCP server / client |
| 69 | UDP | TFTP |
| 80 | TCP | HTTP |
| 110 | TCP | POP3 |
| 123 | UDP | NTP |
| 143 | TCP | IMAP |
| 161/162 | UDP | SNMP / SNMP trap |
| 179 | TCP | BGP |
| 443 | TCP/UDP | HTTPS / HTTP/3 (QUIC) |
| 465 | TCP | SMTPS |
| 587 | TCP | SMTP submission |
| 993 | TCP | IMAPS |
| 995 | TCP | POP3S |
| 3306 | TCP | MySQL |
| 5432 | TCP | PostgreSQL |
| 6379 | TCP | Redis |
| 27017 | TCP | MongoDB |

**Ranges:**
- Well-known: 0-1023
- Registered: 1024-49151
- Dynamic/ephemeral: 49152-65535

---

## 13. ICMP

**Echo Request/Reply:** type 8 / type 0 (ping)

**Time Exceeded:** type 11 (TTL = 0) — dùng cho traceroute

**Destination Unreachable:** type 3, code:
- 0: network unreachable
- 1: host unreachable
- 3: port unreachable
- 4: fragmentation needed (cho PMTU discovery)

---

## 14. Routing — defaults

### Administrative Distance (Cisco convention)
| Source | AD |
|--------|-----|
| Connected | 0 |
| Static | 1 |
| eBGP | 20 |
| OSPF | 110 |
| RIP | 120 |
| iBGP | 200 |

### OSPF cost
```
Cost = ReferenceBandwidth / InterfaceBandwidth
```
Mặc định ref = 100 Mbps → 100M link cost = 1.

### BGP attributes — thứ tự lựa chọn (Cisco)
1. Highest **LOCAL_PREF** (default 100)
2. Shortest **AS_PATH**
3. Lowest **origin** type (IGP < EGP < incomplete)
4. Lowest **MED** (default 0)
5. eBGP > iBGP
6. Lowest IGP cost to next-hop
7. Lowest router-ID

---

## 15. Cryptography — key sizes

### Symmetric
| Algorithm | Key size |
|-----------|----------|
| DES | 56 bit (đã vỡ) |
| 3DES | 112/168 bit |
| AES | 128/192/256 bit |
| ChaCha20 | 256 bit |

### Asymmetric — security tương đương
| Symmetric | RSA / DSA / DH | ECC |
|-----------|----------------|-----|
| 80 bit | 1024 bit | 160 bit |
| 112 bit | 2048 bit | 224 bit |
| **128 bit** | **3072 bit** | **256 bit** |
| 192 bit | 7680 bit | 384 bit |
| 256 bit | 15360 bit | 512 bit |

→ Khuyến nghị tối thiểu: RSA 2048 / ECC 256 / AES 128 / SHA-256.

### Hash output
| Algorithm | Output |
|-----------|--------|
| MD5 | 128 bit (đã vỡ) |
| SHA-1 | 160 bit (đã vỡ collision) |
| SHA-256 | 256 bit |
| SHA-3 | variable |
| BLAKE2 | up to 512 bit |

### TLS handshake — số RTT
| Version | Full handshake | Resumed |
|---------|----------------|---------|
| TLS 1.2 | 2 RTT | 1 RTT |
| TLS 1.3 | **1 RTT** | **0 RTT** (early data) |
| QUIC + TLS 1.3 | 1 RTT (bao gồm cả transport) | 0 RTT |

---

## 16. 5G / LTE

### Latency target
| Generation | Air latency | E2E (typical) |
|------------|-------------|---------------|
| 4G LTE | ~10 ms | 30-50 ms |
| 5G eMBB | ~4 ms | 10-20 ms |
| 5G URLLC | **< 1 ms** | < 5 ms |

### Throughput target
- 4G LTE: peak 1 Gbps DL / 500 Mbps UL
- 5G: peak 20 Gbps DL / 10 Gbps UL

### Spectrum
- FR1 (sub-6 GHz): 410 MHz - 7.125 GHz — coverage tốt
- FR2 (mmWave): 24.25 - 52.6 GHz — bandwidth lớn, range ngắn

---

## 17. Đơn vị + chuyển đổi

### Bit vs Byte
- 1 byte = 8 bit
- 1 KB = 1000 B (decimal) hoặc 1024 B (binary)
- Chuẩn IEC: KiB = 1024 B, MiB = 1024² B...

### Tốc độ đường truyền
| Đơn vị | Bit/s |
|--------|-------|
| 1 kbps | 10³ |
| 1 Mbps | 10⁶ |
| 1 Gbps | 10⁹ |
| 1 Tbps | 10¹² |

**Lưu ý:** "100 Mbps Internet" = 100 megabit/giây = 12.5 MB/s thực tế (chia 8).

### Thời gian
- 1 ms = 10⁻³ s
- 1 µs = 10⁻⁶ s
- 1 ns = 10⁻⁹ s
- Light travels: ~30 cm / ns

---

## 📎 Liên hệ với repo

Số liệu/công thức trong file này có thể chèn trực tiếp vào field:
- **`why`** của lab content (đoạn giải thích "tại sao quan trọng")
- **`misconceptions`** (sửa hiểu lầm thường gặp như "100 Mbps = 100 MB/s")
- **TL;DR table** trong THINK phase
- **Walkthrough extras** trong SEE phase

---

## ❓ Câu hỏi chưa rõ
1. Có cần thêm phần **QoS / DiffServ math** (token bucket, leaky bucket, weighted fair queueing) không?
2. Có cần thêm **cellular path loss models** (Friis equation, log-distance) cho lab Wi-Fi/5G tương lai không?
3. Có muốn bảng đối chiếu này được render dưới dạng **interactive playground** trong lab (chọn link rate + RTT → ra BDP, throughput) không?
