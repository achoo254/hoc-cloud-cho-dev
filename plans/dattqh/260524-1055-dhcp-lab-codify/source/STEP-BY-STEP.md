# LAB DHCP Server – Client trên Ubuntu 24.04
## Hướng dẫn thực hiện thủ công, từng bước

> Tài liệu này tóm tắt lại toàn bộ thao tác để bạn có thể **bấm tay** thực hiện đúng quá trình mà agent đã chạy. Mọi câu lệnh đều có thể copy-paste trực tiếp vào terminal. Nơi nào IP/MAC khác máy của bạn, hãy đổi cho khớp.

---

## 0. Mục tiêu bài tập

1. Dựng 1 DHCP server + 1 client trên Ubuntu 24.04 (VMware Workstation).
2. Bắt gói DORA (DHCPDISCOVER/OFFER/REQUEST/ACK) bằng tcpdump/Wireshark.
3. Thêm 1 client thứ 2 đặt IP manual **trùng** IP đã cấp cho client DHCP; quan sát hiện tượng. Lab này test 2 trường hợp:
   - **Case A** – manual đặt **TRƯỚC** (IP chưa từng được DHCP cấp).
   - **Case B** – manual đặt **SAU** (IP đã được DHCP cấp cho client khác).

---

## 1. Chuẩn bị 3 VM trên VMware Workstation

### 1.1. Tạo 3 VM Ubuntu Server 24.04

| VM           | Hostname          | Username       | Password   |
|--------------|-------------------|----------------|------------|
| Server       | `dhcp-server`     | `dhcp-server`  | `7335140`  |
| Client1      | `dhcp-client`     | `dhcp-client`  | `7335140`  |
| Client2      | `dhcp-client-2`   | `dhcp-client-2`| `7335140`  |

Cài tối thiểu: Ubuntu Server 24.04, OpenSSH server.

### 1.2. Network adapter

Tất cả 3 VM cùng một mạng. Có **2 lựa chọn**:

#### Lựa chọn (A) – Dùng host-only VMnet sạch (KHUYẾN NGHỊ cho lab này)

Trên máy host (Windows/Linux chủ): **VMware Workstation → Edit → Virtual Network Editor**

1. Bấm **Add Network** → chọn 1 VMnet trống (vd. VMnet10), kiểu **Host-only**.
2. Subnet: `192.168.50.0/24`, gateway tuỳ ý.
3. **Bỏ tick** "Use local DHCP service to distribute IP" — đây là bước **cực kỳ quan trọng**, vì VMware có DHCP riêng sẽ tranh OFFER với DHCP server của bạn.
4. Cấu hình mỗi VM (Settings → Network Adapter → Custom) trỏ về VMnet10.
5. Đổi mọi IP `192.168.81.x` trong tài liệu này thành `192.168.50.x`.

#### Lựa chọn (B) – Dùng VMnet8 NAT có sẵn (như lab thực tế trong session này)

VMnet8 mặc định có **VMware DHCP server** chạy ở `192.168.81.254` → sẽ chen vào tranh OFFER với DHCP server của ta. Có 2 cách xử lý:

- **B.1** – Tắt nó trên host: Virtual Network Editor → VMnet8 → bỏ tick **Use local DHCP service**. (Đơn giản nhất.)
- **B.2** – Không đụng đến host, dùng **nftables filter** trên từng client để chặn DHCP reply không đến từ DHCP server của bạn. (Phức tạp hơn; tài liệu này có hướng dẫn ở bước 4.)

Phần còn lại của tài liệu giả định bạn ở **trường hợp B.2** (giống lab thực tế chúng ta vừa chạy), subnet `192.168.81.0/24`, server đặt tại `.128`. Nếu chọn (A) hoặc (B.1) thì bỏ qua các bước cài nftables filter.

### 1.3. IP của 3 VM (sẽ đặt sau)

| Role     | IP cuối cùng       | Ghi chú                        |
|----------|--------------------|--------------------------------|
| Server   | `192.168.81.128/24`| Đặt tĩnh                       |
| Client1  | DHCP từ pool       | sẽ nhận `.200` hoặc `.201`     |
| Client2  | DHCP từ pool       | sẽ nhận `.200` hoặc `.201`     |

---

## 2. Cấu hình SERVER (`192.168.81.128`)

Login vào VM server (user `dhcp-server`, password `7335140`).

### 2.1. Cài gói cần thiết
```bash
sudo apt update
sudo apt install -y isc-dhcp-server tcpdump iputils-arping
# (tuỳ chọn để phân tích pcap trên server) 
sudo apt install -y tshark
```

### 2.2. Đặt IP tĩnh cho server qua netplan

Backup file netplan cũ rồi tạo mới:
```bash
sudo cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.bak
sudo tee /etc/netplan/99-lab.yaml >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.81.128/24]
      routes:
        - to: default
          via: 192.168.81.2          # gateway NAT của VMware
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
EOF
sudo chmod 600 /etc/netplan/99-lab.yaml
sudo mv /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.bak2 2>/dev/null
sudo netplan apply
```

Kiểm tra:
```bash
ip -br a show ens33
# Mong đợi: ens33 UP 192.168.81.128/24 …
```

### 2.3. Cấu hình interface phục vụ DHCP

```bash
sudo tee /etc/default/isc-dhcp-server >/dev/null <<'EOF'
INTERFACESv4="ens33"
INTERFACESv6=""
EOF
```

### 2.4. Cấu hình dải cấp phát (`/etc/dhcp/dhcpd.conf`)

```bash
sudo tee /etc/dhcp/dhcpd.conf >/dev/null <<'EOF'
# Lab DHCP — pool CỐ TÌNH NHỎ chỉ 2 IP để dễ test conflict
default-lease-time 120;     # 2 phút cho dễ quan sát renew
max-lease-time 300;
authoritative;

# Trước khi cấp 1 IP, server gửi ICMP echo. Nếu có máy đang dùng -> bỏ qua IP đó.
ping-check true;
ping-timeout 1;

log-facility local7;

subnet 192.168.81.0 netmask 255.255.255.0 {
  range 192.168.81.200 192.168.81.201;     # CHỈ 2 IP

  option routers 192.168.81.2;
  option domain-name-servers 8.8.8.8, 1.1.1.1;
  option broadcast-address 192.168.81.255;
}
EOF
```

Kiểm tra cú pháp:
```bash
sudo dhcpd -t -cf /etc/dhcp/dhcpd.conf
```

### 2.5. ⚠ Sửa lỗi `ping-check` không hoạt động (RẤT QUAN TRỌNG)

Mặc định systemd unit chạy `dhcpd` dưới user `dhcpd` (không phải root), nên **mất capability `CAP_NET_RAW`** → server không gửi được ICMP probe → **ping-check thầm lặng vô hiệu hóa**. Cần override để chạy as root:

```bash
sudo mkdir -p /etc/systemd/system/isc-dhcp-server.service.d
sudo tee /etc/systemd/system/isc-dhcp-server.service.d/override.conf >/dev/null <<'EOF'
[Service]
ExecStart=
ExecStart=/usr/sbin/dhcpd -f -4 -pf /run/dhcp-server/dhcpd.pid -cf /etc/dhcp/dhcpd.conf ens33
EOF

# Sửa quyền lease file để root mở được
sudo chown root:root /var/lib/dhcp /var/lib/dhcp/dhcpd.leases
sudo chmod 755 /var/lib/dhcp
sudo chmod 644 /var/lib/dhcp/dhcpd.leases

sudo systemctl daemon-reload
sudo systemctl restart isc-dhcp-server
```

Kiểm tra dhcpd chạy as root với đủ caps:
```bash
PID=$(pidof dhcpd | awk '{print $1}')
grep -E "^Uid|^CapEff" /proc/$PID/status
# Mong đợi:  Uid: 0 0 0 0   CapEff: 000001ffffffffff
```

Nếu `Uid: 0` ⇒ ping-check hoạt động. Nếu vẫn ra Uid 110 (user dhcpd), override chưa nhận → kiểm tra `systemctl cat isc-dhcp-server` để chắc drop-in được load.

### 2.6. Theo dõi log server (giữ mở 1 terminal trong suốt lab)
```bash
sudo journalctl -u isc-dhcp-server -f
```

---

## 3. Cấu hình CLIENT1 (`dhcp-client`)

Login Client1.

### 3.1. Netplan dùng DHCP
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
```

### 3.2. (Trường hợp B.2) Cài nftables filter chặn VMware DHCP

Mục tiêu: chỉ chấp nhận DHCP reply đến từ `192.168.81.128` (DHCP server của ta), bỏ qua phản hồi từ VMware DHCP `192.168.81.254`. Vì systemd-networkd dùng **raw socket AF_PACKET** nên `iptables INPUT` **bị bỏ qua**; phải dùng **nftables netdev/ingress** hook (chạy ở tầng L2, sớm hơn AF_PACKET).

```bash
# Cài rule
sudo nft -f - <<'NFT'
table netdev dhcpfilter {
  chain ingress {
    type filter hook ingress device "ens33" priority -300;
    ip saddr != 192.168.81.128 udp sport 67 counter drop
  }
}
NFT

# Lưu thành file để load lại sau reboot
sudo tee /etc/nftables-lab.conf >/dev/null <<'NFT'
table netdev dhcpfilter {
  chain ingress {
    type filter hook ingress device "ens33" priority -300;
    ip saddr != 192.168.81.128 udp sport 67 counter drop
  }
}
NFT

# systemd unit auto-load lúc boot
sudo tee /etc/systemd/system/dhcp-filter.service >/dev/null <<'EOF'
[Unit]
Description=DHCP lab nftables filter
DefaultDependencies=no
After=network-pre.target
Before=systemd-networkd.service
Wants=network-pre.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=-/usr/sbin/nft delete table netdev dhcpfilter
ExecStart=/usr/sbin/nft -f /etc/nftables-lab.conf
ExecStop=-/usr/sbin/nft delete table netdev dhcpfilter

[Install]
WantedBy=multi-user.target sysinit.target
EOF

# Re-apply filter sau khi link up (vì hook netdev có thể mất khi link bounce)
sudo mkdir -p /etc/networkd-dispatcher/routable.d
sudo tee /etc/networkd-dispatcher/routable.d/50-dhcp-filter >/dev/null <<'EOF'
#!/bin/sh
/usr/sbin/nft delete table netdev dhcpfilter 2>/dev/null
/usr/sbin/nft -f /etc/nftables-lab.conf 2>/dev/null
EOF
sudo chmod +x /etc/networkd-dispatcher/routable.d/50-dhcp-filter

sudo systemctl daemon-reload
sudo systemctl enable --now dhcp-filter.service
```

Kiểm tra:
```bash
sudo nft list table netdev dhcpfilter
# Mong đợi thấy rule "ip saddr != 192.168.81.128 udp sport 67 counter drop"
```

### 3.3. Buộc Client1 xin DHCP mới từ server của ta
```bash
sudo rm -f /run/systemd/netif/leases/*
sudo systemctl restart systemd-networkd
sleep 3
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.81.200/24 hoặc 192.168.81.201/24
```

---

## 4. Cấu hình CLIENT2 (`dhcp-client-2`)

Lặp lại **bước 3.1, 3.2, 3.3** trên Client2 (giống Client1 hoàn toàn). Sau bước 3.3, Client2 sẽ nhận IP còn lại trong pool (vd. `.201`).

Sau khi cả 2 client lên DHCP từ server:
- Trên server, log sẽ thấy:
  ```
  DHCPDISCOVER from 00:0c:29:c4:f1:be via ens33
  DHCPOFFER on 192.168.81.200 to 00:0c:29:c4:f1:be …
  DHCPREQUEST for 192.168.81.200 …
  DHCPACK on 192.168.81.200 …
  ```
- Trên server gõ `arp -n` hoặc `ip neigh | grep 192.168.81` để thấy MAC của 2 client.
- Ghi nhớ MAC ↔ IP mapping (cần cho các bước sau).

---

## 5. Bắt gói DORA cơ bản (kiểm tra setup đã chạy)

### 5.1. Trên server, mở terminal mới và bắt gói:
```bash
sudo tcpdump -i ens33 -n -e -vv -w /tmp/dora.pcap '(udp port 67 or udp port 68) or arp or icmp'
```
(Để chạy ngầm, có thể dùng `systemd-run --unit=lab-tcpdump --collect /usr/bin/tcpdump …` thay vì `&` — cách `&` thường bị HUP khi shell thoát.)

### 5.2. Trên Client1, ép xin DHCP lại:
```bash
sudo rm -f /run/systemd/netif/leases/*
sudo systemctl restart systemd-networkd
```

### 5.3. Quay lại server, Ctrl+C dừng tcpdump, mở pcap:
```bash
sudo chmod +r /tmp/dora.pcap
tcpdump -nn -tt -e -r /tmp/dora.pcap | head
# hoặc: wireshark /tmp/dora.pcap
```

Lọc Wireshark: `bootp` → thấy đủ 4 gói **DHCPDISCOVER → OFFER → REQUEST → ACK**.

---

## 6. CASE A – Manual đặt **TRƯỚC**

> **Kịch bản**: trước khi DHCP server cấp IP `.200` cho ai, Client2 đã đặt static `.200`. Sau đó Client1 xin DHCP fresh. Kỳ vọng: server `ping-check` thấy `.200` đang có máy → **abandon** `.200`, cấp `.201` cho Client1.

### 6.1. Chuẩn bị 2 file cấu hình netplan cho Client2

Trên **Client2**, tạo 2 file để sau này dễ chuyển qua lại:
```bash
# File "DHCP mode" (đang đang dùng)
sudo cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.dhcp

# File "manual mode" (sẽ đè khi test)
sudo tee /etc/netplan/50-cloud-init.yaml.manual >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.81.200/24]
      routes:
        - to: default
          via: 192.168.81.2
      nameservers:
        addresses: [8.8.8.8]
EOF
sudo chmod 600 /etc/netplan/50-cloud-init.yaml.manual
```

### 6.2. Trên **server**, wipe lease DB (pool sạch trở lại)
```bash
sudo systemctl stop isc-dhcp-server
sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server
```

### 6.3. Trên **Client2**, kích hoạt manual `.200`
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.manual /etc/netplan/50-cloud-init.yaml
sudo netplan apply
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.81.200/24
```
Client2 sẽ DHCP-RELEASE IP cũ (server log: `DHCPRELEASE ... (found)`) và gán static `.200`. Trên server, `arping -c2 -I ens33 192.168.81.200` phải thấy MAC của Client2 trả lời.

### 6.4. Trên **server**, bắt gói (để Wireshark sau)
```bash
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens33 -n -e -p -U \
  -w /tmp/case-A.pcap '(udp port 67 or udp port 68) or arp or icmp'
```
(`systemd-run` để tcpdump không bị kill khi shell thoát.)

### 6.5. Trên **Client1**, ép phát DHCPDISCOVER MỚI HOÀN TOÀN

Vấn đề: nếu Client1 vẫn nhớ lease cũ `.200`/`.201`, networkd sẽ làm INIT-REBOOT (REQUEST IP cũ) chứ không DISCOVER. Cần thật sự "quên" hết:

```bash
sudo systemctl stop systemd-networkd systemd-networkd.socket
sudo rm -f /run/systemd/netif/leases/*
sudo ip addr flush dev ens33
sudo ip link set ens33 down
sleep 1
sudo ip link set ens33 up
sleep 1
# Bảo đảm filter còn (link bounce có thể làm hook netdev mất)
sudo nft delete table netdev dhcpfilter 2>/dev/null
sudo nft -f /etc/nftables-lab.conf
# Phát DISCOVER fresh qua dhcpcd one-shot (đã có sẵn trong Ubuntu)
sudo dhcpcd -1 -t 20 -B ens33
ip -br a show ens33
```

### 6.6. Trên **server**, dừng tcpdump
```bash
sudo systemctl stop lab-tcpdump.service
```

### 6.7. Xem bằng chứng

**Trong log server** (`journalctl -u isc-dhcp-server`):
```
DHCPDISCOVER from 00:0c:29:c4:f1:be via ens33
ICMP Echo reply while lease 192.168.81.200 valid.       ← Client2 trả lời ping
Abandoning IP address 192.168.81.200: pinged before offer
DHCPOFFER on 192.168.81.201 to 00:0c:29:c4:f1:be …
DHCPREQUEST for 192.168.81.201 …
DHCPACK on 192.168.81.201 …
```

**Trong lease DB** (`sudo cat /var/lib/dhcp/dhcpd.leases`):
```
lease 192.168.81.200 {
  binding state abandoned;
  …
}
```

**Trong pcap** (`tcpdump -nn -tt -e -r /tmp/case-A.pcap` hoặc Wireshark):
```
… BOOTP/DHCP, Discover from 00:0c:29:c4:f1:be
… 192.168.81.128 > 192.168.81.200: ICMP echo request     ← server pinging
… 192.168.81.200 > 192.168.81.128: ICMP echo reply       ← Client2 reply!
… (sau đó là DHCPOFFER cho .201, REQUEST, ACK)
```

Filter Wireshark hữu ích: `bootp or icmp or arp`.

### 6.8. Kết luận case A
- DHCP server tự bảo vệ bằng ICMP ping-check, **không cấp IP đang được sử dụng**.
- `.200` rơi vào trạng thái `abandoned` → kể từ giờ **server không cấp `.200` cho bất cứ ai** cho đến khi reset DB.
- **Hậu quả thực tế**: nếu nhiều IP tĩnh nằm trong range DHCP, pool sẽ teo dần.

---

## 7. CASE B – Manual đặt **SAU**

> **Kịch bản**: Client1 đang giữ IP DHCP (vd `.201`). Sau đó Client2 đặt manual đúng IP đó. Quan sát ARP/MAC flap.

### 7.1. Reset về trạng thái sạch trước khi test

Trên Client2:
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.dhcp /etc/netplan/50-cloud-init.yaml
sudo netplan apply
```
Trên server: wipe lease + restart dhcp như **6.2**. Trên cả 2 client: chạy lại block trong **6.5** (chỉ đoạn stop networkd + reset + dhcpcd) để cả 2 lên DHCP fresh.

Sau reset, kiểm tra MAC ↔ IP mapping trên server:
```bash
arp -n | grep 192.168.81
# vd: Client1 c4:f1:be → 192.168.81.201
#     Client2 4c:8b:da → 192.168.81.200
```

Ghi nhớ IP của **Client1** (`192.168.81.201` trong ví dụ này).

### 7.2. Chuẩn bị netplan manual cho Client2 trỏ vào IP của Client1

Trên Client2:
```bash
sudo tee /etc/netplan/50-cloud-init.yaml.steal >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.81.201/24]      # ← IP Client1 đang dùng
      routes:
        - to: default
          via: 192.168.81.2
      nameservers:
        addresses: [8.8.8.8]
EOF
sudo chmod 600 /etc/netplan/50-cloud-init.yaml.steal
```

### 7.3. Trên server, bắt gói
```bash
sudo systemctl stop lab-tcpdump.service 2>/dev/null
sudo systemctl reset-failed lab-tcpdump.service 2>/dev/null
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens33 -n -e -p -U \
  -w /tmp/case-B.pcap '(udp port 67 or udp port 68) or arp or icmp'
```

### 7.4. Trên Client2, kích hoạt manual lấn `.201`
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.steal /etc/netplan/50-cloud-init.yaml
sudo netplan apply
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.81.201/24
```
Cùng lúc đó, Client1 vẫn đang giữ `.201` qua DHCP → **xung đột L2**.

### 7.5. Trên server, dùng `arping` để khẳng định xung đột
Lặp lại nhiều lần để thấy MAC nào trả lời:
```bash
for i in 1 2 3 4 5 6; do
  sudo arping -c2 -w 1 -I ens33 192.168.81.201
  sleep 1
done
```

Kết quả tiêu biểu sẽ là:
```
Unicast reply from 192.168.81.201 [00:0C:29:C4:F1:BE]   ← Client1
Unicast reply from 192.168.81.201 [00:0C:29:4C:8B:DA]   ← Client2
Unicast reply from 192.168.81.201 [00:0C:29:C4:F1:BE]
Unicast reply from 192.168.81.201 [00:0C:29:4C:8B:DA]
```
**Hai MAC cùng claim cùng IP** — đây là dấu hiệu "MAC flapping".

### 7.6. Dừng tcpdump và xem pcap
```bash
sudo systemctl stop lab-tcpdump.service
sudo chmod +r /tmp/case-B.pcap
tcpdump -nn -tt -e -r /tmp/case-B.pcap | head -30
# Hoặc: wireshark /tmp/case-B.pcap  (filter: arp)
```

Trong pcap, lọc `arp.dst.proto_ipv4 == 192.168.81.201` sẽ thấy lần lượt **hai MAC khác nhau cùng "is-at"** cho IP `.201`.

### 7.7. (Tuỳ chọn) Quan sát kernel log trên Client2
```bash
sudo dmesg | grep -iE "conflict|duplicate"
journalctl -k --since "2 min ago" | grep -iE "ipv4|arp"
```
Tuỳ phiên bản kernel, có thể thấy log `IPv4: 00:0c:29:c4:f1:be sent an invalid ARP reply` hoặc tương tự.

### 7.8. Kết luận case B
- DHCP server **không phát hiện** xung đột vì nó chỉ kiểm tra trước khi cấp (đã ACK xong cho Client1 từ lâu).
- `systemd-networkd` đặt static không thực thi DAD nghiêm và không gửi `DHCPDECLINE` → cả 2 máy đều giữ `.201`.
- Hậu quả: ARP cache trên các máy khác bị flap; traffic đến `.201` đôi lúc về Client1, đôi lúc về Client2 → TCP đứt, mất gói.
- Phòng ngừa thực tế: **DHCP snooping + Dynamic ARP Inspection** ở switch; bật DAD strict + `arp_ignore` trên client; tuyệt đối không đặt IP tĩnh trong range DHCP.

---

## 8. So sánh 2 case (dùng cho phần báo cáo)

| Tiêu chí | Case A – manual TRƯỚC | Case B – manual SAU |
|---|---|---|
| Cơ chế bảo vệ chính | `ping-check` của ISC dhcpd | `Duplicate Address Detection` của kernel |
| Bên "thua" trong xung đột | DHCP server nhường, cấp IP khác | Tuỳ OS; Linux netplan **không thua**, cả 2 cùng claim |
| Gói cần quan sát | DISCOVER → **ICMP echo/reply** → OFFER IP khác → REQUEST → ACK | ARP request → **hai MAC cùng reply** một IP |
| Trạng thái IP trong pool | `abandoned` (không cấp lại được) | Vẫn `active` (server không biết conflict) |
| Hậu quả thực tế | Pool DHCP teo dần | Đứt mạng, MAC flapping liên tục |
| Best practice | Tránh đặt IP tĩnh trong range DHCP; dùng `host { fixed-address }` reservation | Như trên + DAD strict + DHCP snooping ở switch |

---

## 9. Phân tích pcap bằng Wireshark

Mở file pcap (`/tmp/case-A.pcap`, `/tmp/case-B.pcap`).

### 9.1. Filter hữu ích

| Mục đích | Filter |
|---|---|
| Chỉ DHCP | `bootp` (Wireshark cũ) hoặc `dhcp` (Wireshark mới) |
| Chỉ ARP | `arp` |
| ICMP (ping-check) | `icmp` |
| DHCP cụ thể của 1 client | `bootp.hw.mac_addr == 00:0c:29:c4:f1:be` |
| Conflict IP cụ thể | `arp.src.proto_ipv4 == 192.168.81.201 \|\| arp.dst.proto_ipv4 == 192.168.81.201` |

### 9.2. Cần screenshot cho báo cáo
- **Case A**: 1 ảnh tổng quan DISCOVER → ICMP echo → ICMP reply → OFFER `.201` → REQUEST → ACK.  
  Expand từng gói DHCPOFFER xem **Option 53 (DHCP Message Type)**, **Option 51 (Lease Time)**, **Option 54 (Server ID = .128)**, **Option 1 (Subnet Mask)**, **Option 3 (Router)**, **Option 6 (DNS)**.
- **Case B**: 1 ảnh chuỗi ARP request/reply có hai MAC khác nhau cùng "is-at 192.168.81.201".

---

## 10. Recovery / Cleanup sau lab

Trả 2 client về trạng thái DHCP bình thường:
```bash
# Trên cả Client1 và Client2
sudo cp /etc/netplan/50-cloud-init.yaml.dhcp /etc/netplan/50-cloud-init.yaml  # nếu đã backup
# Hoặc đơn giản dùng nội dung dhcp4: true mặc định.
sudo netplan apply
```

Trả server về VMware DHCP (nếu muốn):
```bash
sudo systemctl disable --now isc-dhcp-server
sudo rm /etc/netplan/99-lab.yaml
sudo mv /etc/netplan/50-cloud-init.yaml.bak2 /etc/netplan/50-cloud-init.yaml 2>/dev/null
sudo netplan apply
```

Gỡ filter trên 2 client:
```bash
sudo systemctl disable --now dhcp-filter.service
sudo nft delete table netdev dhcpfilter 2>/dev/null
sudo rm /etc/systemd/system/dhcp-filter.service /etc/nftables-lab.conf
sudo rm /etc/networkd-dispatcher/routable.d/50-dhcp-filter
sudo systemctl daemon-reload
```

---

## Phụ lục – Bẫy thực tế đã gặp

| Triệu chứng | Nguyên nhân | Khắc phục |
|---|---|---|
| DHCP server log không thấy DISCOVER | client `networkd` đang INIT-REBOOT (REQUEST IP cũ) thay vì DISCOVER | stop networkd + `rm /run/systemd/netif/leases/*` + restart, hoặc dùng `dhcpcd -1` |
| `ping-check` không skip IP đã có máy | `dhcpd` chạy as `dhcpd` user → mất `CAP_NET_RAW` | drop-in unit, chạy as root như bước **2.5** |
| OFFER từ VMware DHCP (.254) chen vào | iptables INPUT bị bỏ qua bởi AF_PACKET raw socket | dùng nftables **netdev/ingress** priority -300 |
| Filter biến mất sau khi `ip link down/up` | netdev hook bị tear down khi link down | dùng `networkd-dispatcher` routable.d re-apply |
| Mất SSH sau `ip addr flush` | shell SSH chết theo IP | dùng `systemd-run --on-active=Ns ...` để schedule lệnh chạy sau khi SSH ngắt |
| `[sudo] password ...` khi pipe heredoc | sudo -S nuốt stdin heredoc | tách 2 bước: `sudo cp file_tmp /target` thay vì `sudo tee … <<EOF` chung pipeline |
| Pool 2 IP nhanh hết do nhiều test → server NAK | abandon nhiều IP | wipe lease DB: `sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases' && sudo systemctl restart isc-dhcp-server` |

---

## Tệp kết quả lab (tại session này)

```
/home/dhcp-username/dhcp-lab/REPORT.md           # báo cáo phân tích
/home/dhcp-username/dhcp-lab/STEP-BY-STEP.md     # tài liệu này
/tmp/case-A.pcap                                  # 11 packets — ping-check skip
/tmp/case-B.pcap                                  # 29 packets — ARP flap
```

Mở pcap bằng Wireshark trên máy host (copy file qua `scp dhcp-server@192.168.81.128:/tmp/case-A.pcap .`) hoặc trên server với `wireshark /tmp/case-A.pcap`.
