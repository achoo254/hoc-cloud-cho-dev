# CSE473S — Introduction to Computer Networks (Bản dịch tiếng Việt — Chương 7-8)

**Nguồn:** [CSE473S Spring 2025 — Prof. Raj Jain](https://www.cse.wustl.edu/~jain/cse473-25/index.html)
**Sách giáo khoa:** Kurose & Ross — *Computer Networking: A Top-Down Approach* (8th Ed., 2021)
**Phạm vi:** Ch.7 (Wireless & Mobile) → Ch.8 (Security)
**Các file trước:**
- [cse473-networks-ch1-3-vi.md](./cse473-networks-ch1-3-vi.md)
- [cse473-networks-ch4-6-vi.md](./cse473-networks-ch4-6-vi.md)

---

## 📘 Chương 7 — Wireless & Mobile Networks

### 1. Wireless ≠ Mobile
| Wireless | Mobile |
|----------|--------|
| Truyền qua sóng vô tuyến | Node thay đổi vị trí |
| Có thể tĩnh (Wi-Fi router) | Có thể có dây (laptop dock) |

Một thiết bị có thể là: wireless + tĩnh (smart TV), wireless + mobile (điện thoại), wired + mobile (laptop di chuyển dock).

### 2. Đặc tính link wireless
- **Suy hao tín hiệu** (path loss) — giảm theo `1/d²` hoặc nhanh hơn
- **Multipath fading** — sóng phản xạ nhiều đường, có thể triệt tiêu nhau
- **Interference** từ các thiết bị khác cùng tần số
- **SNR** (Signal-to-Noise Ratio) thấp → BER (Bit Error Rate) cao
- **Hidden node problem:** A và C đều thấy B nhưng không thấy nhau → cùng gửi tới B → collision không phát hiện được bằng CSMA thuần

### 3. CDMA — Code Division Multiple Access
Mỗi sender dùng 1 **chipping code** trực giao → nhiều sender phát cùng lúc, cùng tần số, receiver decode được nhờ correlation.

**Direct-Sequence Spread Spectrum (DSSS):** trải bit dữ liệu thành nhiều chip → khó nghe trộm, kháng nhiễu.

**Frequency Hopping Spread Spectrum (FHSS):** nhảy tần số theo pattern (Bluetooth dùng).

### 4. Phân loại mạng không dây
| Loại | Phạm vi | Chuẩn |
|------|---------|-------|
| **PAN** (Personal) | <10m | Bluetooth (802.15.1), Zigbee (802.15.4) |
| **LAN** (Local) | ~100m | Wi-Fi (802.11) |
| **MAN** (Metro) | km | WiMAX (802.16) |
| **WAN** (Wide) | toàn cầu | 4G/5G cellular |

### 5. Wi-Fi (IEEE 802.11)
**Kiến trúc:**
- **AP** (Access Point) — trạm phát
- **BSS** (Basic Service Set) — 1 AP + các client
- **ESS** (Extended Service Set) — nhiều BSS kết nối qua DS (Distribution System)
- **SSID** — tên mạng

**Scanning:**
- **Passive:** AP phát beacon → client nghe
- **Active:** client gửi probe request → AP trả probe response

**Association — 4-way handshake** (khi join WPA2 mạng):
- Client + AP trao đổi nonce → derive **PTK** (Pairwise Transient Key)
- Bảo vệ chống replay

**MAC layer — CSMA/CA** (Collision Avoidance, không Detection vì wireless không nghe khi đang gửi):
1. Sense link, nếu rảnh → đợi DIFS → gửi
2. Nếu busy → backoff random
3. Receiver gửi ACK sau SIFS → nếu sender không nhận ACK → retry

**RTS/CTS** (option, giải quyết hidden node):
- Sender gửi **RTS** (Request To Send) → AP
- AP broadcast **CTS** (Clear To Send) — tất cả node nghe được CTS sẽ im lặng
- Sender gửi data
- Tốn overhead → chỉ dùng cho frame lớn

**802.11 frame có 4 trường address** (vs Ethernet chỉ 2): cho phép forwarding qua AP và DS.

**802.11 PHY versions:**
| Chuẩn | Năm | Tần số | Tốc độ tối đa |
|-------|-----|--------|----------------|
| 802.11a | 1999 | 5 GHz | 54 Mbps |
| 802.11b | 1999 | 2.4 GHz | 11 Mbps |
| 802.11g | 2003 | 2.4 GHz | 54 Mbps |
| 802.11n (Wi-Fi 4) | 2009 | 2.4/5 GHz | 600 Mbps |
| 802.11ac (Wi-Fi 5) | 2013 | 5 GHz | 6.9 Gbps |
| 802.11ax (Wi-Fi 6/6E) | 2019 | 2.4/5/6 GHz | 9.6 Gbps |
| 802.11be (Wi-Fi 7) | 2024 | 2.4/5/6 GHz | 46 Gbps |

**Rate adaptation:** giảm bitrate khi SNR xấu (xa AP) → giữ link ổn định.

**Power management:** client ngủ giữa các beacon, AP buffer frame trong **TIM**.

### 6. Bluetooth (802.15.1) & Zigbee (802.15.4)
- **Bluetooth:** PAN, FHSS, master-slave (piconet), 1-100m
- **Zigbee/802.15.4:** IoT, low-power, mesh networking, ~250 kbps

### 7. Cellular Networks
**Thế hệ:**
| Gen | Năm | Đặc trưng |
|-----|-----|-----------|
| 1G | 1980s | Analog voice |
| 2G | 1990s | Digital voice (GSM) + SMS |
| 3G | 2000s | Data 2 Mbps (UMTS, CDMA2000) |
| 4G LTE | 2010s | All-IP, 100 Mbps - 1 Gbps |
| 5G | 2020s | 10+ Gbps, low latency, IoT massive |

**GSM architecture:**
- **MS** (Mobile Station) ↔ **BTS** (base station) ↔ **BSC** (base station controller) ↔ **MSC** (Mobile Switching Center) ↔ **HLR/VLR** (Home/Visitor Location Register)

**EPS (Evolved Packet System) — 4G LTE:**
- **eNodeB** — base station
- **MME** — control plane (auth, mobility)
- **S-GW / P-GW** — data plane gateway
- **HSS** — subscriber DB

**LTE protocol stack:**
- PDCP (header compression, encryption)
- RLC (segmentation, retransmit)
- MAC (scheduling)
- PHY (OFDMA downlink, SC-FDMA uplink)

**OFDM / OFDMA:** chia băng thông thành nhiều subcarrier trực giao → kháng multipath, allow frequency-domain scheduling.

### 8. Mobility Management
**Câu hỏi:** Mr. Smith ở St. Louis, ai đó gọi số của ông từ Washington — làm sao kết nối tới đúng máy ông đang dùng?

**Mobile IP (RFC 5944):**
- **Home Agent (HA)** ở home network
- **Foreign Agent (FA)** ở mạng đang ghé thăm
- Mobile có 2 IP: home address (cố định) + care-of-address (CoA, ở foreign)
- Sender gửi tới home → HA tunnel (encap) gói sang CoA
- "**Triangle routing**" inefficient → giải bằng route optimization

**GSM handoff:**
- **Intra-MSC:** giữa 2 BTS cùng MSC
- **Inter-MSC:** giữa 2 MSC khác nhau (cần HLR/VLR phối hợp)

**Impact lên tầng cao hơn:**
- TCP nhầm packet loss do handoff = congestion → giảm cwnd vô lý
- Giải pháp: **Multipath TCP, QUIC, MIPv6 + RO**

### 9. 5G highlights
**3 use case lớn:**
- **eMBB** — Enhanced Mobile Broadband (10+ Gbps)
- **URLLC** — Ultra-Reliable Low-Latency (<1ms, dùng cho tự lái, robot)
- **mMTC** — massive Machine-Type Communication (IoT, 1M device/km²)

**Spectrum:**
- Sub-6 GHz (coverage tốt)
- mmWave (24-100 GHz) — siêu nhanh nhưng range ngắn, không xuyên tường

**Key tech:** beamforming (massive MIMO), network slicing, edge computing (MEC).

---

## 📘 Chương 8 — Security in Computer Networks

### 1. 4 yêu cầu bảo mật (CIA + A)
- **Confidentiality** — chỉ người nhận đúng đọc được
- **Integrity** — không bị sửa
- **Authentication** — đúng người nhận/gửi
- **Availability** — dịch vụ luôn truy cập được

### 2. Secret Key Encryption (Symmetric)
Cùng 1 key cho cả encrypt và decrypt.

**Block cipher:** chia plaintext thành block (64/128 bit), mã từng block.

**DES (Data Encryption Standard, 1977):** 56-bit key — đã bị crack, không còn dùng.

**AES (Advanced Encryption Standard, 2001):** 128/192/256-bit key, chuẩn hiện hành.

**Modes of operation:**
- **ECB** (Electronic Codebook): mã từng block độc lập — KHÔNG dùng (lộ pattern)
- **CBC** (Cipher Block Chaining): XOR với block trước rồi mới mã → ngăn pattern
- **CTR, GCM** (modern, parallelizable, có authentication)

**Vấn đề:** làm sao chia sẻ key an toàn? → cần Public Key.

### 3. Public Key Encryption (Asymmetric)
Cặp **public key** (chia sẻ rộng) + **private key** (giữ kín).

- Encrypt bằng public → chỉ private decrypt được → **confidentiality**
- Sign bằng private → ai có public verify được → **authentication / non-repudiation**

**RSA (Rivest-Shamir-Adleman):**
1. Chọn 2 số nguyên tố lớn p, q → n = p·q
2. φ(n) = (p-1)(q-1)
3. Chọn e coprime với φ(n) → public key = (n, e)
4. d sao cho `e·d ≡ 1 mod φ(n)` → private key = (n, d)
5. Encrypt: `c = m^e mod n`. Decrypt: `m = c^d mod n`

**An toàn dựa trên độ khó của phân tích thừa số nguyên tố n** (cần ≥ 2048-bit).

**Nhược điểm:** chậm — không dùng để mã toàn bộ traffic. Dùng để **trao đổi symmetric key** rồi mã traffic bằng AES.

### 4. Hash Functions
Hàm 1 chiều: input bất kỳ → output cố định (e.g. 256 bit).

**Yêu cầu:**
- **Pre-image resistance:** từ h(x) khó tìm x
- **Second pre-image:** biết x, khó tìm x' ≠ x sao cho h(x) = h(x')
- **Collision resistance:** khó tìm bất kỳ (x, x') khác nhau có cùng hash

**Phổ biến:**
| Hash | Output | Trạng thái |
|------|--------|------------|
| MD5 | 128 bit | **Đã vỡ**, không dùng cho security |
| SHA-1 | 160 bit | **Vỡ collision** (2017), tránh dùng |
| SHA-256 | 256 bit | OK |
| SHA-3 | variable | Modern |

### 5. MAC, Digital Signature, Certificate
**MAC (Message Authentication Code):** `MAC = h(key || message)` — chứng minh message không bị sửa + chỉ ai có key mới tạo được. **HMAC** là chuẩn.

**Digital Signature:** `sig = encrypt_with_private(hash(message))`. Verify bằng decrypt với public + so sánh hash.

**Digital Certificate (X.509):** ràng buộc public key với danh tính:
```
{
  Subject: "google.com",
  Public Key: 0x...,
  Issuer: "GlobalSign CA",
  Validity: 2025-01 → 2026-01,
  Signature: <CA ký>
}
```

**PKI (Public Key Infrastructure):** cây tin cậy CA root → intermediate CA → end-entity certs. Browser pre-install root CAs.

**Oligarchy model:** vài CA root được tin tuyệt đối → 1 CA bị compromise → cả Internet rủi ro (Diginotar 2011).

### 6. Secure Email — PGP (Pretty Good Privacy)
1. Sender tạo random session key K (symmetric)
2. Encrypt message bằng K (AES)
3. Encrypt K bằng public key receiver (RSA)
4. Sign hash(message) bằng private key sender
5. Gửi: `[encrypted_K] || [encrypted_message] || [signature]`

Combine confidentiality + authentication + non-repudiation.

### 7. TLS — Transport Layer Security (chuẩn của HTTPS)
**Lịch sử:** SSL 1.0/2.0/3.0 (Netscape) → TLS 1.0/1.1/1.2/**1.3** (IETF, 2018).

**Architecture:**
- **Handshake protocol** — auth + thoả thuận key
- **Record protocol** — mã + truyền data
- **Change Cipher Spec, Alert** — control

**TLS 1.3 handshake (rút gọn 1-RTT):**
```
Client                        Server
  | --- ClientHello (KeyShare, ciphers) -->
  |                                    |
  | <-- ServerHello (KeyShare)
  |     EncryptedExtensions
  |     Certificate (server)
  |     CertificateVerify (sign)
  |     Finished (HMAC)             ---|
  |                                    |
  | --- Finished (HMAC) -------------->|
  |                                    |
  | <==== application data (mã) =====> |
```

**Cryptographic computations:** master secret derive từ key share (ECDHE) + HKDF → tạo nhiều key (encrypt, MAC, IV) cho cả 2 chiều.

**HTTPS = HTTP / TLS / TCP / IP.**

### 8. IPsec (IP Security)
Bảo mật ở **tầng Network**, áp dụng cho mọi traffic (không chỉ HTTP). Nền tảng VPN.

**2 mode:**
- **Transport mode:** mã payload, giữ IP header gốc → host-to-host
- **Tunnel mode:** đóng gói toàn bộ IP packet trong IP packet mới → gateway-to-gateway VPN

**2 protocol:**
- **AH (Authentication Header):** integrity + auth (không mã)
- **ESP (Encapsulating Security Payload):** confidentiality + integrity + auth

**SA (Security Association):** đơn hướng, định nghĩa thuật toán + key.

**SAD** (SA Database) + **SPD** (Security Policy Database) — bảng tra cứu của kernel.

**IKE (Internet Key Exchange):** giao thức trao đổi key, dùng Diffie-Hellman.

### 9. Firewalls & IDS
**Packet filter (stateless):** ACL theo (src/dst IP, port, protocol).

**Stateful firewall:** track connection state (TCP handshake) → cho phép response của outbound connection mà không cần rule riêng.

**Application gateway / Proxy:** kiểm tra ở tầng app (e.g. lọc URL HTTP).

**DMZ (Demilitarized Zone):** mạng trung gian, đặt server public (web, mail) — bị cô lập với mạng nội bộ.

**IDS (Intrusion Detection):** phát hiện tấn công.
- **Signature-based:** so khớp pattern đã biết
- **Anomaly-based:** phát hiện bất thường
- **NIDS** (network) vs **HIDS** (host)

**Honeypot:** server "mồi" để dụ attacker, học kỹ thuật mới.

### 10. Wireless Security
**WEP (Wired Equivalent Privacy)** — đã vỡ:
- RC4 stream cipher với 24-bit IV → IV trùng nhanh → key recovery
- Authentication challenge-response yếu

**WPA (2003):** TKIP — vá WEP.
**WPA2 (2004):** AES-CCMP — chuẩn hiện hành.
**WPA3 (2018):** SAE handshake — kháng dictionary attack offline.

**WPA2 4-way handshake:** AP và client trao đổi nonce, derive **PTK** từ PMK + nonce + MAC. Bị tấn công **KRACK** (2017) → WPA3 fix.

**802.1X / EAP:** authentication framework cho enterprise Wi-Fi (RADIUS server kiểm tra credential).

### 11. Auth trong 4G/5G
- **SIM card** chứa pre-shared key Ki + IMSI
- 4G: **AKA** (Authentication and Key Agreement) — mutual auth giữa UE và HSS
- 5G: **5G-AKA** — mã hoá IMSI thành SUCI để tránh IMSI catcher (Stingray)

---

## 🎯 Tổng kết toàn khoá (Ch.1-8)

| Chương | Trọng tâm | Lab map |
|--------|-----------|---------|
| 1 | Internet basics, layering | osi-tcpip-comparison |
| 2 | Application: HTTP, DNS, SMTP, P2P | http, dns |
| 3 | Transport: UDP, TCP, congestion | tcp-udp |
| 4 | Network data plane: IP, NAT, DHCP, SDN | subnet-cidr, dhcp |
| 5 | Network control plane: routing, BGP, ICMP | icmp-ping |
| 6 | Link: Ethernet, ARP, VLAN, MPLS | arp, layer-stack-encap |
| 7 | Wireless: Wi-Fi, cellular, mobile IP | (chưa có) |
| 8 | Security: crypto, TLS, IPsec, firewall | (chưa có) |

**8 câu hỏi cốt lõi → đã trả lời đầy đủ qua 8 chương:**
1. App message format → Ch.2
2. DNS → Ch.2
3. Tránh nghẽn → Ch.3 (TCP CC)
4. Routing → Ch.5 (OSPF, BGP)
5. Bit hỏng → Ch.3 (checksum) + Ch.6 (CRC)
6. Wi-Fi/Bluetooth/Ethernet → Ch.6 + Ch.7
7. Audio/video → Ch.2 (DASH/CDN) + Ch.7 (5G URLLC)
8. Bảo mật → Ch.8 (TLS, IPsec, firewall)

---

## ❓ Câu hỏi chưa rõ
1. Có muốn tôi tạo 1 **index file** (`cse473-networks-vi.md`) gom toàn bộ 3 file dịch + làm điểm vào duy nhất không?
2. Có cần **add reference link** từ docs/codebase-summary.md hoặc docs/content-guidelines.md tới các file dịch này không?
3. Có muốn tôi **map detailed** từng misconception phổ biến trong các topic (đặc biệt TCP, NAT, BGP, TLS) sang field `misconceptions` trong lab schema để dùng cho phase 04-06 của OSI think-depth upgrade không?
