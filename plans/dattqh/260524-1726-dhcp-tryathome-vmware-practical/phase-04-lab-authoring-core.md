# Phase 4 — Lab Authoring: 6 Core Phases

**Status:** pending | **Priority:** high | **Effort:** 4h | **Depends on:** Phase 1, 3
**Block reason:** Yêu cầu user availability để chạy VMware Workstation Pro 25H2

## Context

Tạo content draft `tryAtHome[]` cho 6 core phase. Mỗi phase cần:
- `steps[]` chi tiết (do/expect/screenshot)
- `analysis` block ở Case A & B
- Screenshot thật từ VMware/SSH/Wireshark

Source: `plans/dattqh/260524-1055-dhcp-lab-codify/source/STEP-BY-STEP-v2-hybrid.md` (đã codify trước).

## Authoring loop per phase

```
Agent → guide command + screenshot checklist  →  User
User  → chạy VMware Pro 25H2 + Ubuntu 24.04
        → screenshot PrintScreen / Wireshark export
        → paste terminal output text vào chat
Agent → verify output match SBS reference
Agent → name + crop + commit ảnh vào app/public/labs/dhcp/screenshots/core/
Agent → draft JSON entry trong content-drafts/
```

## Output structure

```
plans/dattqh/260524-1726-dhcp-tryathome-vmware-practical/content-drafts/
├── tryathome-core-phase1-setup.json
├── tryathome-core-phase2-dhcpd-minimal.json
├── tryathome-core-phase3-dora-wireshark.json
├── tryathome-core-phase4-case-a.json
├── tryathome-core-phase5-case-b.json
└── tryathome-core-phase6-compare-report.json
```

## 6 Core Phases — outline

### Phase 1 — Setup tối thiểu (~20', 3 screenshot)
- VM Server: NIC1=VMnet1, IP tĩnh 192.168.81.1/24
- VM Client1: NIC1=VMnet1, DHCP
- VMware Network Editor → VMnet1 → Tắt DHCP local
- ESXi note: tương đương vSwitch Port Group, disable security DHCP
- Screenshots:
  - `phase1-01-vmnet1-dhcp-off.png` (Network Editor)
  - `phase1-02-vm-settings-server.png` (VM Settings → Network Adapter)
  - `phase1-03-ip-br-link.png` (`ip -br link` trên Server)

### Phase 2 — Cài + cấu hình DHCP Server minimal (~15', 3 screenshot)
- `apt install isc-dhcp-server`
- `dhcpd.conf` minimal 15 dòng (subnet, range .100-.110, lease 120s)
- `/etc/default/isc-dhcp-server` → `INTERFACESv4="ens37"`
- `dhcpd -t -cf /etc/dhcp/dhcpd.conf` OK
- Client1 `sudo dhclient -v ens33` → nhận IP
- KHÔNG cover NAT, KHÔNG override systemd CAP_NET_RAW
- Screenshots:
  - `phase2-01-dhcpd-test-ok.png`
  - `phase2-02-dhcpd-conf-minimal.png` (cat dhcpd.conf)
  - `phase2-03-client-receives-ip.png` (`ip addr` trên Client1)

### Phase 3 — Bắt DORA + mở Wireshark GUI (~25', 4 screenshot)
- Server: `tcpdump -i ens37 -w /tmp/dora.pcap 'udp port 67 or udp port 68'` (systemd-run)
- Client1: ép release + renew (`dhclient -r && dhclient -v`)
- Dừng tcpdump → tshark CLI list 5 packet
- **scp pcap về host Windows**: `scp dhcp-username@<server-ip>:/tmp/dora.pcap .`
- Mở Wireshark GUI Windows → display filter `bootp` → expand DHCP Options
- Screenshots:
  - `phase3-01-tshark-cli-5pkt.png`
  - `phase3-02-scp-pcap-to-host.png` (terminal scp output)
  - `phase3-03-wireshark-filter-bootp.png` (Wireshark packet list)
  - `phase3-04-wireshark-expand-options.png` (expand Option 53/51/54/50)

### Phase 4 — Case A: Manual đặt TRƯỚC (~20', 3 screenshot + analysis)
- Client2 dựng mới (hoặc reuse Client1 nếu chia session): netplan static `.100`
- Wipe lease DB Server, restart dhcpd
- Client1 ép DISCOVER fresh
- Quan sát: server cấp `.101` (skip `.100`)
- Screenshots:
  - `phase4-01-client2-static-100.png` (`ip addr` Client2)
  - `phase4-02-server-log-after-discover.png` (`journalctl -u isc-dhcp-server -n 20`)
  - `phase4-03-pcap-server-skips-100.png` (Wireshark filter `bootp`)
- **analysis** block:
  - observation: "Server cấp .101 cho Client1, không cấp .100"
  - mechanism: "DHCP client ARP probe .100 trước khi commit → phát hiện Client2 → DECLINE → server cấp IP kế tiếp. (Note: nếu Server bật ping-check như Optional O2 thì SERVER kiểm tra trước cả OFFER)"
  - lesson: "KHÔNG đặt IP static trong range DHCP pool"

### Phase 5 — Case B: Manual đặt SAU (~20', 3 screenshot + analysis)
- Reset: Client1+2 cùng DHCP. Client1 = .100, Client2 = .101
- Client2: netplan static .100 (steal IP Client1)
- Server: arping loop 6 lần → 2 MAC luân phiên reply
- Skip APIPA (đẩy sang Optional O3)
- Screenshots:
  - `phase5-01-arping-2-mac.png` (arping output Server)
  - `phase5-02-ip-addr-both-clients.png` (`ip addr` cả 2 client cùng .100)
  - `phase5-03-dmesg-conflict.png` (`dmesg | grep -i conflict`)
- **analysis** block:
  - observation: "Cả Client1+Client2 cùng claim .100. arping thấy 2 MAC khác nhau cùng reply"
  - mechanism: "DHCP server không re-check sau ACK. systemd-networkd mặc định không gửi DECLINE → 2 host cùng broadcast ARP → ARP cache flap"
  - lesson: "DHCP một mình không phòng được conflict do user. Cần DHCP snooping + DAI ở switch + IPAM track IP static"

### Phase 6 — So sánh & báo cáo (~15', 1 screenshot)
- Render bảng so sánh markdown trong `cmd` field (hoặc dùng `<table>` HTML embed trong `why`)
- Note best practice phòng ngừa
- Screenshot:
  - `phase6-01-compare-table.png` (screenshot báo cáo final đã viết — markdown rendered hoặc bảng tự vẽ)

## Acceptance criteria

- [ ] 6 JSON draft trong `content-drafts/`
- [ ] 17 ảnh trong `app/public/labs/dhcp/screenshots/core/`
- [ ] Tất cả screenshot khớp output thật, không lộ info nhạy cảm
- [ ] Mỗi phase có summary `{why, cmd, observeWith}` cấp cao + `steps[]` chi tiết
- [ ] Phase 4 + 5 có `analysis` block đầy đủ 3 row

## Session breakdown gợi ý

| Session | Phases | Time |
|---------|--------|------|
| 1 | Setup + dhcpd minimal + DORA | ~60' |
| 2 | Case A + Case B | ~40' |
| 3 | Compare + viết báo cáo | ~15' |

## Risks

- VM clone không boot do MAC trùng — generate new MAC cho mỗi VM
- VMnet1 không có DHCP từ VMware nhưng Client vẫn lấy IP từ VMnet8 nếu thiết lập NIC sai — check carefully
- Wireshark Windows install kích thước lớn — user có thể dùng `tshark` thay thế nếu không cài Wireshark
