# CSE473S — Introduction to Computer Networks (Bản dịch tiếng Việt — Chương 4-6)

**Nguồn:** [CSE473S Spring 2025 — Prof. Raj Jain](https://www.cse.wustl.edu/~jain/cse473-25/index.html)
**Sách giáo khoa:** Kurose & Ross — *Computer Networking: A Top-Down Approach* (8th Ed., 2021)
**Phạm vi:** Ch.4 (Network Layer — Data Plane) → Ch.5 (Network Layer — Control Plane) → Ch.6 (Link Layer & LANs)
**File trước:** [cse473-networks-ch1-3-vi.md](./cse473-networks-ch1-3-vi.md)

---

## 📘 Chương 4 — Tầng Network: Data Plane

Tầng Network có 2 phần:
- **Data plane (chương này):** quyết định đẩy packet ra cổng nào (per-packet, tốc độ ns)
- **Control plane (Ch.5):** quyết định route, build forwarding table (per-route, tốc độ ms-s)

### 1. Forwarding vs Routing
| | Forwarding | Routing |
|--|------------|---------|
| Phạm vi | Local — 1 router | Global — toàn mạng |
| Tốc độ | Hardware, nhanh | Software, chậm |
| Đầu vào | Forwarding table | Topology + thuật toán |

### 2. Bên trong router
- **Input ports:** nhận packet
- **Switching fabric:** chuyển packet từ input → output
  - Memory-based, bus-based, crossbar (interconnection network)
- **Output ports:** đệm + gửi ra link
- **Routing processor:** chạy giao thức điều khiển

**Queueing & packet drop:**
- **Head-of-Line (HOL) blocking:** packet đầu queue chặn packet sau dù output rảnh
- **Drop policies:** tail drop, RED (Random Early Detection)

### 3. IP Datagram (IPv4 header)
20 byte cơ bản: version, IHL, TOS, total length, **identification**, flags, **fragment offset**, TTL, protocol, checksum, src IP, dst IP.

**IP Fragmentation:** nếu packet > MTU của link → chia nhỏ; receiver ráp lại dựa trên `identification` + `fragment offset`.

### 4. IP Addressing
**Class-based (cũ, đã bỏ):** Class A/B/C/D/E.

**CIDR (Classless Inter-Domain Routing):** `192.168.1.0/24` — `/24` = 24 bit network, 8 bit host.

**Subnetting:** chia 1 mạng lớn thành nhiều subnet bằng cách "mượn" bit từ host part.

**Forwarding rule:** **longest prefix match** — chọn entry có prefix dài nhất khớp với dst IP.

**Route aggregation:** gộp nhiều prefix nhỏ thành 1 prefix lớn → giảm size routing table.

### 5. Private addresses + NAT
**Private ranges (RFC 1918):**
- `10.0.0.0/8`
- `172.16.0.0/12`
- `192.168.0.0/16`

**NAT (Network Address Translation):** router thay src IP private → public IP, lưu mapping `(private IP, src port) ↔ (public IP, NAT port)`.
- Lý do: thiếu IPv4
- Hạn chế: phá vỡ end-to-end principle, khó cho P2P
- **UPnP** giúp app tự mở port qua NAT

### 6. DHCP — cấp IP tự động
4-step **DORA**:
1. **Discover** (client → broadcast `255.255.255.255`)
2. **Offer** (server đề xuất IP)
3. **Request** (client chọn 1 offer)
4. **Ack** (server xác nhận, kèm subnet mask, gateway, DNS)

**Lease time:** IP cấp có hạn → client renew khi hết.

### 7. IPv6
- **Địa chỉ 128 bit** (vs IPv4 32 bit) → 3.4×10³⁸ địa chỉ
- Header 40 byte cố định, **không có checksum, không fragmentation tại router** (chỉ host làm)
- Định dạng: `2001:0db8:85a3::8a2e:0370:7334`

**IPv6 vs IPv4:**
| | IPv4 | IPv6 |
|--|------|------|
| Address | 32 bit | 128 bit |
| Header | Variable | Fixed 40B |
| Fragmentation | Router + host | Host only |
| Checksum | Có | Không (tin tầng dưới) |
| Auto-config | DHCP | SLAAC + DHCPv6 |

**Transition:** dual stack, tunneling (6in4, Teredo), translation (NAT64).

### 8. SDN — Software-Defined Networking
Tách **data plane** (chỉ forward) khỏi **control plane** (logic điều khiển), control plane do **controller** tập trung điều khiển.

**OpenFlow:** giao thức controller ↔ switch.
- **Flow table** chứa: match (header fields) + action (forward/drop/modify) + counters
- Match dựa trên: src/dst MAC, src/dst IP, port, VLAN, protocol...
- Actions: forward to port, drop, modify header, send to controller

**Lợi ích SDN:** programable, dễ A/B test, network-as-code.

---

## 📘 Chương 5 — Tầng Network: Control Plane

### 1. Bài toán routing
Tìm đường ngắn nhất giữa 2 node trên đồ thị có trọng số (cost = hop, latency, bandwidth, $).

### 2. Hai lớp thuật toán

| | Link State (LS) | Distance Vector (DV) |
|--|-----------------|----------------------|
| Thông tin | Mỗi router biết toàn bộ topology | Mỗi router chỉ biết cost tới hàng xóm |
| Trao đổi | Flood link-state ads cho tất cả | Trao đổi vector với hàng xóm |
| Thuật toán | Dijkstra | Bellman-Ford |
| Convergence | Nhanh, deterministic | Có thể "count to infinity" |
| Memory | O(n²) trong worst case | O(degree) |
| Ví dụ | OSPF, IS-IS | RIP |

### 3. Dijkstra (Link State)
Tham lam: mỗi vòng lặp chọn node chưa visited có cost nhỏ nhất, cập nhật cost các hàng xóm.

```
N' = {source}
D[source] = 0; D[all others] = ∞
while N' ≠ all nodes:
    pick w ∉ N' with min D[w]
    add w to N'
    for each v adjacent to w:
        D[v] = min(D[v], D[w] + cost(w,v))
```

Complexity: O(n²) hoặc O(m log n) với heap.

**Oscillation issue:** khi cost = traffic load → có thể dao động liên tục.

### 4. Bellman-Ford (Distance Vector)
`D_x(y) = min_v { c(x,v) + D_v(y) }` — cost từ x tới y = min qua mỗi hàng xóm v.

**Counting to infinity:** khi link đứt, cost tăng dần từng bước qua các neighbor → giải bằng **poisoned reverse**, **split horizon**.

### 5. Cấu trúc Internet routing — Autonomous Systems (AS)
Internet ≈ tập hợp các **AS** (~ ISP, công ty, đại học), mỗi AS có 1 ASN.

| Loại | Phạm vi | Giao thức |
|------|---------|-----------|
| **Intra-AS** (IGP) | Trong 1 AS | OSPF, IS-IS, RIP |
| **Inter-AS** (EGP) | Giữa các AS | BGP |

### 6. OSPF (Open Shortest Path First)
- Link-state, dùng Dijkstra
- Hỗ trợ **areas** → giảm flooding (mỗi area có database riêng, kết nối qua backbone area 0)
- Authentication, ECMP (equal-cost multipath)

### 7. BGP (Border Gateway Protocol) — "giao thức của Internet"
**Giao thức path-vector** chạy giữa các AS. Quyết định không chỉ theo cost mà theo **policy** (kinh doanh, peering agreement).

**BGP message types:** OPEN, UPDATE, KEEPALIVE, NOTIFICATION.

**Attributes quan trọng:**
- **AS_PATH:** chuỗi AS mà route đã đi qua (cũng phát hiện loop)
- **NEXT_HOP:** router tiếp theo
- **LOCAL_PREF, MED:** ưu tiên policy

**eBGP:** giữa 2 AS. **iBGP:** trong cùng AS, đồng bộ thông tin BGP giữa các border router.

### 8. SDN Control Plane
Controller tập trung (OpenDaylight, ONOS, Ryu) chạy thuật toán routing → push flow table xuống switch qua OpenFlow.

### 9. ICMP — Internet Control Message Protocol
Báo lỗi + chẩn đoán cho IP.

**Message types phổ biến:**
| Type | Code | Ý nghĩa |
|------|------|---------|
| 0 | 0 | Echo Reply (ping reply) |
| 3 | 0-15 | Destination Unreachable |
| 8 | 0 | Echo Request (ping) |
| 11 | 0 | Time Exceeded (TTL=0) |
| 5 | 0-3 | Redirect |

**Traceroute:** gửi UDP/ICMP với TTL=1,2,3,... → mỗi hop trả về "Time Exceeded" → biết đường đi.

### 10. SNMP — Simple Network Management Protocol
Quản trị thiết bị mạng: thu thập metrics, cấu hình từ xa.
- **Manager** ↔ **Agent** (chạy trên thiết bị)
- **MIB** (Management Information Base) — tree dữ liệu giám sát
- Operations: GET, GET-NEXT, SET, TRAP, INFORM

---

## 📘 Chương 6 — Link Layer & LANs

### 1. Dịch vụ tầng Link
- **Framing:** đóng gói packet thành frame
- **Link access:** ai được nói khi nhiều host chia sẻ link
- **Error detection** (+ optional correction)
- **Reliable delivery** (optional, thường bỏ qua trên link tốt)

**Line duplexity:** simplex / half-duplex / full-duplex.

### 2. Error Detection
**Parity (1D):** thêm 1 bit để tổng số bit 1 chẵn/lẻ → chỉ phát hiện lỗi lẻ.

**2D Parity:** ma trận → phát hiện + sửa 1 bit lỗi.

**Checksum:** cộng word, dùng cho IP/TCP/UDP.

**CRC (Cyclic Redundancy Check):** dùng phép chia đa thức trên GF(2):
- Sender: chọn generator polynomial G (đã chuẩn hóa)
- Tính `R = D · 2^r mod G` (dùng modulo-2 arithmetic = XOR)
- Gửi `D || R`
- Receiver chia `D || R` cho G → nếu remainder = 0 → OK

CRC-32 (Ethernet) phát hiện hầu hết lỗi burst < 32 bit. Chuẩn công nghiệp vì hardware-friendly.

### 3. Multiple Access Protocols
Khi nhiều host chia sẻ 1 link (bus, sóng vô tuyến), phải có cách chia.

| Loại | Cơ chế | Ví dụ |
|------|--------|-------|
| Channel partitioning | Chia thời gian/tần số/code | TDMA, FDMA, CDMA |
| Random access | Ai cần thì gửi, có collision | ALOHA, CSMA/CD, CSMA/CA |
| Taking turns | Token / polling | Token Ring, polling |

**CSMA/CD (Ethernet cũ):**
1. **CS — Carrier Sense:** lắng nghe trước khi gửi
2. **MA — Multiple Access:** nếu rảnh → gửi
3. **CD — Collision Detection:** nếu phát hiện va chạm → dừng, gửi jam, **binary exponential backoff** (sau lần n: chờ random trong [0, 2ⁿ-1] slot times)

### 4. Ethernet (IEEE 802.3)
**Frame format:**
```
| Preamble (7) | SFD (1) | Dst MAC (6) | Src MAC (6) | Type/Length (2) | Payload (46-1500) | FCS-CRC (4) |
```

**MAC address (48 bit):** `00:1A:2B:3C:4D:5E` — 24 bit OUI (vendor) + 24 bit serial.

**Ethernet standards:** 10Base-T, 100Base-TX, 1000Base-T (Gigabit), 10G/40G/100G/400G Ethernet.

**Full-duplex Ethernet:** với switch, mỗi link là điểm-điểm → không cần CSMA/CD nữa.

### 5. ARP — Address Resolution Protocol
Map IP → MAC trong cùng LAN.
- Host A muốn gửi tới B (cùng subnet) nhưng chỉ biết IP(B)
- A broadcast: "Ai có IP X.X.X.X?"
- B trả lời: "Tôi, MAC của tôi là Y:Y:Y:Y:Y:Y"
- A cache (ARP table) → gửi frame có dst MAC = MAC(B)

**Đa hop:** mỗi hop gửi tới next-hop router (dst MAC = MAC router, dst IP vẫn = IP đích cuối).

### 6. Bridges & Switches
**Bridge / Switch:** thiết bị tầng 2, học MAC qua **MAC learning**:
- Quan sát src MAC + port của frame đến → xây dựng switch table
- Forward selectively (không broadcast như hub)

**Spanning Tree Protocol (STP):** loại bỏ vòng lặp ở tầng 2 (loop = broadcast storm).

### 7. VLAN — Virtual LAN
Chia 1 switch vật lý thành nhiều LAN logic → cô lập broadcast domain mà không cần đi cáp lại.

**IEEE 802.1Q tag (4 byte chèn vào frame):**
- TPID (0x8100)
- PCP (priority, 3 bit)
- DEI (1 bit)
- **VID** (VLAN ID, 12 bit → 4094 VLAN)

**Trunk:** link giữa 2 switch mang nhiều VLAN.

### 8. MPLS — Multiprotocol Label Switching
Forward dựa trên **label** ngắn (20 bit) thay vì longest-prefix-match IP → nhanh hơn ở backbone.

**MPLS label format (32 bit):** Label (20) + EXP/TC (3) + S-bit (1) + TTL (8).

**MPLS vs IP path:**
- IP: mỗi router quyết định độc lập theo dst IP
- MPLS: edge router gắn label, core router chỉ swap label theo bảng — giống "đường ray xe lửa"

Ứng dụng: VPN (L2VPN, L3VPN), traffic engineering, QoS.

### 9. Data Center Networks
Topology phổ biến: **fat-tree, Clos, spine-leaf** — đảm bảo bandwidth ngang giữa server bất kỳ.

**Google's data center:** custom switch, tối ưu cho east-west traffic (giữa server) hơn north-south (in/out).

---

## 📎 Liên hệ với repo `hoc-cloud-cho-dev`

| Lab hiện có | Chương map tới |
|-------------|----------------|
| **subnet-cidr** | Ch.4 — IP Addressing, CIDR |
| **dhcp** | Ch.4 — DHCP DORA |
| **arp** | Ch.6 — ARP |
| **icmp-ping** | Ch.5 — ICMP, traceroute |
| **layer-stack-encap** | Ch.6 — framing, encapsulation |
| **osi-tcpip-comparison** | Ch.4 + Ch.6 — full stack |

Phần SDN, MPLS, BGP đang **chưa có lab** — có thể là roadmap mở rộng.

---

## ❓ Câu hỏi chưa rõ
1. Có cần thêm bản dịch chi tiết cho phần **SDN/OpenFlow** (cho roadmap lab tương lai) không?
2. Có muốn tôi vẽ Mermaid diagram cho các flow (DORA, traceroute, ARP request) trong file này không?
