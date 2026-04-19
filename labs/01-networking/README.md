# Lab 01 — Networking

## Prerequisite
- 2 VM Ubuntu 22.04 (node1, node2) cùng subnet host-only
- Wireshark trên host, `tcpdump` trên VM

## Demos

### 1. Capture Ping (ICMP)
```bash
# Trên node1
sudo tcpdump -i eth0 -w /tmp/ping.pcap icmp &
ping -c 4 <node2_ip>
sudo pkill tcpdump
```
→ Mở `ping.pcap` bằng Wireshark, xem request/reply.

### 2. DORA (DHCP)
```bash
sudo tcpdump -i eth0 -w /tmp/dhcp.pcap port 67 or port 68 &
sudo dhclient -r && sudo dhclient eth0
```

### 3. ARP
```bash
ip neigh flush all
sudo tcpdump -i eth0 -w /tmp/arp.pcap arp &
ping -c 1 <node2_ip>
```

### 4. DNS trace
```bash
dig example.com +trace
dig @8.8.8.8 example.com
```

### 5. TCP vs UDP với netcat
```bash
# node1 (server)
nc -l 9000        # TCP
nc -u -l 9000     # UDP

# node2 (client)
nc <node1_ip> 9000
nc -u <node1_ip> 9000
```
Capture cả 2 để so sánh handshake.

## Tool
- `../../subnet-calculator.html` — mở trình duyệt để chia subnet

## Checklist
- [ ] Đọc được pcap ARP/DHCP/DNS
- [ ] Chia được /24 ra 4 subnet /26 bằng tay
