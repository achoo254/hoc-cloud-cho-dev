# Phase 3 — Content Drafts

**Status**: pending
**Effort**: 1.5h
**Blocker**: Phase 2 (cần pcap để verify MAC/IP cụ thể đưa vào description)

## Goal

Viết JSON drafts cho 3 mảng content append vào lab `dhcp`: +4 `tryAtHome` items, +2 `walkthrough` steps (full snippet 20-30 dòng/step), +4 `misconceptions`. Drafts là input cho Phase 4 (Mongo update script).

## Files to Create

```
plans/dattqh/260524-1055-dhcp-lab-codify/content-drafts/
├── try-at-home-additions.json          # 4 items
├── walkthrough-additions.json          # 2 steps (8, 9)
└── misconceptions-additions.json       # 4 items
```

## Schema Reference

Per `app/src/lib/schema-lab.ts`:
- `TryAtHomeSchema = { cmd: string, why: string, observeWith?: string }`
- `WalkthroughStepSchema = { step: string|number, what: string, why: string, whyBreaks?: string, observeWith?: string, code?: string, failModes?: [...], fixSteps?: [...] }`
- `MisconceptionSchema = { wrong: string, right: string, why: string }`

> **Lưu ý**: Mongo store dưới key `tryAtHome` (camelCase, không phải `try_at_home`). Xem `server/db/models/lab-model.js:17`.

## Content Plan

### `try-at-home-additions.json` (4 items)

| # | cmd | why (rút gọn) | observeWith |
|---|---|---|---|
| 6 | `sudo systemd-run --unit=lab-tcpdump --collect /usr/bin/tcpdump -i ens33 -n -e -p -U -s 0 -w /tmp/dora.pcap '(udp port 67 or udp port 68) or arp or icmp'` | Chạy tcpdump dưới systemd unit → không HUP khi SSH ngắt; dừng bằng `systemctl stop lab-tcpdump` | Sau capture: `sudo chmod +r /tmp/dora.pcap && tcpdump -nn -tt -e -r /tmp/dora.pcap` xem timestamp + src/dst; hoặc kéo file vào tab Upload .pcap trong DHCP playground |
| 7 | `sudo systemctl stop systemd-networkd systemd-networkd.socket && sudo rm -f /run/systemd/netif/leases/* && sudo ip addr flush dev ens33 && sudo ip link set ens33 down && sleep 1 && sudo ip link set ens33 up && sudo dhcpcd -1 -t 20 -B ens33` | Ép client phát DHCPDISCOVER fresh (không INIT-REBOOT/REQUEST IP cũ). Cần khi muốn quan sát full DORA, không phải Request đơn lẻ | tcpdump trên server phải thấy 4 dòng `BOOTP/DHCP, Discover → Offer → Request → ACK` thay vì chỉ 1 Request. Nếu vẫn chỉ thấy Request → lease cache chưa được xóa hoặc dhcpcd không có sẵn (cần cài). Filter Wireshark: `bootp.option.dhcp == 1` chỉ show Discover. |
| 8 | Case A — Client2 đặt static `.200` trước; server `ping-check` ICMP → abandon `.200`, cấp `.201` cho Client1. Block: `sudo cp /etc/netplan/50-cloud-init.yaml.manual /etc/netplan/50-cloud-init.yaml && sudo netplan apply` trên Client2 → Server: `sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases' && sudo systemctl restart isc-dhcp-server` → Client1: chạy block #7 ép DISCOVER | Quan sát ICMP ping-check của ISC dhcpd: server gửi `192.168.81.128 → 192.168.81.200 ICMP echo request` trước khi cấp; Client2 reply → server log `Abandoning IP address 192.168.81.200: pinged before offer` → OFFER `.201` thay vì `.200` | Server log: `journalctl -u isc-dhcp-server -n 30`. Lease DB: `sudo cat /var/lib/dhcp/dhcpd.leases` thấy `binding state abandoned`. Pcap (case-A): filter `bootp or icmp` thấy chuỗi DISCOVER → ICMP echo/reply → OFFER `.201` → REQUEST → ACK. |
| 9 | Case B — Client1 đang giữ DHCP IP (vd `.201`); Client2 đặt static IP đó. Block: trên Client2 `sudo cp /etc/netplan/50-cloud-init.yaml.steal /etc/netplan/50-cloud-init.yaml && sudo netplan apply` → trên Server: `for i in 1 2 3 4 5 6; do sudo arping -c 2 -w 1 -I ens33 192.168.81.201; sleep 1; done` | DHCP server **không phát hiện** conflict vì đã ACK xong cho Client1 từ lâu. Cả 2 client cùng claim → `arping` luân phiên 2 MAC khác nhau cùng "is-at .201" | Output arping: `Unicast reply from 192.168.81.201 [00:0C:29:C4:F1:BE]` xen kẽ `[00:0C:29:4C:8B:DA]` (MAC sẽ khác trong session của user). Pcap (case-B): filter `arp.dst.proto_ipv4 == 192.168.81.201` thấy 2 source MAC khác nhau cùng reply. |

### `walkthrough-additions.json` (2 steps)

**Step 8 — Conflict scenario A: Manual TRƯỚC, `ping-check` save the day**

- `step`: 8
- `what`: "Conflict A — DHCP server tự bảo vệ bằng ICMP ping-check"
- `why`: Giải thích cơ chế: ISC dhcpd gửi ICMP echo tới IP sắp cấp; nếu có reply → IP đang dùng → abandon → cấp IP khác từ pool. Cite RFC 2131 §4.3.1 (server SHOULD probe before OFFER) + dhcpd.conf option `ping-check`.
- `whyBreaks`: Silent fail nếu `dhcpd` chạy as non-root user `dhcpd` (default systemd unit Ubuntu 24.04) — mất CAP_NET_RAW → không gửi được ICMP probe → `ping-check` thầm lặng vô hiệu hoá. Verify: `grep CapEff /proc/$(pidof dhcpd)/status` phải = `000001ffffffffff` (chạy as root). Nếu = `0000000000000800` → đang as user dhcpd → cần systemd drop-in override.
- `code`: snippet ~25 dòng setup dhcpd.conf với `ping-check true; ping-timeout 1;` + systemd drop-in `isc-dhcp-server.service.d/override.conf` + verify command (xem `source/STEP-BY-STEP.md §2.4-§2.5`)
- `observeWith`: "Pcap filter `bootp or icmp`: thấy chuỗi DISCOVER → ICMP echo/reply (server probing) → OFFER IP khác (không phải IP bị conflict). Server log: `Abandoning IP address X.X.X.X: pinged before offer`."
- `failModes`:
  - `{ symptom: "Server vẫn cấp IP đang bị Client2 dùng", evidence: "Cap probe trong log có nhưng vẫn cấp IP gốc — kiểm tra grep CapEff, có thể UID khác 0" }`
- `fixSteps`:
  - `{ step: "Tạo systemd drop-in cho dhcpd as root", command: "sudo tee /etc/systemd/system/isc-dhcp-server.service.d/override.conf <<'EOF'\\n[Service]\\nExecStart=\\nExecStart=/usr/sbin/dhcpd -f -4 -pf /run/dhcp-server/dhcpd.pid -cf /etc/dhcp/dhcpd.conf ens33\\nEOF" }`
  - `{ step: "Reload + restart + verify CapEff", command: "sudo systemctl daemon-reload && sudo systemctl restart isc-dhcp-server && grep CapEff /proc/$(pidof dhcpd | awk '{print $1}')/status" }`

**Step 9 — Conflict scenario B: Manual SAU, ARP flap**

- `step`: 9
- `what`: "Conflict B — Linux netplan static không DAD → ARP cache flapping"
- `why`: Khi Client1 đã có lease IP X từ DHCP và Client2 đặt static cùng IP X: DHCP server không phát hiện (đã ACK xong); `systemd-networkd` gán static không thực thi DAD strict → cả 2 máy cùng claim. Switch/router gateway thấy 2 ARP reply khác MAC → cache flap → traffic intermittent. Cite RFC 5227 §2.1.1 (DAD recommend) + thực tế Linux không enforce.
- `whyBreaks`: Hậu quả production: TCP đứt, packet loss, debug khó vì không có error message. Switch L2 update CAM table liên tục → switch CPU spike. Phòng ngừa: DHCP snooping + Dynamic ARP Inspection (DAI) ở switch + bật DAD strict bằng `sysctl net.ipv4.conf.all.arp_announce=2; arp_ignore=1`.
- `code`: snippet ~25 dòng: setup netplan steal config trên Client2 + `arping -c 2 -I ens33 <IP>` trên server (loop 6 lần) + xem `dmesg | grep -iE 'conflict|duplicate'` + filter Wireshark `arp.dst.proto_ipv4 == <IP>` (xem `source/STEP-BY-STEP.md §7`)
- `observeWith`: "arping output: 2 MAC luân phiên reply. Pcap filter `arp`: 2 source MAC khác nhau cùng `arp.src.proto_ipv4`. `dmesg`/`journalctl -k`: có thể thấy `IPv4: ... sent an invalid ARP reply` tuỳ kernel version."
- `failModes`:
  - `{ symptom: "arping chỉ thấy 1 MAC", evidence: "Client2 chưa apply netplan, hoặc systemd-networkd kẹt — check ip -br a show ens33 trên Client2 phải có IP" }`
- `fixSteps`:
  - `{ step: "Restart systemd-networkd trên Client2", command: "sudo systemctl restart systemd-networkd && sleep 2 && ip -br a show ens33" }`
  - `{ step: "Khi muốn dứt điểm: bật ARP-aware sysctl", command: "echo 'net.ipv4.conf.all.arp_ignore=1\\nnet.ipv4.conf.all.arp_announce=2' | sudo tee /etc/sysctl.d/99-arp-strict.conf && sudo sysctl --system" }`

### `misconceptions-additions.json` (4 items)

| wrong | right | why |
|---|---|---|
| `ping-check true` trong dhcpd.conf đảm bảo server luôn skip IP đang dùng | dhcpd chạy as non-root user (default systemd unit Ubuntu 24.04) **mất CAP_NET_RAW** → silent skip ICMP probe → `ping-check` vô hiệu hoá hoàn toàn. Verify: `grep CapEff /proc/$(pidof dhcpd)/status` phải = `000001ffffffffff`. Cần systemd drop-in để chạy as root | Test scenario A pass dù config sai — student nghĩ ping-check work nhưng thực ra IP được cấp ngẫu nhiên do conflict chưa lộ ra. Production thấy IP conflict mà không hiểu vì sao server "ignore" ping-check |
| iptables INPUT đủ chặn rogue DHCP server | `systemd-networkd` dùng raw socket **AF_PACKET** (kernel L2) → ingress packet **bypass iptables INPUT** hoàn toàn. Phải dùng **nftables `netdev/ingress` hook** (priority -300, chạy ở L2 trước AF_PACKET) hoặc tắt rogue DHCP ở nguồn | Lab với VMware NAT có DHCP riêng `.254` chen OFFER → nếu chỉ block bằng iptables → vẫn nhận IP từ VMware DHCP, lab fail mà không hiểu vì sao filter rule "không work" |
| `systemctl restart systemd-networkd` đủ để client xin DHCP fresh (DORA mới) | networkd cache lease tại `/run/systemd/netif/leases/` → khi restart sẽ làm **INIT-REBOOT** (DHCPREQUEST IP cũ) thay vì DISCOVER. Phải `rm /run/systemd/netif/leases/*` + flush addr + link down/up + dùng `dhcpcd -1 -B` để ép DISCOVER fresh | Capture mà không thấy DISCOVER → student tưởng DHCP server config sai, debug nhầm hướng. Thực ra client đang INIT-REBOOT mà không biết |
| Linux client tự DECLINE và back-off khi đặt static IP trùng IP đang dùng | systemd-networkd gán static **không thực thi DAD strict**, không gửi DHCPDECLINE, không log warning rõ ràng → cả 2 máy cùng claim, gây ARP flap, traffic intermittent. Khác với DHCP client behavior (RFC 2131 §3.1.5: client phải DECLINE khi conflict). Bật sysctl `arp_announce=2, arp_ignore=1` không đủ — cần DHCP snooping + DAI ở switch | Nghĩ Linux tự xử lý → không bật DHCP snooping/DAI ở switch → mạng prod đứt liên tục khi có user gõ nhầm IP. Debug khó vì không có error log |

## Implementation Steps

1. Tạo dir `plans/dattqh/260524-1055-dhcp-lab-codify/content-drafts/`
2. Viết 3 file JSON theo schema ở trên. Reference data từ:
   - `source/STEP-BY-STEP.md` cho command + flow
   - `source/pcaps/case-A.pcap` + `case-B.pcap` để verify MAC/IP cụ thể (tshark đọc lại)
3. JSON pretty-print 2-space indent, UTF-8
4. Validate bằng Zod inline check (optional Node REPL):
   ```js
   const { TryAtHomeSchema, WalkthroughStepSchema, MisconceptionSchema } = await import('./app/src/lib/schema-lab.ts')
   const drafts = JSON.parse(fs.readFileSync('plans/.../content-drafts/try-at-home-additions.json'))
   drafts.forEach((d, i) => TryAtHomeSchema.parse(d))  // throws nếu invalid
   ```

## Acceptance Criteria

- [ ] 3 JSON files exist
- [ ] `try-at-home-additions.json` array length === 4, mỗi item có `cmd` + `why`
- [ ] `walkthrough-additions.json` array length === 2, step number === 8 và 9, mỗi step có code snippet ≥20 dòng
- [ ] `misconceptions-additions.json` array length === 4, mỗi item có `wrong` + `right` + `why`
- [ ] Optional: Zod parse pass cho cả 3 file

## Notes

- Step 8, 9 dùng full snippet (user chọn 20-30 dòng) — KHÔNG link tới `source/STEP-BY-STEP.md` để giữ self-contained
- MAC address trong description (#9 tryAtHome, step 9 walkthrough) phải lấy đúng từ pcap re-captured Phase 2 (không hardcode MAC ngẫu nhiên)
- RFC cites: link `<a href="...">RFC 2131 §X.Y</a>` HTML inline theo pattern lab content hiện có
