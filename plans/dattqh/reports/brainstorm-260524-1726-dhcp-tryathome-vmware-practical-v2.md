# Brainstorm v2 — DHCP `tryAtHome` Practical (Core/Optional split)

**Date:** 2026-05-24 17:26 (Asia/Saigon)
**Branch:** master
**Status:** Approved — ready for `/ck:plan`
**Supersedes:** `brainstorm-260524-1718-dhcp-tryathome-vmware-practical.md` (v1)
**Source guide:** `plans/dattqh/260524-1055-dhcp-lab-codify/source/STEP-BY-STEP-v2-hybrid.md`

---

## 1. Lý do có v2

V1 thiết kế 5 phase bám hoàn toàn theo SBS-v2-hybrid (Hybrid với NAT + ping-check override + APIPA). Sau review đối chiếu **yêu cầu bài tập gốc**:

> "Dựng Lab DHCP Server-Client trên Ubuntu 24.04 (ESXi/VMware). 1 Server + 1 Client (Option +1 client manual trùng IP). Bắt gói bằng tcpdump/Wireshark. Test cả Case manual TRƯỚC + Case manual SAU."

→ V1 **over-engineering**: NAT Gateway, CAP_NET_RAW override, APIPA fallback không nằm trong assignment.
→ V1 **thiếu**: ESXi alternative path, Wireshark GUI workflow explicit, "phân tích hiện tượng" mỗi case, báo cáo so sánh cuối.

V2 tách **Core (bám sát assignment)** + **Optional (mở rộng SBS-v2)**.

---

## 2. Yêu cầu bài tập gốc — coverage matrix

| # | Requirement | V2 coverage |
|---|-------------|-------------|
| 1 | ESXi HOẶC VMware | ✅ Core Phase 1 có note ESXi tương đương (vSwitch Port Group, disable DHCP) |
| 2 | Ubuntu 24.04 | ✅ |
| 3 | 1 Server + 1 Client (tối thiểu) | ✅ Core Phase 1-3 chỉ 2 VM; Client2 chỉ dựng khi vào Phase 4-5 |
| 4 | Option +1 Client manual trùng IP | ✅ Core Phase 4 (Case A) + Phase 5 (Case B) |
| 5 | tcpdump + Wireshark | ✅ Core Phase 3 — explicit `scp pcap về host → mở Wireshark GUI → filter bootp → expand Options → screenshot` |
| 6 | "Kiểm tra điều gì xảy ra" | ✅ Block `analysis: {observation, mechanism, lesson}` mỗi case |
| 7 | Case A + Case B | ✅ Phase 4 + 5 |
| 8 | Deliverable báo cáo | ✅ Core Phase 6 — Compare table + bài học rút ra |

---

## 3. Schema extension (revised từ v1)

```ts
{
  // existing
  why: string,
  cmd: string,
  observeWith: string,

  // NEW (optional)
  title?: string,
  sbsSection?: string,
  vmTarget?: 'host' | 'server' | 'client1' | 'client2',
  estimatedMinutes?: number,
  phaseType?: 'core' | 'optional',          // NEW v2 — UI render khác nhau
  steps?: Array<{
    n: number,
    do: string,
    expect: string,
    screenshot?: {
      src: string,                           // /labs/dhcp/screenshots/...
      alt: string,
      caption: string,
    },
  }>,
  analysis?: {                               // NEW v2 — answer "điều gì xảy ra"
    observation: string,                     // Hiện tượng quan sát
    mechanism: string,                       // Vì sao xảy ra (RFC/cơ chế)
    lesson: string,                          // Bài học rút ra
  },
  troubleshooting?: Array<{symptom: string, fix: string}>,
}
```

- `phaseType: 'core'` → render expanded mặc định, có checkmark required
- `phaseType: 'optional'` → render collapsed, label "Mở rộng (tuỳ chọn)"
- `analysis` field hiển thị dưới `steps[]` dạng callout 3-row (Quan sát / Cơ chế / Bài học)

---

## 4. 6 Core phases + 3 Optional phases

### CORE (bám assignment — 6 phase)

| # | Title | SBS ref | VM target | Time | Screenshots |
|---|-------|---------|-----------|------|-------------|
| 1 | Setup tối thiểu (2 VM + VMnet1) | §2 (minimal) | host + server + client1 | ~20' | 3 (VMnet Editor DHCP off, VM Settings server, `ip -br link`) |
| 2 | Cài + cấu hình DHCP Server minimal | §3.4-3.5 (no NAT, no override) | server + client1 | ~15' | 3 (`dhcpd -t` OK, dhcpd.conf 15 dòng, Client1 nhận IP từ pool) |
| 3 | Bắt DORA bằng tcpdump + mở Wireshark GUI | §5 + add scp workflow | server → host | ~25' | 4 (tshark CLI 5-packet, scp pcap, Wireshark filter bootp, expand Options 53/51/54/50) |
| 4 | Case A — Manual đặt TRƯỚC | §7 (giản lược) | client2 + client1 | ~20' | 3 (Client2 static .100, server log + lease DB sau khi Client1 xin, pcap thấy server cấp IP khác) + `analysis` block |
| 5 | Case B — Manual đặt SAU | §8.1-8.5 (skip APIPA) | client1 đã DHCP + client2 steal | ~20' | 3 (arping 2 MAC luân phiên, `ip addr` cả 2 client cùng .100, dmesg conflict) + `analysis` block |
| 6 | So sánh 2 case + báo cáo | §9 SBS-v2 | report deliverable | ~15' | 1 (bảng so sánh markdown rendered) + 1 (best practice phòng ngừa) |

**Tổng Core:** ~115' lab time, **~17 screenshot**.

### OPTIONAL (mở rộng — render collapsed)

| # | Title | SBS ref | Khi nào cần | Time |
|---|-------|---------|-------------|------|
| O1 | NAT Gateway cho Client ra internet | §3.3 (MASQUERADE, iptables-persistent, IP forwarding) | Muốn Client ping 8.8.8.8 | ~15' |
| O2 | ping-check deep dive (CAP_NET_RAW override) | §3.6 + Case A 7.7 | Muốn thấy server tự abandon IP qua ICMP | ~20' |
| O3 | DHCPDECLINE + APIPA fallback (dhcpcd) | §8.6 | Muốn quan sát RFC 3927 IPv4LL | ~15' |

**Optional render**: thu gọn, click expand. Screenshot tổng ~6-8 ảnh.

---

## 5. Storage layout (revised)

```
app/public/labs/dhcp/screenshots/
├── core/
│   ├── phase1-01-vmnet1-dhcp-off.png
│   ├── phase1-02-vm-settings-server.png
│   ├── phase1-03-ip-br-link.png
│   ├── phase2-01-dhcpd-test-ok.png
│   ├── phase2-02-dhcpd-conf-minimal.png
│   ├── phase2-03-client-receives-ip.png
│   ├── phase3-01-tshark-cli-5pkt.png
│   ├── phase3-02-scp-pcap-to-host.png
│   ├── phase3-03-wireshark-filter-bootp.png
│   ├── phase3-04-wireshark-expand-options.png
│   ├── phase4-01-client2-static-100.png
│   ├── phase4-02-server-log-after-discover.png
│   ├── phase4-03-pcap-server-skips-100.png
│   ├── phase5-01-arping-2-mac.png
│   ├── phase5-02-ip-addr-both-clients.png
│   ├── phase5-03-dmesg-conflict.png
│   └── phase6-01-compare-table.png
└── optional/
    ├── opt1-nat-iptables-list.png
    ├── opt1-client-ping-internet.png
    ├── opt2-dhcpd-as-root-cap.png
    ├── opt2-log-abandon-pinged.png
    ├── opt3-dhcpcd-decline.png
    └── opt3-ip-addr-apipa-169.png
```

- Core: 17 PNG × ~150KB ≈ 2.5MB
- Optional: 6 PNG × ~150KB ≈ 900KB
- Total ~3.4MB, captioning Vietnamese, VMware Workstation Pro 25H2

---

## 6. Sample `analysis` block (cho mỗi Case)

**Case A — Manual TRƯỚC:**
```json
{
  "observation": "Client2 đã có .100 static. Client1 xin DHCP, server cấp .101 thay vì .100 (kèm warning trong log nếu bật ping-check).",
  "mechanism": "Server không 'biết' IP nào đang dùng ngoài lease DB. Khi cấp IP, nếu có cơ chế bảo vệ (ping-check ICMP, ARP probe) thì server skip; nếu không có, server vẫn cấp .100 → Client1 ARP probe phát hiện conflict → DECLINE → IP kế tiếp.",
  "lesson": "Best practice: KHÔNG đặt IP tĩnh trong range DHCP pool. Dùng DHCP reservation (host { hardware ethernet ...; fixed-address ...; }) hoặc tách IP tĩnh ra subnet riêng/khoảng ngoài pool."
}
```

**Case B — Manual SAU:**
```json
{
  "observation": "Client1 đang dùng .100 (đã ACK). Client2 đặt static cùng .100. arping từ server thấy 2 MAC khác nhau cùng claim .100. Traffic flap, đứt mạng tới Client1.",
  "mechanism": "DHCP server chỉ kiểm tra TRƯỚC khi cấp (DISCOVER → ICMP/ARP probe → OFFER), không re-check sau ACK. Hai client cùng L2 broadcast 'is-at' → ARP cache của switch/router/other host bị overwrite liên tục → traffic về .100 ngẫu nhiên tới 1 trong 2 MAC.",
  "lesson": "DHCP một mình không phòng được conflict do user lấn IP. Cần kết hợp: (a) DHCP reservation cho thiết bị quan trọng, (b) DHCP snooping + Dynamic ARP Inspection (DAI) ở switch, (c) IPAM theo dõi cả IP static."
}
```

---

## 7. Authoring workflow (giữ từ v1)

```
Phase loop (×6 core + 3 optional):
  Agent  →  command block + screenshot checklist  →  User
  User   →  chạy trên VMware Pro 25H2, capture + paste text output
  Agent  →  verify + name + crop ảnh
  Agent  →  commit vào app/public/labs/dhcp/screenshots/{core|optional}/
  Agent  →  draft content phase (steps[], analysis, screenshot refs)
```

User có thể chia 2-3 session. Mỗi phase commit riêng để dễ rollback.

---

## 8. Implementation phases (cho `/ck:plan`)

1. **Schema extension** — Zod patch `app/src/lib/schema-lab.ts` (thêm `phaseType`, `analysis`, `steps[]`) + cập nhật `docs/lab-schema-v3.md`
2. **Renderer extension** — `lab-renderer.tsx` TRY IT section:
   - Detect `steps[]` → expanded card với image grid
   - `phaseType: 'optional'` → collapsed accordion với label "Mở rộng"
   - `analysis` block → 3-row callout (Quan sát / Cơ chế / Bài học)
3. **Static assets folder** — tạo `app/public/labs/dhcp/screenshots/{core,optional}/`
4. **Lab authoring — Core** (6 phase) — user chạy lab trên VMware, Agent compose + commit ảnh
5. **Lab authoring — Optional** (3 phase) — tương tự, nếu user muốn cover
6. **Mongo update script** — `server/scripts/update-lab-dhcp-tryathome-v3.js` (idempotent, backup trước, hash compare)
7. **Run update + smoke test FE** — verify 6 core + 3 optional render đúng
8. **Docs + journal** — update `lab-schema-v3.md` + journal entry + changelog

---

## 9. Risk & mitigations (revised)

| Risk | Mitigation |
|------|-----------|
| User thiếu thời gian, không làm hết Optional | Optional render collapsed, không block deliverable Core. Có thể skip O1/O2/O3 |
| ESXi user follow VMware path không khớp UI | Phase 1 có note explicit "ESXi tương đương: Networking → vSwitch → Port Group → security policy" + screenshot caption rõ "VMware Workstation Pro 25H2" |
| Schema thêm 2 field (`phaseType`, `analysis`) ảnh hưởng lab khác | Cả 2 optional → 7 lab khác render không đổi |
| Screenshot lộ info nhạy cảm | Pre-commit checklist: crop taskbar, blur hostname |
| Renderer chưa deploy ↔ schema mới | Field optional + fallback view = không break |
| Bundle 3.4MB ảnh tăng repo | `app/public/` không vào JS bundle. Optimize WebP sau nếu cần |

---

## 10. Success criteria

- [ ] Schema patch backward compatible — 7 lab cũ render không đổi
- [ ] Lab DHCP `tryAtHome` render 6 core phase + 3 optional phase
- [ ] Mỗi Case (4, 5) có `analysis` block (Quan sát / Cơ chế / Bài học)
- [ ] Phase 3 có Wireshark GUI workflow explicit (scp + filter + expand)
- [ ] Phase 6 có compare table + best practice phòng ngừa
- [ ] Phase 1 có note ESXi alternative
- [ ] Tất cả screenshot khớp output thật từ VMware Workstation Pro 25H2
- [ ] FE `pnpm --dir app run typecheck` + build pass
- [ ] Mongo update script idempotent

---

## 11. Decisions log (cộng dồn v1 + v2)

| Q | Decision |
|---|----------|
| Scope | **v2:** Core 6 phase (bám assignment) + Optional 3 phase (mở rộng SBS) |
| Evidence handling | Reference screenshot embedded |
| Schema | Extend `tryAtHome[]` optional field — `phaseType`, `analysis`, `steps[]` |
| Capture model | User chạy VM thật, Agent guide + verify + commit |
| Storage | `app/public/labs/dhcp/screenshots/{core,optional}/*.png` |
| Task grouping | **v2:** 6 core + 3 optional |
| Old content | Thay hẳn 9 item cũ |
| VMware version | Workstation Pro 25H2 |
| ESXi support | Note tương đương ở Phase 1, không tách path riêng |
| Field generic per phase | Giữ `{why, cmd, observeWith}` làm summary + thêm `steps[]` chi tiết |
| Caption language | Vietnamese only |
| `analysis` block | **v2 mới:** 3 row (observation / mechanism / lesson) cho mỗi Case |
| Wireshark workflow | **v2 mới:** explicit scp + GUI filter + expand |
| Compare report phase | **v2 mới:** Phase 6 deliverable |

---

## 12. Unresolved questions

(Không có — sẵn sàng `/ck:plan`.)
