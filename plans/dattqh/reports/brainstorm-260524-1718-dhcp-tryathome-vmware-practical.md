# Brainstorm — Replace DHCP `tryAtHome` bằng Hands-on Practical + VMware Screenshots

**Date:** 2026-05-24 17:18 (Asia/Saigon)
**Branch:** master
**Status:** Approved — ready for `/ck:plan`
**Source guide:** `plans/dattqh/260524-1055-dhcp-lab-codify/source/STEP-BY-STEP-v2-hybrid.md`

---

## 1. Problem statement

`tryAtHome[]` hiện tại của lab `dhcp` có 9 item dạng "shell command + observe" rời rạc:
- Mix giữa generic dhclient demo + Case A/B mới
- Không có evidence visual — học viên không biết "đúng nhìn ra thế nào"
- Không khớp quy trình thật trong SBS-v2-hybrid (sách lab dài 938 dòng đã ổn định)

Mục tiêu: thay hẳn 9 item cũ → 5 phase practical bám theo §2-§8 của SBS-v2-hybrid, mỗi phase có reference screenshot embedded (chụp từ VMware Workstation Pro 25H2 trên VM thật).

---

## 2. Final design — 5-Phase Practical

### 2.1. Schema extension (backward compatible)

Patch vào `tryAtHome[]` item shape — tất cả field mới optional:

```ts
{
  // existing — các lab khác giữ nguyên
  why: string,
  cmd: string,                              // summary command block
  observeWith: string,                      // summary expect

  // NEW (optional)
  title?: string,                           // "Phase 3 — DORA Capture"
  sbsSection?: string,                      // "§5"
  vmTarget?: 'host' | 'server' | 'client1' | 'client2',
  estimatedMinutes?: number,
  steps?: Array<{
    n: number,
    do: string,
    expect: string,
    screenshot?: {
      src: string,                          // /labs/dhcp/screenshots/...
      alt: string,
      caption: string,
    },
  }>,
  troubleshooting?: Array<{symptom: string, fix: string}>,
}
```

- Renderer: detect `steps[]` → expanded card view (step list + image grid). Nếu absent → fallback render `{why, cmd, observeWith}` như hiện tại.
- 7 lab khác không bị ảnh hưởng (field optional, Zod `.optional()`).
- Không bump schema version vì pure additive.

### 2.2. Five phases map sang SBS-v2

| # | Title | SBS section | VM target | Time | Số screenshot |
|---|-------|-------------|-----------|------|---------------|
| 1 | Setup VMware + 3 VM | §2 + §3.2 + §4.1 | host + server + client | ~30' | 4 (Network Editor, VM Settings ×2, `ip -br link` server) |
| 2 | Server NAT Gateway + ISC dhcpd | §3.3-3.7 | server + client1 | ~25' | 4 (`iptables -t nat -L`, `dhcpd -t` OK, journalctl, client ping 8.8.8.8) |
| 3 | DORA Capture + field analysis | §5 | server + client1 | ~25' | 4 (tshark 5-packet, Wireshark Options expand, xid khớp, MAC chaddr) |
| 4 | Case A — Manual TRƯỚC (ping-check) | §7 | server + client1+2 | ~20' | 3 (dhcpd log abandon, lease DB abandoned, pcap ICMP chen giữa) |
| 5 | Case B — Manual SAU (ARP flap + APIPA) | §8 | server + client1+2 | ~25' | 3 (arping 2 MAC, dhcpcd DECLINE+IPv4LL, `ip addr` APIPA) |

Tổng: ~125' lab time, **~18 reference screenshot**.

### 2.3. Storage layout

```
app/public/labs/dhcp/screenshots/
├── phase1-01-vmnet-editor-dhcp-off.png
├── phase1-02-vm-settings-server-2nic.png
├── phase1-03-vm-settings-client-1nic.png
├── phase1-04-ip-br-link-server.png
├── phase2-01-iptables-nat-list.png
├── phase2-02-dhcpd-test-ok.png
├── phase2-03-journalctl-realtime.png
├── phase2-04-client-ping-internet.png
├── phase3-01-tshark-5-packets.png
├── phase3-02-wireshark-options-expand.png
├── phase3-03-xid-match-4-packets.png
├── phase3-04-chaddr-mac.png
├── phase4-01-dhcpd-log-abandon.png
├── phase4-02-lease-db-abandoned.png
├── phase4-03-pcap-icmp-between.png
├── phase5-01-arping-mac-flap.png
├── phase5-02-dhcpcd-decline-apipa.png
├── phase5-03-ip-addr-apipa-169.png
```

- Serve qua Vite static, reference URL `/labs/dhcp/screenshots/<name>.png`
- Estimate: 18 PNG × ~150KB = ~2.7MB bổ sung repo
- Caption + alt Vietnamese only
- Mỗi caption ghi rõ "VMware Workstation Pro 25H2"

---

## 3. Authoring workflow (Agent + User collaboration)

```
Phase loop (×5):
  Agent  →  command block + screenshot checklist  →  User
  User   →  chạy trên VMware, capture PrintScreen, paste text output
  Agent  →  verify output match SBS, name + crop ảnh
  Agent  →  commit vào app/public/labs/dhcp/screenshots/
  Agent  →  draft content phase (steps[], expect, screenshot refs)
```

Chú ý:
- Privacy: blur/crop IP host, hostname, taskbar trước commit
- VMware version 25H2 cố định — ghi rõ trong caption
- Mỗi phase commit riêng để dễ rollback nếu cần re-capture
- User có thể chia 2-3 session để hoàn thành (Setup → Cases)

---

## 4. Evaluated alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **5-phase + embed screenshot** (chosen) | Cover full SBS, evidence rõ, schema additive | ~2-3h user time | ✅ Recommended |
| Synthetic terminal output → PNG | Không cần user mở VM, nhanh | Thiếu VMware UI thật, mất authenticity | ❌ Loại — user muốn evidence thật |
| Upload + AI verify screenshot | UX cao, gamified | Cần upload endpoint + storage backend + Gemini vision | ❌ Loại — out of scope |
| 3 task lớn (Setup gộp, Case A, Case B) | Ít task UI nhẹ | Task Setup >20 bước overwhelm | ❌ Loại |
| Giữ 2-3 item generic + thêm 5 phase | Reusable content cũ | tryAtHome[] >7 item, dài quá | ❌ Loại — user chọn thay hẳn |

---

## 5. Implementation phases (cho `/ck:plan`)

1. **Schema extension** — Zod patch `app/src/lib/schema-lab.ts` + cập nhật `docs/lab-schema-v3.md`
2. **Renderer extension** — `lab-renderer.tsx` TRY IT section detect `steps[]` → expanded card view với image grid, DOMPurify sanitize, lazy-load
3. **Static assets folder** — tạo `app/public/labs/dhcp/screenshots/`, verify Vite serve OK
4. **Lab authoring loop** — 5 sub-phase, user chạy lab trên VMware Pro 25H2, Agent compose content + commit ảnh
5. **Mongo update script** — `server/scripts/update-lab-dhcp-tryathome-v3.js` (idempotent, backup trước, hash compare)
6. **Run update + smoke test** — verify FE render 5 phase + screenshot load OK
7. **Docs update** — `lab-schema-v3.md` + journal entry + changelog

---

## 6. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Lab time ~2-3h dài, user bỏ giữa chừng | Chia commit per-phase, có thể tạm dừng giữa các phase |
| Screenshot lộ info nhạy cảm (IP host, hostname) | Checklist pre-commit: crop taskbar, blur hostname nếu lộ |
| VMware UI version drift (25H2 → bản sau) | Ghi rõ "Workstation Pro 25H2" trong caption + lab-schema-v3.md note |
| Renderer chưa deploy ↔ schema mới | Field optional + fallback view = không break |
| Bundle 2.7MB ảnh tăng repo size | Commit vào `app/public/` không vào JS bundle, có thể optimize WebP sau |
| Mongo update script chạy lại nhân đôi | Hash compare `walkthrough+tryAtHome+misconceptions` + skip nếu giống |

---

## 7. Success metrics

- [ ] Schema patch backward compatible — 7 lab cũ render không đổi
- [ ] DHCP lab tryAtHome render 5 phase card với step list + ~18 screenshot
- [ ] Tất cả screenshot khớp output thật từ VMware Workstation Pro 25H2 session
- [ ] FE `pnpm --dir app run typecheck` + build pass
- [ ] Mongo update script idempotent (rerun không nhân đôi entry)
- [ ] Journal + changelog cập nhật

---

## 8. Next steps

1. User approve design → invoke `/ck:plan` với context report này
2. Plan sẽ break ra ~6-7 phase file chi tiết trong `plans/dattqh/260524-1718-dhcp-tryathome-vmware-practical/`
3. Phase 4 (Lab authoring loop) cần user availability để chạy VMware

---

## 9. Decisions log

| Q | Decision |
|---|----------|
| Scope | Full lab (§2-§8) — 5 phase |
| Evidence handling | Reference screenshot embedded vào lab |
| Schema | Extend `tryAtHome[]` với optional field, backward compatible |
| Capture model | User dựng 3 VM, Agent guide + user paste output/screenshot, Agent tổng hợp |
| Storage | `app/public/labs/dhcp/screenshots/*.png` |
| Task grouping | 5 phase theo SBS — Setup / NAT-Gateway / DORA / Case A / Case B |
| Old content (9 item) | Thay hẳn toàn bộ |
| VMware version | Workstation Pro 25H2 |
| Field generic per phase | Giữ `{why, cmd, observeWith}` làm summary cấp cao + thêm `steps[]` chi tiết |
| Ngôn ngữ caption/alt | Vietnamese only |

---

## 10. Unresolved questions

(Không có — tất cả open questions trong brainstorm đã được giải đáp.)
