# Lab DHCP Server – Client (Ubuntu 24.04) – BÁO CÁO

## Topology

| Role     | Hostname           | MAC                | IP (cuối)         | Username        |
|----------|--------------------|--------------------|-------------------|-----------------|
| Server   | dhcp-server        | 00:0c:29:ba:58:e7  | 192.168.81.128    | dhcp-server     |
| Client1  | dhcp-client        | 00:0c:29:c4:f1:be  | 192.168.81.201 (DHCP) | dhcp-client     |
| Client2  | dhcp-client-2      | 00:0c:29:4c:8b:da  | 192.168.81.200 (DHCP / manual khi test) | dhcp-client-2 |

Subnet: `192.168.81.0/24` (VMnet8 NAT của VMware).

## Cấu hình cốt lõi

- `/etc/dhcp/dhcpd.conf`: pool **chỉ 2 IP** `192.168.81.200-201`, lease 120s, **`ping-check true`**.
- `dhcpd` chạy **as root** (drop-in `/etc/systemd/system/isc-dhcp-server.service.d/override.conf`) — cần `CAP_NET_RAW` cho ICMP probe của ping-check.
- **nftables netdev/ingress filter** trên 2 client chặn DHCP reply không từ `.128` (để không bị VMware DHCP `.254` chen vào). File `/etc/nftables-lab.conf` + systemd unit `dhcp-filter.service` + hook `networkd-dispatcher` để re-apply sau link bounce.

```
# Snippet nftables filter mỗi client
table netdev dhcpfilter {
  chain ingress {
    type filter hook ingress device "ens33" priority -300;
    ip saddr != 192.168.81.128 udp sport 67 counter drop
  }
}
```

## CASE A — Manual đặt TRƯỚC (IP chưa cấp)

**Kịch bản**: Client2 đặt static `.200` trước. Sau đó Client1 xin DHCP fresh từ pool sạch.

### Bằng chứng từ DHCP server log

```
03:13:14 DHCPDISCOVER from 00:0c:29:c4:f1:be via ens33
03:13:14 ICMP Echo reply while lease 192.168.81.200 valid.
03:13:14 Abandoning IP address 192.168.81.200: pinged before offer
03:13:14 DHCPREQUEST for 192.168.81.129 ... from 00:0c:29:c4:f1:be: unknown lease 192.168.81.129.
```

### Bằng chứng từ pcap (`/tmp/case-A.pcap`)

| Time (rel) | Sự kiện |
|---|---|
| t+0  | Client1 (`c4:f1:be`) **DHCPDISCOVER** broadcast |
| t+0.0001 | **Server (.128) → .200 ICMP echo request** (ping-check) |
| t+0.0001 | Client2 (`4c:8b:da`, đang giữ .200) ARP request "who has .128" |
| t+0.0002 | **Client2 (.200) → .128 ICMP echo reply** ← server biết .200 đang dùng |
| t+0.005+ | Client1 retry DISCOVER, ARP cho .129 (dhcpcd INIT-REBOOT) |

### Lease DB sau test

```
lease 192.168.81.200 {
  binding state abandoned;
  …
}
```

### Kết luận case A

- ICMP ping-check của ISC dhcpd hoạt động đúng: gửi echo trước khi OFFER.
- Client2 (manual) trả lời echo → server **abandon `.200`**, đẩy vào trạng thái `abandoned` (không cấp được nữa cho đến khi reset).
- DHCP client (Client1) cuối cùng được OFFER `.201` (IP còn lại trong pool).
- **Tác hại lâu dài**: pool teo dần vì mỗi IP trùng với máy manual sẽ bị abandon → nếu nhiều IP tĩnh nằm trong range DHCP, server có thể hết IP để cấp.

## CASE B — Manual đặt SAU (IP đã được DHCP cấp)

**Kịch bản**: Client1 đang giữ `.201` qua DHCP. Sau đó Client2 set netplan static `.201` → conflict.

### Bằng chứng từ pcap (`/tmp/case-B.pcap`) – ARP flap

```
ARPING 192.168.81.201 (gửi từ server liên tục):
  → reply from [00:0C:29:C4:F1:BE]      (Client1 — chủ DHCP)
  → reply from [00:0C:29:C4:F1:BE]
  → reply from [00:0C:29:4C:8B:DA]      ← Client2 manual vừa lên .201
  → reply from [00:0C:29:C4:F1:BE]
  → reply from [00:0C:29:4C:8B:DA]
```

Ngay sau khi Client2 `netplan apply`, **cả hai MAC cùng trả lời ARP cho `.201`**. ARP table trên server flap qua lại.

### Bằng chứng từ tcpdump trên server

```
# Hai client đều phản hồi ARP request của server cho .201
… 00:0c:29:4c:8b:da > … Reply 192.168.81.201 is-at 00:0c:29:4c:8b:da
… 00:0c:29:c4:f1:be > … Reply 192.168.81.201 is-at 00:0c:29:c4:f1:be
```

### Kết luận case B

- DHCP server **không phát hiện** conflict này — vì server chỉ kiểm tra trước khi cấp (ping-check trong case A), không giám sát ARP sau đó.
- `systemd-networkd` cấu hình static `.201` trên Client2 **không có DAD nghiêm**, không gửi DHCPDECLINE → IP được gán bình thường ở phía Client2 dù đã có máy khác dùng.
- ARP cache trên các máy còn lại bị "flap": traffic gửi tới `.201` đôi khi về Client1, đôi khi về Client2 → TCP đứt, ping mất gói.
- Phải xử lý ở phía OS (DAD strict, `accept_local`, `arp_ignore`) hoặc switch-side (DHCP snooping + Dynamic ARP Inspection).

## So sánh 2 case

| Tiêu chí                       | Case A (manual TRƯỚC)               | Case B (manual SAU)                       |
|--------------------------------|-------------------------------------|-------------------------------------------|
| Cơ chế bảo vệ chính            | `ping-check` của ISC dhcpd          | `Duplicate Address Detection` của kernel  |
| Bên "thua" trong xung đột      | DHCP server (nhường, cấp IP khác)   | Tuỳ OS — Linux netplan **không thua**, cả 2 cùng claim |
| Gói cần quan sát               | DISCOVER → **ICMP echo/reply** → OFFER IP khác → REQUEST → ACK | ARP request → **hai MAC cùng reply** một IP |
| Trạng thái IP trong pool       | `abandoned` (không cấp lại được)    | Vẫn `active` (server không biết conflict) |
| Hậu quả thực tế                | Pool DHCP teo dần                   | Đứt mạng, MAC flapping liên tục           |
| Best practice                  | Tránh đặt IP tĩnh trong range DHCP, hoặc dùng `host { fixed-address }` reservation | Như trên + DAD strict + DHCP snooping ở switch |

## Phụ lục – file đã tạo trên server

```
/home/dhcp-username/dhcp-lab/
├── 01-server-netplan.yaml         # netplan tĩnh cho server .128
├── 02-isc-dhcp-server.defaults    # INTERFACESv4="ens33"
├── 03-dhcpd.conf                  # range .200-.201, ping-check true
├── 40-case-A.sh                   # runner case A
├── 41-case-B.sh                   # runner case B
├── case-A-c1-discover.sh          # helper: Client1 fresh DISCOVER (dhcpcd)
├── case-A-c2-manual.sh            # helper: Client2 static .200
├── case-B-c2-grab.sh              # helper: Client2 chiếm IP của Client1
├── persist-filter.sh              # cài nftables filter persistent
└── REPORT.md                       # file này

/etc/systemd/system/isc-dhcp-server.service.d/override.conf  # dhcpd as root (cho ping-check)
/tmp/case-A.pcap                   # 11 packets
/tmp/case-B.pcap                   # 29 packets
```

Mở pcap bằng Wireshark:
```bash
wireshark /tmp/case-A.pcap   # filter: bootp or arp or icmp
wireshark /tmp/case-B.pcap   # filter: arp
```
