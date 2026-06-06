# Phase 2 — Re-capture Pcap (Case A + Case B)

**Status**: pending
**Effort**: 1.5h
**Blocker**: User boot VM .129 (dhcp-client) và .130 (dhcp-client-2) trước khi bắt đầu

## Goal

Re-capture 2 pcap trong session sạch (không noise SSH, không abandoned lease cũ) để dùng làm sample cho `DhcpPlayground`. Mỗi pcap ≤200 packets, ≤5 MB (cap của `pcap-parser.ts`).

## Files to Modify / Create

```
plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps/
├── case-A.pcap   # Manual TRƯỚC — ping-check abandon, server cấp IP khác
└── case-B.pcap   # Manual SAU — ARP flap, 2 MAC cùng IP
```

## Pre-flight Checks (BLOCKING)

Từ Windows host:
```powershell
ping 192.168.81.128    # SERVER must reply
ping 192.168.81.129    # CLIENT-1 must reply
ping 192.168.81.130    # CLIENT-2 must reply
```

Nếu CLIENT-1 hoặc CLIENT-2 không reply → user phải power on VM trong VMware Workstation, đợi boot xong (≥1 phút), retry ping. KHÔNG proceed nếu cả 3 không UP.

## Implementation Steps

### 1. Reset state trên SERVER (.128)
SSH vào server, dọn lease + restart dhcpd:
```bash
sudo systemctl stop isc-dhcp-server
sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server

# Verify dhcpd đang chạy as root (CAP_NET_RAW cho ping-check)
grep CapEff /proc/$(pidof dhcpd | awk '{print $1}')/status
# Mong đợi: CapEff: 000001ffffffffff
```

### 2. CASE A — Manual TRƯỚC (ping-check abandons IP)

Trên **Client2** (.130), kích hoạt manual `.200`:
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.manual /etc/netplan/50-cloud-init.yaml
sudo netplan apply
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.81.200/24
```

(File `50-cloud-init.yaml.manual` đã có sẵn từ session trước; xem `source/STEP-BY-STEP.md §6.1`)

Trên **SERVER**, start capture qua systemd-run (không bị HUP khi SSH ngắt):
```bash
sudo systemctl stop lab-tcpdump.service 2>/dev/null
sudo systemctl reset-failed lab-tcpdump.service 2>/dev/null
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens33 -n -e -p -U -s 0 \
  -w /tmp/case-A.pcap '(udp port 67 or udp port 68) or arp or icmp'
```

Trên **Client1** (.129), ép phát DHCPDISCOVER fresh:
```bash
sudo systemctl stop systemd-networkd systemd-networkd.socket
sudo rm -f /run/systemd/netif/leases/*
sudo ip addr flush dev ens33
sudo ip link set ens33 down
sleep 1
sudo ip link set ens33 up
sleep 1
sudo nft delete table netdev dhcpfilter 2>/dev/null
sudo nft -f /etc/nftables-lab.conf
sudo dhcpcd -1 -t 20 -B ens33
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.81.201/24 (vì .200 bị Client2 chiếm → ping-check abandon)
```

Quay lại **SERVER**, stop capture sau ~10s:
```bash
sleep 10
sudo systemctl stop lab-tcpdump.service
sudo chmod +r /tmp/case-A.pcap
sudo journalctl -u isc-dhcp-server -n 20 --no-pager
# Verify log có dòng "Abandoning IP address 192.168.81.200: pinged before offer"
```

### 3. Reset trước CASE B
Trên Client2:
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.dhcp /etc/netplan/50-cloud-init.yaml
sudo netplan apply
```

Trên SERVER, wipe lease lại:
```bash
sudo systemctl stop isc-dhcp-server
sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server
```

Trên cả 2 client, chạy lại đoạn DISCOVER fresh ở **bước 2** (phần Client1) để cả 2 lên DHCP. Verify:
```bash
arp -n | grep 192.168.81
# Mong đợi 2 entry với MAC khác nhau, IP .200 và .201
```

**Ghi nhớ** MAC ↔ IP mapping (cần cho case-B description trong Phase 3).

### 4. CASE B — Manual SAU (ARP flap)

Trên **Client2**, chuẩn bị file netplan steal IP của Client1 (ví dụ Client1 đang có `.201`):
```bash
sudo tee /etc/netplan/50-cloud-init.yaml.steal >/dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.81.201/24]
      routes:
        - to: default
          via: 192.168.81.2
      nameservers:
        addresses: [8.8.8.8]
EOF
sudo chmod 600 /etc/netplan/50-cloud-init.yaml.steal
```

Trên **SERVER**, start capture:
```bash
sudo systemctl stop lab-tcpdump.service 2>/dev/null
sudo systemctl reset-failed lab-tcpdump.service 2>/dev/null
sudo systemd-run --unit=lab-tcpdump --collect \
  /usr/bin/tcpdump -i ens33 -n -e -p -U -s 0 \
  -w /tmp/case-B.pcap '(udp port 67 or udp port 68) or arp or icmp'
```

Trên **Client2**, activate manual `.201`:
```bash
sudo cp /etc/netplan/50-cloud-init.yaml.steal /etc/netplan/50-cloud-init.yaml
sudo netplan apply
ip -br a show ens33
# Mong đợi: ens33 ... 192.168.81.201/24
```

Trên **SERVER**, ép ARP traffic để observe flap:
```bash
for i in 1 2 3 4 5 6; do
  sudo arping -c 2 -w 1 -I ens33 192.168.81.201
  sleep 1
done
```

Quan sát output: phải có 2 MAC khác nhau cùng reply `is-at 192.168.81.201`. Sau đó stop capture:
```bash
sudo systemctl stop lab-tcpdump.service
sudo chmod +r /tmp/case-B.pcap
```

### 5. SCP về Windows host
Từ Windows PowerShell hoặc Git Bash:
```bash
mkdir -p plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps
scp dhcp-username@192.168.81.128:/tmp/case-A.pcap \
    plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps/case-A.pcap
scp dhcp-username@192.168.81.128:/tmp/case-B.pcap \
    plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps/case-B.pcap
```

### 6. Verify pcap size + packet count
```bash
ls -la plans/dattqh/260524-1055-dhcp-lab-codify/source/pcaps/
# Cả 2 file phải < 5 MB

# Nếu có tshark trên Windows (chuẩn Wireshark install):
tshark -r .../case-A.pcap -c 200 2>&1 | wc -l
tshark -r .../case-B.pcap -c 200 2>&1 | wc -l
# Mong đợi: case-A ~10-15 packets, case-B ~25-35 packets
```

## Acceptance Criteria

- [ ] `source/pcaps/case-A.pcap` exists, ≤5 MB
- [ ] `source/pcaps/case-B.pcap` exists, ≤5 MB
- [ ] case-A.pcap chứa: ≥1 DHCPDISCOVER, ≥1 ICMP echo request từ server, ≥1 ICMP reply từ Client2, ≥1 DHCPOFFER cho IP khác `.200`, REQUEST + ACK
- [ ] case-B.pcap chứa: ≥2 ARP reply với khác source MAC nhưng cùng `arp.src.proto_ipv4 == 192.168.81.201`
- [ ] Server journalctl có dòng "Abandoning IP address 192.168.81.200: pinged before offer" (trong session case-A)

## Notes

- Lease 120s → nếu Client1 đã có lease trước capture, capture chỉ thấy REQUEST (renew). Phải dùng `dhcpcd -1 -B` để ép DISCOVER fresh.
- Nếu `ping-check` không skip `.200` → kiểm tra `grep CapEff /proc/$(pidof dhcpd)/status`. Phải = `000001ffffffffff`. Nếu không → systemd drop-in chưa load đúng; xem `source/STEP-BY-STEP.md §2.5`.
- Nếu pcap > 5 MB → cap capture time ngắn hơn (5s thay vì 10s) hoặc filter tighter (loại `icmp` không cần thiết).
