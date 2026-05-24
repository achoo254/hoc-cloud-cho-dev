# LAB DHCP Server – Client trên Ubuntu 24.04 (hybrid)

> **Mục tiêu** — Dựng DHCP Server + 2 Client, bắt đủ chuỗi DORA, phân tích từng field theo RFC 2131/5227, kiểm tra 2 trường hợp IP Conflict, quan sát cơ chế bảo vệ ở cả 2 phía (server `ping-check` + client `ARP Probe`).
>
> **Phong cách hybrid** — kết hợp:
> - Topology host-only sạch + Server kiêm NAT gateway (gọn, không cần workaround).
> - Phân tích DHCP packet ở mức field/option (chuẩn RFC).
> - Phân biệt rõ ARP Probe (RFC 5227) vs Gratuitous ARP.
> - Demo `ping-check` của ISC dhcpd + xung đột giữa 2 client thật.
> - Demo DHCPDECLINE → APIPA fallback (RFC 3927) bằng `dhcpcd`.
> - Phụ lục bẫy thực tế (CAP_NET_RAW, AF_PACKET, INIT-REBOOT…).

---

## Mục lục

1. [Topology](#1-topology)
2. [Chuẩn bị VMware](#2-chuẩn-bị-vmware)
3. [Cấu hình Server (DHCP + NAT)](#3-cấu-hình-server-dhcp--nat)
4. [Cấu hình 2 Client DHCP](#4-cấu-hình-2-client-dhcp)
5. [Bắt gói DORA + phân tích field/option](#5-bắt-gói-dora--phân-tích-fieldoption)
6. [Kiến thức nền: ARP Probe vs Gratuitous ARP](#6-kiến-thức-nền-arp-probe-vs-gratuitous-arp)
7. [CASE A — Manual đặt TRƯỚC](#7-case-a--manual-đặt-trước)
8. [CASE B — Manual đặt SAU](#8-case-b--manual-đặt-sau)
9. [So sánh 2 case (mẫu cho báo cáo)](#9-so-sánh-2-case-mẫu-cho-báo-cáo)
10. [Wireshark filter & checklist screenshot](#10-wireshark-filter--checklist-screenshot)
11. [Cleanup](#11-cleanup)
12. [Phụ lục — Troubleshooting & bẫy thực tế](#12-phụ-lục--troubleshooting--bẫy-thực-tế)

---

## 1. Topology

```
┌───────────────────────────────────────────────────────────────────┐
│                       VMware Workstation                          │
│                                                                   │
│   ┌─────────────────────┐                                         │
│   │      Server         │ ens33 ─ VMnet8 (NAT) ──► Internet       │
│   │   Ubuntu 24.04      │                                         │
│   │  dhcp-server        │ ens37 ─ VMnet1 (Host-only) 100.1/24     │
│   │  DHCP + NAT         │       │                                 │
│   └─────────────────────┘       │                                 │
│                                 │  VMnet1 192.168.100.0/24        │
│   ┌──────────────────┐          │  (VMware DHCP TẮT)              │
│   │    Client1       │ ens33 ───┤                                 │
│   │  dhcp-client     │          │                                 │
│   │  DHCP            │          │                                 │
│   └──────────────────┘          │                                 │
│                                 │                                 │
│   ┌──────────────────┐          │                                 │
│   │    Client2       │ ens33 ───┘                                 │
│   │  dhcp-client-2   │                                            │
│   │  DHCP (Case A/B) │                                            │
│   └──────────────────┘                                            │
└───────────────────────────────────────────────────────────────────┘
```

### Thông tin IP

| Node      | NIC   | Mạng                | IP                | Vai trò                                 |
|-----------|-------|---------------------|-------------------|-----------------------------------------|
| Server    | ens33 | VMnet8 NAT          | DHCP từ VMware    | Uplink ra internet                      |
| Server    | ens37 | VMnet1 Host-only    | `192.168.100.1/24`| DHCP Server + Default Gateway nội bộ    |
| Client1   | ens33 | VMnet1 Host-only    | DHCP `.100–.110`  | Client xin IP từ DHCP                   |
| Client2   | ens33 | VMnet1 Host-only    | DHCP / Manual     | Client thứ 2, dùng để test conflict     |

DHCP pool: **`192.168.100.100 – 192.168.100.110`** (11 IP, đủ để demo).

---

## 2. Chuẩn bị VMware

### 2.1. Tạo 3 VM Ubuntu Server 24.04

| VM       | Hostname        | Username       | Password   | NIC                              |
|----------|-----------------|----------------|------------|----------------------------------|
| Server   | `dhcp-server`   | `dhcp-server`  | `7335140`  | NIC1 → VMnet8, NIC2 → VMnet1     |
| Client1  | `dhcp-client`   | `dhcp-client`  | `7335140`  | NIC1 → VMnet1                    |
| Client2  | `dhcp-client-2` | `dhcp-client-2`| `7335140`  | NIC1 → VMnet1                    |

Khi cài Ubuntu Server, bật OpenSSH server.

### 2.2. ⚠ Tắt DHCP của VMnet1 (bước rất quan trọng)

VMware Workstation mặc định có DHCP daemon cho mỗi VMnet. Nếu để bật trên VMnet1, **nó sẽ tranh OFFER** với DHCP server của ta → kết quả test không tin cậy.

**Trên máy host:**
1. Mở **VMware Workstation → Edit → Virtual Network Editor** (cần quyền admin).
2. Chọn **VMnet1** (Host-only).
3. Tại "Use local DHCP service to distribute IP" → **BỎ TICK**.
4. Subnet: `192.168.100.0/24`, Subnet mask `255.255.255.0`.
5. **VMnet8 (NAT)** giữ nguyên DHCP — vì Server cần uplink internet qua đó.
6. Apply.

> Việc này tương đương "rút dây" DHCP của VMware ra khỏi VMnet1; toàn bộ việc cấp IP nội bộ giờ do ISC dhcpd của ta phụ trách.

### 2.3. Lưu ý cấu hình NIC trong từng VM

- Mở Settings của Server, **Add… → Network Adapter** thứ hai. NIC1 chọn "Custom: VMnet8", NIC2 chọn "Custom: VMnet1".
- Client1, Client2 chỉ có 1 NIC, chọn "Custom: VMnet1".
- Khởi động cả 3 VM. Sau khi cài đặt, từ host gõ `ssh dhcp-server@<ip>` (ip lấy từ VMware NAT) để vào server tiếp tục cấu hình.

---

## 3. Cấu hình Server (DHCP + NAT)

Login Server, mở 2 terminal song song (1 để cấu hình, 1 để theo dõi log).

### 3.1. Cài gói cần thiết

```bash
sudo apt update
sudo apt install -y isc-dhcp-server tcpdump tshark iputils-arping iptables-persistent
```

Khi cài `iptables-persistent` nó hỏi "save current rules" → chọn No cho cả IPv4/IPv6 (ta sẽ tự lưu sau).

> **Alternative:** Có thể dùng `dnsmasq` thay cho `isc-dhcp-server` (nhẹ hơn, log dễ đọc). Tài liệu này dùng ISC dhcpd vì có log `Abandoning IP: pinged before offer` rất minh hoạ.

### 3.2. Cấu hình 2 NIC bằng netplan

Xác định tên NIC trước:
```bash
ip -br link
# ví dụ: ens33 (VMnet8), ens37 (VMnet1)
```

Tạo file netplan:
```bash
sudo tee /etc/netplan/99-lab.yaml >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:                       # uplink internet, lấy DHCP từ VMware NAT
      dhcp4: true
    ens37:                       # nội bộ — IP tĩnh, server-side
      dhcp4: false
      addresses: [192.168.100.1/24]
EOF
sudo chmod 600 /etc/netplan/99-lab.yaml

# Vô hiệu file cloud-init cũ
sudo mv /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.bak 2>/dev/null

sudo netplan apply
ip -br a
# ens33 UP 192.168.x.x/24  (NAT)
# ens37 UP 192.168.100.1/24
```

### 3.3. Bật IP Forwarding + NAT MASQUERADE (Server thành Gateway)

```bash
# 1. Bật IP forwarding lâu dài
sudo sed -i 's/^#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.conf >/dev/null
sudo sysctl -p

# 2. iptables NAT: thay src IP của gói đi ra ens33 bằng IP của ens33
sudo iptables -t nat -A POSTROUTING -o ens33 -j MASQUERADE
sudo iptables -A FORWARD -i ens37 -o ens33 -j ACCEPT
sudo iptables -A FORWARD -i ens33 -o ens37 -m state --state RELATED,ESTABLISHED -j ACCEPT

# 3. Lưu vĩnh viễn
sudo netfilter-persistent save
```

> **Cơ chế MASQUERADE**: gói từ Client `192.168.100.X` đi ra cổng `ens33` sẽ được kernel ghi đè src = IP của ens33; reply về Server, kernel tra conntrack rồi dịch ngược về Client. Client không biết gì về NAT.

### 3.4. Cấu hình `/etc/default/isc-dhcp-server`

```bash
sudo tee /etc/default/isc-dhcp-server >/dev/null <<'EOF'
INTERFACESv4="ens37"
INTERFACESv6=""
EOF
```

Lưu ý: lắng nghe chỉ trên `ens37` (mạng nội bộ), không phải `ens33`.

### 3.5. Cấu hình `/etc/dhcp/dhcpd.conf`

```bash
sudo tee /etc/dhcp/dhcpd.conf >/dev/null <<'EOF'
# Lab DHCP — pool .100-.110 trên 192.168.100.0/24
default-lease-time 120;       # 2 phút — dễ quan sát renew
max-lease-time 300;
authoritative;

# RẤT QUAN TRỌNG: server gửi ICMP echo trước khi OFFER. Nếu IP đang có máy
# (vd. máy đặt manual), server abandon IP đó, thử IP khác.
ping-check true;
ping-timeout 1;

log-facility local7;

subnet 192.168.100.0 netmask 255.255.255.0 {
  range 192.168.100.100 192.168.100.110;

  option routers 192.168.100.1;                   # Server làm gateway
  option domain-name-servers 8.8.8.8, 1.1.1.1;
  option broadcast-address 192.168.100.255;
}
EOF
```

Kiểm tra cú pháp:
```bash
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf
# Nếu OK sẽ ra dòng "Config file: /etc/dhcp/dhcpd.conf" không kèm error.
```

### 3.6. ⚠ Sửa lỗi `ping-check` không hoạt động (CỰC KỲ QUAN TRỌNG)

Mặc định systemd unit chạy `dhcpd` dưới user `dhcpd` (không phải root) → **mất `CAP_NET_RAW`** → ICMP probe thất bại im lặng → `ping-check` thực tế vô hiệu hoá. Override:

```bash
sudo mkdir -p /etc/systemd/system/isc-dhcp-server.service.d
sudo tee /etc/systemd/system/isc-dhcp-server.service.d/override.conf >/dev/null <<'EOF'
[Service]
ExecStart=
ExecStart=/usr/sbin/dhcpd -f -4 -pf /run/dhcp-server/dhcpd.pid -cf /etc/dhcp/dhcpd.conf ens37
EOF

# Lease file phải root mở được
sudo chown root:root /var/lib/dhcp /var/lib/dhcp/dhcpd.leases
sudo chmod 755 /var/lib/dhcp
sudo chmod 644 /var/lib/dhcp/dhcpd.leases

sudo systemctl daemon-reload
sudo systemctl restart isc-dhcp-server
```

Verify dhcpd chạy as root:
```bash
PID=$(pidof dhcpd | awk '{print $1}')
grep -E '^Uid|^CapEff' /proc/$PID/status
# Đúng: Uid: 0 0 0 0
#       CapEff: 000001ffffffffff   ← đủ tất cả capability
```

Nếu Uid vẫn là `110` (user dhcpd) thì override chưa nhận — chạy `systemctl cat isc-dhcp-server` xem drop-in được load chưa.

### 3.7. Mở terminal #2 để theo dõi log realtime

```bash
sudo journalctl -u isc-dhcp-server -f
```

Trong suốt phần còn lại của lab, terminal này sẽ stream mọi sự kiện DHCP — DISCOVER, OFFER, ICMP probe, abandon IP…

---

## 4. Cấu hình 2 Client DHCP

Thực hiện **cùng các bước** trên Client1 và Client2.

### 4.1. Netplan dùng DHCP

```bash
sudo tee /etc/netplan/50-cloud-init.yaml >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: true
EOF
sudo chmod 600 /etc/netplan/50-cloud-init.yaml
sudo netplan apply
```

Chờ ~5s, kiểm tra:
```bash
ip -br a show ens33
# Mong đợi: ens33 UP 192.168.100.100/24  (hoặc IP nào đó trong pool)
ip route
# default via 192.168.100.1 dev ens33
```

Test internet (chứng minh NAT của Server hoạt động):
```bash
ping -c2 8.8.8.8
```

### 4.2. Backup file netplan ở 2 chế độ (cho phần test sau)

Trên Client2 — chuẩn bị 2 file để chuyển nhanh:
```bash
# Mode "dhcp" (mặc định hiện tại)
sudo cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.dhcp

# Mode "manual" — sẽ tạo IP cụ thể trong phần test
```

---

## 5. Bắt gói DORA + phân tích field/option

### 5.1. Bắt 5 gói (Release → Discover → Offer → Request → ACK)

**Trên Server** (terminal #3), bắt vào file pcap:
```bash
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens37 -n -e -p -U \
  -w /tmp/dora.pcap '(udp port 67 or udp port 68) or arp or icmp'
```

> Dùng `systemd-run` thay vì `tcpdump &` để process không bị HUP khi shell thoát.

**Trên Client1**, ép release rồi xin lại để trigger đủ 5 gói:
```bash
sudo apt install -y isc-dhcp-client 2>/dev/null         # nếu chưa có
# Nếu Ubuntu chỉ có dhcpcd thì:
sudo dhcpcd --release ens33 2>/dev/null
sudo dhcpcd ens33

# Hoặc với networkd:
sudo networkctl renew ens33
```

Đợi ~10s, **trên Server** dừng tcpdump và phân tích:
```bash
sudo systemctl stop lab-tcpdump.service
sudo chmod +r /tmp/dora.pcap

# Liệt kê 5 gói DHCP
tshark -r /tmp/dora.pcap -Y 'bootp || dhcp' \
  -T fields -e frame.number -e frame.time_relative \
  -e ip.src -e ip.dst -e dhcp.option.dhcp_message_type
```

Output mong đợi (5 dòng):
```
1  0.000   192.168.100.106  192.168.100.1     7 (Release)
2  4.127   0.0.0.0          255.255.255.255   1 (Discover)
3  7.139   192.168.100.1    192.168.100.106   2 (Offer)
4  7.141   0.0.0.0          255.255.255.255   3 (Request)
5  7.145   192.168.100.1    192.168.100.106   5 (ACK)
```

### 5.2. Cơ chế DORA — sơ đồ tổng

```
CLIENT                                         SERVER
  │──── 1. DISCOVER (src 0.0.0.0 → broadcast) ────►│  "Có DHCP server nào không?"
  │◄─── 2. OFFER    (src server  → client)    ──────│  "Tôi đề xuất IP này cho bạn"
  │──── 3. REQUEST  (src 0.0.0.0 → broadcast) ────►│  "Tôi chọn offer của bạn"
  │◄─── 4. ACK      (src server  → client)    ──────│  "Xác nhận, IP của bạn từ giờ"
```

> **Tại sao DISCOVER và REQUEST đều broadcast?** Client chưa có IP nên không setup được kết nối unicast. REQUEST cũng broadcast để **tất cả** DHCP server khác cùng nghe → biết Client đã chọn server nào → tự giải phóng IP đã reserve.

### 5.3. Phân tích từng field của mỗi gói

Mỗi gói DHCP có **header cố định 236 byte** (kế thừa BOOTP) + phần Options variable. Mở từng gói trong Wireshark (filter `bootp` hoặc `dhcp`) để xem; dưới đây là field/option cốt lõi.

#### Gói 1 — DHCP Release

| Field          | Giá trị                  | Ý nghĩa                                                    |
|----------------|--------------------------|------------------------------------------------------------|
| `op`           | `1` (BOOTREQUEST)        | Client → Server                                            |
| `xid`          | `0xABCD1234`             | Transaction ID — khớp với phiên lease cũ                   |
| `ciaddr`       | `192.168.100.106`        | IP Client đang trả lại (khác DISCOVER là `0.0.0.0`)        |
| `chaddr`       | `00:0c:29:04:70:61`      | MAC Client                                                 |
| Option `53`    | `7` (RELEASE)            | DHCP Message Type                                          |
| Option `54`    | `192.168.100.1`          | Server ID — chỉ rõ server nào cần xoá lease                |

#### Gói 2 — DHCP Discover

| Field          | Giá trị                  | Ý nghĩa                                                    |
|----------------|--------------------------|------------------------------------------------------------|
| `op`           | `1` (BOOTREQUEST)        | Chiều đi: Client → Server                                  |
| `htype` `hlen` | `1` / `6`                | Ethernet, MAC 6 byte                                       |
| `xid`          | `0x3903F326`             | Transaction ID mới — random, dùng để khớp request/reply    |
| `flags`        | `0x8000`                 | **Broadcast flag = 1** — yêu cầu server broadcast reply    |
| `ciaddr`       | `0.0.0.0`                | Chưa có IP                                                 |
| `yiaddr`       | `0.0.0.0`                | Chưa được cấp                                              |
| `chaddr`       | `00:0c:29:04:70:61`      | **MAC — định danh chính của Client xuyên suốt DORA**       |
| Option `53`    | `1` (DISCOVER)           | DHCP Message Type                                          |
| Option `55`    | `[1, 3, 6, 12, 15, …]`   | Parameter Request List — "đặt hàng" subnet/router/DNS/…    |
| Option `61`    | `01:<MAC>`               | Client Identifier — thường là `01` + MAC                   |

#### Gói 3 — DHCP Offer

| Field          | Giá trị                  | Ý nghĩa                                                    |
|----------------|--------------------------|------------------------------------------------------------|
| `op`           | `2` (BOOTREPLY)          | Server → Client                                            |
| `xid`          | `0x3903F326`             | **Phải khớp xid của DISCOVER**                             |
| `yiaddr`       | `192.168.100.106`        | **IP server đề xuất cấp** (your IP address)                |
| `siaddr`       | `192.168.100.1`          | Server IP                                                  |
| `chaddr`       | `00:0c:29:04:70:61`      | Echo MAC từ DISCOVER                                       |
| Option `53`    | `2` (OFFER)              | DHCP Message Type                                          |
| Option `54`    | `192.168.100.1`          | Server Identifier                                          |
| Option `51`    | `120`                    | Lease time (giây)                                          |
| Option `1`     | `255.255.255.0`          | Subnet Mask                                                |
| Option `3`     | `192.168.100.1`          | Default Gateway                                            |
| Option `6`     | `8.8.8.8, 1.1.1.1`       | DNS Servers                                                |
| Option `28`    | `192.168.100.255`        | Broadcast Address                                          |

> Server **tạm thời reserve** IP này cho MAC này; nếu Client không REQUEST trong timeout, server thả ra.

#### Gói 4 — DHCP Request

| Field          | Giá trị                  | Ý nghĩa                                                    |
|----------------|--------------------------|------------------------------------------------------------|
| `op`           | `1` (BOOTREQUEST)        | Client → Server                                            |
| `xid`          | `0x3903F326`             | Giữ nguyên xid của phiên                                   |
| `flags`        | `0x8000`                 | Vẫn broadcast (chưa chính thức gán IP)                     |
| `ciaddr`       | `0.0.0.0`                | Client chưa commit IP                                      |
| Option `53`    | `3` (REQUEST)            | DHCP Message Type                                          |
| Option `54`    | `192.168.100.1`          | **"Tôi chọn server này"** — server khác sẽ giải phóng IP   |
| Option `50`    | `192.168.100.106`        | IP Client muốn (echo lại từ OFFER)                         |

#### Gói 5 — DHCP ACK

| Field          | Giá trị                  | Ý nghĩa                                                    |
|----------------|--------------------------|------------------------------------------------------------|
| `op`           | `2` (BOOTREPLY)          | Server → Client                                            |
| `xid`          | `0x3903F326`             | Khớp xid                                                   |
| `yiaddr`       | `192.168.100.106`        | Xác nhận IP                                                |
| Option `53`    | `5` (ACK)                | DHCP Message Type                                          |
| Option `51`    | `120`                    | **Lease time chính thức bắt đầu**                          |
| Option `58`    | `60` (T1)                | Renewal time — Client unicast renew với server hiện tại    |
| Option `59`    | `105` (T2)               | Rebinding time — Client broadcast tìm server bất kỳ        |
| Option `3, 6`  | (giống Offer)            | Router & DNS                                               |

> Sau ACK, Client gán IP vào interface, thêm default route, set DNS. Đồng hồ **T1 = 50% lease**, **T2 = 87.5% lease** bắt đầu chạy.

### 5.4. Vai trò của MAC xuyên suốt lab

| Giai đoạn        | Field chứa MAC                    | Vai trò                                              |
|------------------|-----------------------------------|------------------------------------------------------|
| DHCP Discover    | `chaddr` + Option 61              | Định danh Client để server tạo lease                 |
| DHCP Offer/ACK   | `chaddr` trong lease table        | Đảm bảo cùng MAC → cùng IP mỗi lần xin              |
| ARP Probe        | Sender MAC                        | Kiểm tra IP conflict TRƯỚC KHI dùng                  |
| Gratuitous ARP   | Sender MAC                        | Tuyên bố "IP này là của tôi" — dấu hiệu trùng IP    |

> **Tại sao MAC là định danh, không phải IP?** Khi DISCOVER, Client chưa có IP. MAC là địa chỉ vật lý (gắn cứng card mạng), duy nhất trong LAN — cách duy nhất để server nhận ra "đây là máy nào" và cấp IP nhất quán mỗi lần.

---

## 6. Kiến thức nền: ARP Probe vs Gratuitous ARP

Đây là **hai loại ARP đặc biệt** mà bài tập yêu cầu phân biệt. Cả 2 đều là ARP **Request** (opcode 1) broadcast, nhưng khác nhau ở **Sender Protocol Address**:

### 6.1. ARP Probe (RFC 5227)

Máy đang **hỏi** xem IP này có ai dùng không, trước khi tự mình claim. Để **không gây ô nhiễm ARP cache** của các máy khác, máy hỏi cố ý đặt sender IP = `0.0.0.0`:

```
ARP Request (Probe):
  Sender MAC : 00:0c:29:04:70:61
  Sender IP  : 0.0.0.0            ← ĐẶC TRƯNG ARP PROBE
  Target MAC : 00:00:00:00:00:00
  Target IP  : 192.168.100.105    ← IP đang được kiểm tra
  Broadcast  → ff:ff:ff:ff:ff:ff
```

Trong tcpdump hiện dưới dạng:
```
who-has 192.168.100.105 tell 0.0.0.0
```

**Hành vi**:
- Không ai reply → IP an toàn → máy commit gán IP vào interface.
- Có máy reply → máy hủy ý định, từ chối gán IP (kernel ghi `IPv4 address conflict detected`).

### 6.2. Gratuitous ARP

Máy đang **tuyên bố** "IP này là của tôi" để cập nhật ARP cache của mọi người. Đặc trưng `Sender IP = Target IP`:

```
ARP Request (Gratuitous):
  Sender MAC : 00:0c:29:04:70:61
  Sender IP  : 192.168.100.106    ← Sender IP
  Target IP  : 192.168.100.106    ← Target IP = Sender IP
  Broadcast  → ff:ff:ff:ff:ff:ff
```

Trong tcpdump:
```
who-has 192.168.100.106 tell 192.168.100.106
```

**Mục đích chính đáng**: máy mới khởi động báo MAC mới của IP (vd. sau khi VRRP failover). **Khi bị lạm dụng**: máy thứ 2 dùng để claim IP của máy đang dùng → conflict.

### 6.3. Bảng nhanh phân biệt

| | ARP Probe | Gratuitous ARP |
|---|---|---|
| RFC chuẩn | RFC 5227 | RFC 826 (extension) |
| Sender IP | `0.0.0.0` | = Target IP |
| Mục đích | Hỏi "có ai dùng IP X không?" | Tuyên bố "X là của tôi" |
| Khi nào gửi | Trước khi gán IP mới | Sau khi gán IP / kiểm tra conflict |
| Filter Wireshark | `arp.opcode == 1 && arp.src.proto_ipv4 == 0.0.0.0` | `arp.src.proto_ipv4 == arp.dst.proto_ipv4` |

---

## 7. CASE A — Manual đặt **TRƯỚC**

> **Kịch bản** — Client2 đặt static `.100` từ trước. Sau đó Client1 xin DHCP fresh. Kỳ vọng: server `ping-check` thấy `.100` đang được dùng → **abandon** `.100` → cấp `.101` cho Client1.

### 7.1. Chuẩn bị Client2 — file netplan "manual"

Trên **Client2**:
```bash
sudo tee /etc/netplan/50-cloud-init.yaml.manual >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.100.100/24]
      routes:
        - to: default
          via: 192.168.100.1
      nameservers:
        addresses: [8.8.8.8]
EOF
sudo chmod 600 /etc/netplan/50-cloud-init.yaml.manual
```

### 7.2. Reset môi trường trên Server

Wipe lease DB để pool trở về trạng thái sạch:
```bash
sudo systemctl stop isc-dhcp-server
sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server
```

### 7.3. Trên Client2 — kích hoạt manual `.100`

```bash
sudo cp /etc/netplan/50-cloud-init.yaml.manual /etc/netplan/50-cloud-init.yaml
sudo netplan apply
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.100.100/24
```

Trên Server (terminal log dhcpd) sẽ thấy:
```
DHCPRELEASE of 192.168.100.X from <MAC C2> via ens37 (found)
```
nghĩa là networkd của Client2 đã trả lại IP cũ trước khi chuyển sang static.

Xác nhận từ Server bằng arping:
```bash
sudo arping -c2 -I ens37 192.168.100.100
# → Unicast reply from 192.168.100.100 [MAC của Client2]
```

### 7.4. Trên Server — bắt gói

```bash
sudo systemctl reset-failed lab-tcpdump.service 2>/dev/null
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens37 -n -e -p -U \
  -w /tmp/case-A.pcap '(udp port 67 or udp port 68) or arp or icmp'
```

### 7.5. Trên Client1 — ép phát DISCOVER **mới hoàn toàn**

Quan trọng: nếu Client1 vẫn nhớ lease cũ, networkd làm INIT-REBOOT (REQUEST IP cũ) → server có thể ACK ngay → **không qua ping-check**. Phải xoá hết "ký ức":

```bash
sudo systemctl stop systemd-networkd systemd-networkd.socket
sudo rm -f /run/systemd/netif/leases/*
sudo ip addr flush dev ens33
sudo ip link set ens33 down
sleep 1
sudo ip link set ens33 up
sleep 1

# Phát DISCOVER fresh qua dhcpcd one-shot
sudo dhcpcd -1 -t 20 -B ens33

ip -br a show ens33
# Mong đợi: 192.168.100.101/24  (vì .100 đã có máy)
```

### 7.6. Trên Server — dừng tcpdump, xem bằng chứng

```bash
sudo systemctl stop lab-tcpdump.service
sudo chmod +r /tmp/case-A.pcap
```

**Bằng chứng #1 — log dhcpd:**
```
DHCPDISCOVER from <MAC C1> via ens37
ICMP Echo reply while lease 192.168.100.100 valid.    ← Client2 trả lời ping
Abandoning IP address 192.168.100.100: pinged before offer
DHCPOFFER on 192.168.100.101 to <MAC C1> via ens37
DHCPREQUEST for 192.168.100.101 …
DHCPACK on 192.168.100.101 to <MAC C1> via ens37
```

**Bằng chứng #2 — lease DB:**
```bash
sudo cat /var/lib/dhcp/dhcpd.leases
```
```
lease 192.168.100.100 {
  binding state abandoned;       ← BỊ ĐÁNH DẤU
  …
}
lease 192.168.100.101 {
  binding state active;
  hardware ethernet <MAC C1>;
}
```

**Bằng chứng #3 — pcap:**
```bash
tcpdump -nn -tt -e -r /tmp/case-A.pcap | head
```
Thứ tự gói chuẩn:
```
… BOOTP/DHCP, Discover from <MAC C1>
… 192.168.100.1 > 192.168.100.100: ICMP echo request    ← server pinging
… 192.168.100.100 > 192.168.100.1: ICMP echo reply      ← Client2 reply!
… BOOTP/DHCP, Offer for 192.168.100.101 to <MAC C1>
… BOOTP/DHCP, Request
… BOOTP/DHCP, ACK
```

### 7.7. Kết luận Case A

- ICMP `ping-check` hoạt động đúng RFC: server gửi ICMP echo **trước OFFER**.
- Client2 trả lời → server **abandon `.100`**, chuyển sang IP kế tiếp.
- IP `.100` rơi vào trạng thái `abandoned`, **server không cấp lại** cho đến khi reset DB → **pool teo dần** nếu IP tĩnh nằm trong range.

### 7.8. (Tuỳ chọn) So sánh khi `ping-check off`

Sửa `dhcpd.conf`: `ping-check false;` rồi restart. Lặp lại 7.2–7.6. Lần này server sẽ OFFER thẳng `.100`. Sau đó tuỳ Client mà có `DECLINE` hay không (xem Case B / mục 8.6).

---

## 8. CASE B — Manual đặt **SAU**

> **Kịch bản** — Client1 đang giữ `.100` qua DHCP. Sau đó Client2 đặt static cùng `.100`. Quan sát ARP flap, kernel log, và (nếu dùng dhcpcd) DHCPDECLINE → APIPA fallback.

### 8.1. Reset trạng thái sạch

Trên Client2:
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.dhcp /etc/netplan/50-cloud-init.yaml
sudo netplan apply
```

Trên Server:
```bash
sudo systemctl stop isc-dhcp-server
sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server
```

Trên cả 2 client — ép xin DHCP fresh (lặp lại block 7.5). Kết quả mẫu:
- Client1 (MAC c4:f1:be) → `192.168.100.100`
- Client2 (MAC 4c:8b:da) → `192.168.100.101`

Lưu IP của Client1 vào biến cho dễ thao tác:
```bash
# Trên Server
arp -n | grep 192.168.100
# Ví dụ: 192.168.100.100  ether  00:0c:29:c4:f1:be  C  ens37   ← Client1
#         192.168.100.101  ether  00:0c:29:4c:8b:da  C  ens37   ← Client2
```

### 8.2. Chuẩn bị Client2 — netplan "steal IP của Client1"

```bash
sudo tee /etc/netplan/50-cloud-init.yaml.steal >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.100.100/24]    # ← IP Client1 đang giữ
      routes:
        - to: default
          via: 192.168.100.1
      nameservers:
        addresses: [8.8.8.8]
EOF
sudo chmod 600 /etc/netplan/50-cloud-init.yaml.steal
```

### 8.3. Trên Server — bắt gói

```bash
sudo systemctl reset-failed lab-tcpdump.service 2>/dev/null
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens37 -n -e -p -U \
  -w /tmp/case-B.pcap '(udp port 67 or udp port 68) or arp or icmp'
```

### 8.4. Trên Client2 — kích hoạt manual lấn IP

```bash
sudo cp /etc/netplan/50-cloud-init.yaml.steal /etc/netplan/50-cloud-init.yaml
sudo netplan apply
ip -br a show ens33
# Mong đợi: 192.168.100.100/24   ← TRÙNG với Client1
sudo dmesg | tail -5
# Tuỳ kernel có thể thấy: "IPv4: address conflict detected"
```

### 8.5. Trên Server — quan sát MAC flap bằng arping

Chạy nhiều lần để bắt thấy 2 MAC luân phiên trả lời:
```bash
for i in 1 2 3 4 5 6 7 8; do
  echo "=== probe $i ==="
  sudo arping -c2 -w 1 -I ens37 192.168.100.100
  sleep 1
done
```

Kết quả tiêu biểu:
```
Unicast reply from 192.168.100.100 [00:0C:29:C4:F1:BE]   ← Client1
Unicast reply from 192.168.100.100 [00:0C:29:4C:8B:DA]   ← Client2
Unicast reply from 192.168.100.100 [00:0C:29:C4:F1:BE]
Unicast reply from 192.168.100.100 [00:0C:29:4C:8B:DA]
```

**Hai MAC khác nhau cùng claim cùng một IP** — chính xác hiện tượng "ARP cache flapping".

### 8.6. Demo DHCPDECLINE → APIPA fallback (chỉ với `dhcpcd`)

`systemd-networkd` **mặc định không gửi DECLINE** — nó "ngoan ngoãn" gán IP dù có conflict. Để demo chuỗi DECLINE → APIPA đúng RFC 3927, dùng `dhcpcd` trên Client1.

**Setup trước**: làm cho Client2 ở trạng thái manual đã chiếm `.100`. Trên Client1:

```bash
sudo systemctl stop systemd-networkd systemd-networkd.socket
sudo rm -f /run/systemd/netif/leases/*
sudo ip addr flush dev ens33
sudo ip link set ens33 down
sleep 1
sudo ip link set ens33 up
sleep 1

# Bật dhcpcd với DECLINE + IPv4LL fallback
sudo dhcpcd -1 -t 20 ens33
```

Trong stdout của `dhcpcd` (hoặc xem `/var/log/dhcpcd.log` hoặc `journalctl -u dhcpcd`):
```
ens33: offered 192.168.100.100 from 192.168.100.1
ens33: probing address 192.168.100.100/24
ens33: DAD detected 00:0c:29:4c:8b:da using 192.168.100.100  ← Client2 reply!
ens33: 192.168.100.100 declined
ens33: probing for an IPv4LL address
ens33: leased 169.254.123.45 for infinity                     ← APIPA fallback
```

Trên Server xem log dhcpd:
```
DHCPDECLINE of 192.168.100.100 from <MAC C1> via ens37: abandoned
```

> **APIPA (`169.254.0.0/16`)** là dải IANA reserved cho link-local (RFC 3927). Máy dùng APIPA chỉ liên lạc trong cùng L2 segment, không có default route — không ra internet được.

### 8.7. Dừng tcpdump, xem pcap

```bash
sudo systemctl stop lab-tcpdump.service
sudo chmod +r /tmp/case-B.pcap
tcpdump -nn -tt -e -r /tmp/case-B.pcap | head -30
```

Trong pcap (lọc Wireshark `arp.dst.proto_ipv4 == 192.168.100.100`), bạn sẽ thấy:
- ARP Probe từ Client2 (sender `0.0.0.0`)
- ARP Reply từ Client1 (sender `192.168.100.100`)
- Sau đó nhiều ARP Request/Reply có 2 MAC khác nhau cùng "is-at 192.168.100.100"

### 8.8. Kết luận Case B

- DHCP server **không phát hiện** xung đột vì nó chỉ kiểm tra trước khi cấp; sau khi ACK rồi không giám sát tiếp.
- Phía Client phụ thuộc vào **DHCP client implementation**:
  - `dhcpcd` → ARP probe → DAD → DHCPDECLINE → IPv4LL/APIPA ✓
  - `systemd-networkd` mặc định → gán IP ngay, không DECLINE → cả 2 cùng claim → mạng "loạn".
- ARP cache trên các máy khác bị flap; traffic tới `.100` đôi khi về Client1, đôi khi Client2 → TCP đứt, mất gói.
- **Phòng ngừa thực tế**: DHCP snooping + Dynamic ARP Inspection ở switch, IPAM theo dõi cả IP static.

---

## 9. So sánh 2 case (mẫu cho báo cáo)

| Tiêu chí                       | Case A (manual TRƯỚC)               | Case B (manual SAU)                       |
|--------------------------------|-------------------------------------|-------------------------------------------|
| Cơ chế bảo vệ chính            | `ping-check` của DHCP server (ICMP) | `ARP Probe/DAD` của kernel Client         |
| Loại ARP đặc trưng             | **ICMP echo/reply** (không phải ARP)| **Gratuitous ARP** + ARP Probe failed     |
| Bên "thua" trong xung đột      | DHCP server (nhường, cấp IP khác)   | Tuỳ DHCP client: dhcpcd lùi (APIPA), networkd cứng đầu |
| Gói đặc trưng                  | DISCOVER → ICMP echo → ICMP reply → OFFER IP khác | ARP request → **2 MAC** cùng reply 1 IP |
| Trạng thái IP trong pool       | `abandoned`                         | Vẫn `active`                              |
| Hậu quả thực tế                | Pool DHCP teo dần                   | Đứt mạng, MAC flap, fallback APIPA       |
| Best practice phòng ngừa       | Không đặt IP tĩnh trong range DHCP, dùng `host { fixed-address }` reservation | Như trên + DHCP snooping + DAI ở switch + DAD strict ở client |

### Vai trò MAC xuyên suốt lab (cho phần "Phân tích")

| Giai đoạn        | Field chứa MAC                    | Vai trò                                              |
|------------------|-----------------------------------|------------------------------------------------------|
| DHCP Discover    | `chaddr` + Option 61              | Định danh Client để server tạo lease                 |
| DHCP Offer/ACK   | `chaddr` + lease table            | Đảm bảo cùng MAC → cùng IP mỗi lần xin              |
| ARP Probe        | Sender MAC (sender IP = 0.0.0.0)  | Hỏi "có ai dùng IP này không?"                       |
| Gratuitous ARP   | Sender MAC (sender IP = target IP)| Tuyên bố "IP này là của tôi" / dấu hiệu conflict     |

---

## 10. Wireshark filter & checklist screenshot

### 10.1. Filter Wireshark hữu ích

| Mục đích                                | Display Filter                                              |
|-----------------------------------------|-------------------------------------------------------------|
| Chỉ DHCP (Wireshark cũ)                 | `bootp`                                                     |
| Chỉ DHCP (Wireshark mới)                | `dhcp`                                                      |
| Chỉ ARP                                 | `arp`                                                       |
| ICMP (ping-check của server)            | `icmp`                                                      |
| Gói DHCP của 1 client cụ thể            | `dhcp.hw.mac_addr == 00:0c:29:c4:f1:be`                     |
| ARP Probe                               | `arp.opcode == 1 and arp.src.proto_ipv4 == 0.0.0.0`         |
| Gratuitous ARP                          | `arp.src.proto_ipv4 == arp.dst.proto_ipv4`                  |
| ARP cho IP cụ thể                       | `arp.dst.proto_ipv4 == 192.168.100.100 \|\| arp.src.proto_ipv4 == 192.168.100.100` |
| Chỉ DHCPDECLINE                         | `dhcp.option.dhcp == 4`                                     |
| Theo xid                                | `dhcp.id == 0x3903F326`                                     |

### 10.2. Checklist screenshot cho báo cáo

**Setup**
- [ ] Virtual Network Editor — VMnet1 tắt DHCP
- [ ] Settings VM Server (2 NIC) + Settings VM Client
- [ ] `ip -br a` của Server (2 NIC active, ens37=100.1)
- [ ] `iptables -t nat -L -n` cho thấy MASQUERADE
- [ ] `sysctl net.ipv4.ip_forward` = 1
- [ ] `dhcpd -t -cf /etc/dhcp/dhcpd.conf` OK
- [ ] Client `ip -br a` cho thấy IP trong pool + `ping 8.8.8.8` thành công

**DORA**
- [ ] Wireshark hiển thị đủ 5 gói Release → Discover → Offer → Request → ACK
- [ ] Expand từng gói: chụp **Option 53** (Message Type), **Option 51** (Lease Time), **Option 54** (Server ID), **Option 50** (Requested IP) trong REQUEST
- [ ] Highlight `xid` giống nhau giữa Discover/Offer/Request/ACK
- [ ] Highlight `chaddr` = MAC Client

**Case A**
- [ ] Log dhcpd có dòng `Abandoning IP address … pinged before offer`
- [ ] Lease DB có `binding state abandoned`
- [ ] Wireshark — gói ICMP echo `100.1 → 100.100` và reply `100.100 → 100.1` chen GIỮA DISCOVER và OFFER
- [ ] OFFER là IP kế tiếp trong pool (.101)

**Case B**
- [ ] `arping` từ Server cho thấy 2 MAC luân phiên reply cùng IP
- [ ] Wireshark lọc `arp` cho thấy ARP Probe (sender `0.0.0.0`) và Gratuitous ARP (sender = target)
- [ ] (Nếu dùng dhcpcd) log có `DAD detected … declined` + `IPv4LL` + log dhcpd có `DHCPDECLINE`
- [ ] Client1 cuối cùng nhận IP `169.254.x.x`

---

## 11. Cleanup

### Trên 2 Client — quay về DHCP bình thường
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.dhcp /etc/netplan/50-cloud-init.yaml
sudo netplan apply

# Nếu cần restart networkd
sudo systemctl unmask systemd-networkd.service systemd-networkd.socket 2>/dev/null
sudo systemctl enable --now systemd-networkd
```

### Trên Server — tắt DHCP server (giữ NAT nếu muốn dùng tiếp)
```bash
sudo systemctl disable --now isc-dhcp-server
sudo rm /etc/systemd/system/isc-dhcp-server.service.d/override.conf
sudo systemctl daemon-reload
```

### Khôi phục netplan gốc
```bash
sudo rm /etc/netplan/99-lab.yaml
sudo mv /etc/netplan/50-cloud-init.yaml.bak /etc/netplan/50-cloud-init.yaml 2>/dev/null
sudo netplan apply
```

### Gỡ NAT (nếu muốn)
```bash
sudo iptables -t nat -F
sudo iptables -F FORWARD
sudo netfilter-persistent save
```

---

## 12. Phụ lục — Troubleshooting & bẫy thực tế

| Triệu chứng | Nguyên nhân | Khắc phục |
|---|---|---|
| `dhcpd -t` fail "Can't open dhcpd.leases" | Mode/owner sai (do override unit chạy as root mà file vẫn dhcpd:dhcpd) | `chown root:root /var/lib/dhcp/dhcpd.leases && chmod 644` |
| `ping-check` không hoạt động, server cấp IP đã có máy | `dhcpd` chạy as `dhcpd` user → mất `CAP_NET_RAW` | Drop-in unit chạy as root (mục 3.6) |
| Server log không thấy DISCOVER khi Client renew | `networkd` đang INIT-REBOOT (gửi REQUEST IP cũ), không phải DISCOVER | Stop networkd + `rm /run/systemd/netif/leases/*` + restart, hoặc dùng `dhcpcd -1` |
| `iptables INPUT ... -j DROP` không chặn được DHCP từ DHCP server khác | DHCP client dùng AF_PACKET raw socket — bypass IP layer | Dùng `nftables netdev/ingress` priority -300 |
| Filter nftables biến mất sau `ip link down/up` | netdev hook bị tear down khi link down | Re-apply qua `networkd-dispatcher /etc/networkd-dispatcher/routable.d/` |
| `[sudo] password for...` chèn vào script khi pipe heredoc | `sudo -S` nuốt stdin heredoc | Tách 2 bước: ghi file `/tmp` rồi `sudo cp` |
| Mất SSH sau `ip addr flush dev ens33` | Shell SSH chết theo IP | Dùng `systemd-run --on-active=Ns …` để schedule lệnh chạy sau khi SSH ngắt |
| Pool DHCP nhanh hết do nhiều test → server NAK | Nhiều IP bị `abandoned` | Wipe: `sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases' && sudo systemctl restart isc-dhcp-server` |
| Client ping internet không được | Forwarding tắt, hoặc thiếu MASQUERADE | `sysctl net.ipv4.ip_forward=1` + `iptables -t nat -A POSTROUTING -o ens33 -j MASQUERADE` |
| `systemctl stop systemd-networkd` không dừng được DHCP | Socket activation re-spawn | `systemctl stop systemd-networkd.socket` cùng lúc, hoặc `systemctl mask` |
| `dhcpcd` báo "exiting due to oneshot" rồi mất IP | Đó là `-1` mode (oneshot), bình thường | Sau ACK, IP đã gán; nếu muốn dhcpcd ở lại nền, bỏ `-1` |
| Wireshark filter `dhcp` không có gì hiện | Wireshark cũ chỉ hiểu `bootp` | Thử `bootp` thay vì `dhcp` |

---

## Tệp sau lab

```
/home/dhcp-username/dhcp-lab/STEP-BY-STEP.md     # tài liệu này
/home/dhcp-username/dhcp-lab/REPORT.md           # báo cáo phân tích case A/B (output cũ)
/tmp/dora.pcap                                    # 5 gói Release→Discover→Offer→Request→ACK
/tmp/case-A.pcap                                  # ping-check skip
/tmp/case-B.pcap                                  # ARP flap (+ optional DECLINE/APIPA)
```

Sao chép pcap về host để mở Wireshark:
```bash
# Trên host
scp dhcp-server@<IP_VMnet8>:/tmp/*.pcap .
wireshark dora.pcap
```
