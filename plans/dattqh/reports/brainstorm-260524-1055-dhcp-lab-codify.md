# Brainstorm — Codify DHCP VMware Lab vào App Content

**Date**: 2026-05-24 10:55
**Branch**: master
**Status**: Design pending approval (HARD-GATE)

---

## Problem Statement

User vừa chạy lab DHCP server/client trên 3 VM VMware Workstation Ubuntu 24.04. Agent đồng nghiệp đã produce 1 tài liệu chi tiết `STEP-BY-STEP.md` (23 KB, 621 dòng) + 2 pcap `/tmp/case-A.pcap`, `/tmp/case-B.pcap` trên VM server. Cần codify nội dung này thành lab content của app (`slug=dhcp`).

User chọn **Approach 3 — Full codify**: bổ sung `try_at_home` + sample pcap + walkthrough + misconceptions, append vào lab có sẵn. Sample pcap **re-capture trong session sạch** (không tái dùng pcap cũ). Source doc archive trong `plans/dattqh/{date}-dhcp-lab-codify/source/`.

---

## Scout Findings

### Lab `dhcp` hiện tại trên MongoDB

| Field | Count | Trạng thái |
|---|---|---|
| `tldr` | 7 | DORA + Renew/Rebind/Relay, đã có RFC 2131 cite (Phase-05 OSI think-depth) |
| `walkthrough` | 7 | step 1-7: DORA flow + Relay + Debug DHCP fail |
| `quiz` | 7 | covered |
| `flashcards` | 12 | covered |
| `tryAtHome` | **5** | DORA capture cơ bản, dhclient.leases, fail sim, static-vs-DHCP, server-lease list |
| `misconceptions` | 5 | ACK unicast, Offer ≠ commit, Relay, T1/T2, Request broadcast |
| `diagram` | `DhcpPlayground` | Component đã registered, **không** có pcap-upload-zone |

### Field-name lưu ý
- **MongoDB**: `tryAtHome` (camelCase) — Mongoose `[Schema.Types.Mixed]` (xem `server/db/models/lab-model.js:17`)
- **Zod schema**: `try_at_home` (snake_case) — `app/src/lib/schema-lab.ts:138`
- → Có converter ở API layer. Update script DÙNG `tryAtHome` (key Mongo); FE vẫn nhận `try_at_home` qua converter.

### Pattern reference đã sẵn
- `server/scripts/update-lab-tcpdump-content.js` — append-content cho icmp-ping + http (canonical pattern)
- `app/src/components/lab/diagrams/shared/pcap-upload-zone.tsx` — drag-drop pcap UI (đã ship)
- `app/src/components/lab/diagrams/shared/pcap-parser.ts` — vanilla pcap parser (Ethernet + Linux SLL, 5MB/200pkt cap)
- `app/src/components/lab/diagrams/http-playground.tsx` + `icmp-ping-playground.tsx` — integration pattern

### Server VM state đã verify (SSH session trước)
- `.128` UP, isc-dhcp-server active, dhcpd.conf cấu hình sẵn (range `.200`-`.201`, `ping-check on`, lease 120s)
- systemd drop-in override `isc-dhcp-server.service.d/override.conf` đã có để chạy as root (cần cho CAP_NET_RAW → ping-check work)
- `.129`, `.130` (clients) **đang TẮT** — phải bật trước khi re-capture
- tcpdump cài sẵn trên server; tshark/wireshark **không** có (capture rồi scp về Windows host)

---

## Gap Analysis — Cái thực sự thiếu trong lab dhcp

| Nội dung từ STEP-BY-STEP.md | Lab dhcp hiện có? | Hành động |
|---|---|---|
| DORA capture cơ bản | ✅ tryAtHome[0] | Skip |
| Read dhclient lease | ✅ tryAtHome[1] | Skip |
| Stop DHCP server → exponential backoff | ✅ tryAtHome[2] | Skip |
| Static vs DHCP compare | ✅ tryAtHome[3] | Skip |
| Read server lease DB | ✅ tryAtHome[4] | Skip |
| **`systemd-run` để tcpdump không bị HUP** | ❌ | Add tryAtHome |
| **`dhcpcd -1` ép DISCOVER fresh** | ❌ | Add tryAtHome |
| **Case A — manual TRƯỚC: ping-check abandons IP** | ❌ | Add tryAtHome + walkthrough step 8 + sample pcap |
| **Case B — manual SAU: ARP flap 2 MAC** | ❌ | Add tryAtHome + walkthrough step 9 + sample pcap |
| **`arping -c 2` test L2 conflict** | ❌ | Add tryAtHome |
| **CAP_NET_RAW caveat (dhcpd as non-root → ping-check silent fail)** | ❌ | Add misconception |
| **AF_PACKET bypass iptables → nftables netdev/ingress** | ❌ | Add misconception |
| **VMware VMnet8 DHCP `.254` chen OFFER** | ❌ | Add misconception |
| **INIT-REBOOT cache `/run/systemd/netif/leases/`** | ❌ | Add misconception |
| **Linux netplan static không DAD → cả 2 client cùng giữ IP** | ❌ | Add misconception |
| **VMware/ESXi lab setup chi tiết (3 VM, network adapter, OS install)** | N/A | Out-of-scope cho lab content; archive trong `plans/.../source/` |

---

## Final Design

### Plan dir layout
```
plans/dattqh/260524-1055-dhcp-lab-codify/
├── plan.md                          # overview, phase status
├── phase-01-archive-source.md       # copy STEP-BY-STEP.md + REPORT.md
├── phase-02-recapture-pcap.md       # re-capture case-A.pcap + case-B.pcap
├── phase-03-content-drafts.md       # try-at-home, walkthrough, misconceptions JSON drafts
├── phase-04-mongo-update-script.md  # write + run server/scripts/update-lab-dhcp-vmware-content.js
├── phase-05-playground-integration.md  # tích hợp pcap-upload-zone + 2 sample buttons vào DhcpPlayground
├── phase-06-docs-journal.md         # changelog + roadmap + journal
└── source/
    ├── STEP-BY-STEP.md              # 23 KB từ Agent kia (đã fetch về reports/, sẽ move sang đây)
    ├── REPORT.md                    # 7 KB (chưa fetch)
    └── pcaps/
        ├── case-A.pcap              # re-captured clean session
        └── case-B.pcap              # re-captured clean session
```

### Content additions (will live in `phase-03` JSON drafts)

**`tryAtHome` += 4 items (giữ nguyên 5 items cũ, append):**

| # | cmd | why | observeWith |
|---|---|---|---|
| 6 | `systemd-run --unit=lab-tcpdump --collect /usr/bin/tcpdump -i ens33 -n -e -p -U -w /tmp/dora.pcap '(udp port 67 or udp port 68) or arp or icmp'` | Chạy tcpdump dưới systemd unit → không bị HUP khi SSH ngắt; dừng bằng `systemctl stop lab-tcpdump` | Sau capture: `sudo chmod +r /tmp/dora.pcap && tcpdump -nn -tt -e -r /tmp/dora.pcap` để xem timestamp + src/dst |
| 7 | `sudo systemctl stop systemd-networkd systemd-networkd.socket; sudo rm -f /run/systemd/netif/leases/*; sudo ip addr flush dev ens33; sudo ip link set ens33 down; sleep 1; sudo ip link set ens33 up; sudo dhcpcd -1 -t 20 -B ens33` | Ép client phát DHCPDISCOVER fresh (không INIT-REBOOT). Cần khi muốn quan sát full DORA, không phải Request đơn lẻ. | tcpdump trên server phải thấy 4 dòng `BOOTP/DHCP, Discover → Offer → Request → ACK` thay vì chỉ Request |
| 8 | Case A: Client2 đặt static IP `.200` trước → `sudo cp /etc/netplan/50-...manual /etc/netplan/50-cloud-init.yaml && sudo netplan apply` → trên server `sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases' && sudo systemctl restart isc-dhcp-server` → Client1 xin DHCP fresh | Quan sát ICMP ping-check của ISC dhcpd: server ping `.200` trước khi cấp; thấy Client2 reply → abandon `.200`, cấp `.201` | Server log: `Abandoning IP address 192.168.81.200: pinged before offer`. Lease DB: `binding state abandoned`. Pcap có ICMP echo request từ `.128 → .200` + reply từ Client2 trước OFFER |
| 9 | Case B: Client1 đang giữ DHCP `.201` → Client2 đặt static `.201` → `for i in 1 2 3 4 5 6; do sudo arping -c 2 -w 1 -I ens33 192.168.81.201; sleep 1; done` | DHCP server **không phát hiện** conflict vì đã ACK xong. Cả 2 client cùng claim → `arping` show 2 MAC khác nhau cùng "is-at .201" | Output arping luân phiên 2 MAC. Pcap filter `arp` thấy ARP reply từ 2 src MAC khác nhau với cùng `arp.src.proto_ipv4` |

**`walkthrough` += 2 steps (step 8, 9):**

| step | what | code snippet (rút gọn) | failModes/fixSteps |
|---|---|---|---|
| 8 | Conflict scenario A — manual TRƯỚC, `ping-check` save the day | `ping-check true; ping-timeout 1;` trong dhcpd.conf + dhcpd phải chạy as root | failMode: ping-check silent fail nếu dhcpd as user `dhcpd` (mất CAP_NET_RAW). Fix: systemd drop-in override |
| 9 | Conflict scenario B — manual SAU, ARP flap | `arping` thấy 2 MAC; `journalctl -k` có thể có `IPv4 sent an invalid ARP reply` | failMode: traffic đến IP đó intermittent. Fix sản phẩm: DHCP snooping + Dynamic ARP Inspection ở switch |

**`misconceptions` += 4 items:**

| wrong | right | why-it-matters |
|---|---|---|
| "`ping-check on` luôn hoạt động khi config trong dhcpd.conf" | dhcpd chạy as non-root user `dhcpd` (default systemd unit) **mất CAP_NET_RAW** → silent skip ICMP probe → `ping-check` vô hiệu hoá hoàn toàn. Cần systemd drop-in để chạy as root. Verify: `grep CapEff /proc/$(pidof dhcpd)/status` phải = `000001ffffffffff` | Conflict scenario A test pass dù config sai vì nghĩ `ping-check` hoạt động |
| "iptables INPUT đủ chặn rogue DHCP" | `systemd-networkd` dùng raw socket **AF_PACKET** → ingress packet **bypass iptables INPUT** hoàn toàn. Phải dùng **nftables `netdev/ingress` hook** (priority -300) để filter ở L2 trước AF_PACKET | Lab với VMware NAT có DHCP riêng `.254` sẽ chen OFFER → nếu chỉ block bằng iptables → vẫn nhận IP từ VMware DHCP |
| "systemd-networkd restart đủ để client xin DHCP fresh (DORA)" | networkd cache lease tại `/run/systemd/netif/leases/` → khi restart sẽ làm **INIT-REBOOT** (DHCPREQUEST IP cũ) thay vì DISCOVER. Phải `rm` lease + flush addr + link down/up + dùng `dhcpcd -1 -B` để ép DISCOVER fresh | Capture mà không thấy DISCOVER → tưởng cấu hình DHCP server sai trong khi thực ra client đang INIT-REBOOT |
| "Linux static IP trùng IP đang dùng sẽ tự DECLINE/back-off" | systemd-networkd gán static IP **không thực thi DAD strict**, không gửi DHCPDECLINE, không log warning rõ ràng → cả 2 máy cùng claim, gây ARP flap → traffic intermittent | Nghĩ Linux tự xử lý conflict → không bật DHCP snooping/DAI ở switch → mạng prod đứt liên tục khi có user gõ nhầm IP |

### Playground integration (`dhcp-playground.tsx`)

Theo pattern `http-playground.tsx` / `icmp-ping-playground.tsx`:
- Thêm tab/section "Upload pcap" dùng `<PcapUploadZone />` từ `shared/pcap-upload-zone.tsx`
- Thêm 2 sample buttons:
  - **"Case A — ping-check abandons IP"** → load `/sample-pcaps/dhcp-case-a.pcap` (~10-15 packets)
  - **"Case B — ARP flap"** → load `/sample-pcaps/dhcp-case-b.pcap` (~25-30 packets)
- Re-use `PacketDecoder` (3-panel summary/layer-tree/hex) đã ship cho icmp-ping/http

Pcap sample path: tham khảo cách icmp-ping/http làm. Có thể là `app/public/sample-pcaps/` hoặc inline base64 — quyết định trong Phase 5 sau khi check.

### Pcap re-capture flow (Phase 2)

Trên Server VM (.128), sau khi user bật `.129` và `.130`:

```bash
# 1. Reset state
sudo systemctl stop isc-dhcp-server
sudo sh -c 'echo -n > /var/lib/dhcp/dhcpd.leases'
sudo systemctl start isc-dhcp-server

# 2. CASE A — Client2 static .200 trước, Client1 xin DHCP
# (chi tiết trong STEP-BY-STEP.md §6.2 → §6.6, dùng systemd-run --unit=lab-tcpdump)
# Output: /tmp/case-A.pcap

# 3. CASE B — reset, cả 2 client DHCP, sau đó Client2 cướp IP Client1
# (§7.1 → §7.6)
# Output: /tmp/case-B.pcap

# 4. SCP về Windows host
# (chạy từ Windows): scp dhcp-username@192.168.81.128:/tmp/case-{A,B}.pcap plans/dattqh/.../source/pcaps/
```

Capture filter chuẩn: `'(udp port 67 or udp port 68) or arp or icmp'`. Mỗi pcap ≤200 packets / ≤5 MB (cap của PcapParser hiện tại).

### Out-of-scope (defer)

- ❌ **Sửa field-name mismatch `tryAtHome`/`try_at_home`** giữa Mongo và Zod — đang work qua converter layer; điều tra tách session riêng nếu rảnh
- ❌ **Codify VMware Workstation lab setup vào lab content** — too long, không phù hợp; STEP-BY-STEP.md đầy đủ rồi → archive vào `plans/.../source/`
- ❌ **Tự động hoá pcap re-capture qua script** — manual once đủ, không YAGNI; chỉ document command

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Client VM `.129` `.130` tắt → không re-capture được | High (blocks Phase 2) | Hỏi user bật VM trước khi vào Phase 2; verify ping trước capture |
| Sample pcap > 5MB cap của PcapParser | Med | Capture filter chặt, lease 120s = capture ngắn ~3-5 phút là đủ |
| Field-name mismatch khi update Mongo (`tryAtHome` vs `try_at_home`) | High (FE fail render) | Verify converter layer ở API endpoint `/api/labs/:slug`; dùng đúng `tryAtHome` (key Mongo) trong update script; smoke test sau update |
| Append vào walkthrough làm lệch numbering | Low | Step số 8, 9 — append tail; UI render array order |
| Pcap re-capture mismatch description trong lab content | Med | Lock IP/MAC trong description theo pcap thực tế (ghi MAC động vào step description) |
| User chưa tắt VMware VMnet8 DHCP → pcap có noise từ `.254` | Med | Pre-flight check: nftables filter trên 2 client phải active TRƯỚC khi re-capture |

---

## Success Metrics

1. **Lab content updated**: `labs.dhcp.tryAtHome.length = 9`, `walkthrough.length = 9`, `misconceptions.length = 9` sau khi script chạy
2. **Pcap parse OK**: Drag-drop `case-A.pcap` vào DhcpPlayground show ≥1 ICMP echo + ≥4 BOOTP/DHCP packets; `case-B.pcap` show ≥2 ARP reply với khác MAC cho cùng IP
3. **No regression**: Lab `dhcp` page render bình thường sau update; `pnpm --dir app run typecheck` pass; FE Zod parse không error
4. **Source archived**: `plans/dattqh/260524-1055-dhcp-lab-codify/source/STEP-BY-STEP.md` + `REPORT.md` + `pcaps/case-{A,B}.pcap` đầy đủ
5. **Docs sync**: `docs/project-changelog.md` + `docs/project-roadmap.md` có entry; journal entry tạo cuối session

---

## Next Steps (sau approval)

1. User bật VM `.129` và `.130`, confirm SSH OK
2. Spawn `/ck:plan` với context này → tạo plan dir + 6 phase files
3. Execute phases sequentially: archive → recapture → drafts → mongo-update → playground → docs

---

## Unresolved Questions

1. **Sample pcap storage path**: `app/public/sample-pcaps/` (static served) hay inline base64 trong playground? Theo dõi cách icmp-ping/http đã làm — verify trong Phase 5.
2. **Re-capture command có nên schedule qua `systemd-run --on-active`** (giống bẫy SSH chết) hay làm thủ công khi ngồi tại console VMware? Mặc định: thủ công, đơn giản hơn.
3. **Walkthrough steps 8-9 có cần code snippet đầy đủ không** (sẽ bloat) hay link sang `source/STEP-BY-STEP.md` để chi tiết? Đề xuất: code snippet ngắn (3-5 dòng cốt lõi), không paste full STEP-BY-STEP.
4. **Có muốn smoke test bằng cách browse `/labs/dhcp` sau khi update Mongo không?** Cần dev:server + dev FE running. Bao gồm trong Phase 6?
