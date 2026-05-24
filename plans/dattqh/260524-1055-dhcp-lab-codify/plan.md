---
title: "Codify DHCP VMware Lab — 2-Client Scenario into App Content"
description: "Append +4 tryAtHome / +2 walkthrough / +4 misconceptions to lab `dhcp` in Mongo; integrate 2 sample pcap (case-A ping-check + case-B ARP flap) into DhcpPlayground via PcapUploadZone"
status: completed
priority: P2
effort: 7h
completed_at: 2026-05-24
branch: master
tags: [content, labs, dhcp, mongodb, frontend, pcap]
created: 2026-05-24
blockedBy: []
blocks: []
relatedPlans:
  - 260424-0922-osi-think-depth-upgrade  # cùng lab dhcp, khác fields (tldr/walkthrough why vs tryAtHome/walkthrough additions)
  - 260507-2215-tcpdump-lab-enhancement  # pattern reference (icmp-ping/http enhancement)
---

# Codify DHCP VMware Lab → App Lab Content

## Goal

Bổ sung nội dung thực hành lab DHCP server/client (Ubuntu 24.04 + VMware Workstation, isc-dhcp-server, 2-client scenario test conflict) vào lab `dhcp` trong Mongo. Tích hợp 2 sample pcap (Case A `ping-check` + Case B ARP flap) vào `DhcpPlayground` để học viên có thể explore packet-level mà không cần dựng VM.

## Source Materials

- **Design**: `plans/dattqh/reports/brainstorm-260524-1055-dhcp-lab-codify.md`
- **Input doc**: `plans/dattqh/reports/dhcp-lab-step-by-step.md` (fetched từ VM 192.168.81.128)
- **Comparison ref**: `plans/dattqh/reports/comparison-260524-1055-dhcp-lab-vs-peer-pr3.md`

## Final State Targets

| Field | Hiện tại | Sau plan | Delta |
|---|---|---|---|
| `lab.dhcp.tryAtHome.length` | 5 | 9 | +4 (systemd-run tcpdump, dhcpcd ép DISCOVER, Case A, Case B arping) |
| `lab.dhcp.walkthrough.length` | 7 | 9 | +2 (Case A ping-check, Case B ARP flap; full snippet 20-30 dòng/step) |
| `lab.dhcp.misconceptions.length` | 5 | 9 | +4 (CAP_NET_RAW silent fail, AF_PACKET bypass iptables, INIT-REBOOT cache, Linux static không DAD) |
| `app/public/sample-pcaps/` | (n/a) | + 2 file | `dhcp-case-a.pcap`, `dhcp-case-b.pcap` |
| `DhcpPlayground` | no pcap upload | có `<PcapUploadZone />` + 2 sample button | parity với http/icmp-ping playground |

## Phases

| # | Phase | Status | Effort | Blocker |
|---|-------|--------|--------|---------|
| 1 | [Archive source — fetch artifacts từ VM lab](./phase-01-archive-source.md) | ✅ completed | 0.5h | None |
| 2 | [Re-capture pcap trong session sạch](./phase-02-recapture-pcap.md) | ✅ completed | 1.5h | User boot VM .129 + .130 |
| 3 | [Content drafts — JSON cho tryAtHome/walkthrough/misconceptions](./phase-03-content-drafts.md) | ✅ completed | 1.5h | Phase 2 (pcap để verify MAC/IP) |
| 4 | [Mongo update script](./phase-04-mongo-update-script.md) | ✅ completed | 1h | Phase 3 |
| 5 | [Playground integration — PcapUploadZone + sample buttons](./phase-05-playground-integration.md) | ✅ completed | 1.5h | Phase 2 (cần pcap), Phase 4 (parallel) |
| 6 | [Docs + journal + smoke test](./phase-06-docs-journal.md) | ✅ completed | 1h | Phase 4, Phase 5 |

**Total**: ~7h

## Prerequisites

- **VM `.129` (dhcp-client) và `.130` (dhcp-client-2) phải UP** trước Phase 2. Hiện đang OFFLINE (ping fail). User cần bật VMware → power on cả 2 VM, verify `ping 192.168.81.129` và `ping 192.168.81.130` từ Windows host trả lời.
- **VM `.128` (server)** đã UP với isc-dhcp-server active, dhcpd.conf đã setup (range `.200-.201`, ping-check on, lease 120s/300s).
- **VMnet8 DHCP đã tắt** (verify trong Virtual Network Editor) HOẶC nftables filter trên 2 client đang active (xem `STEP-BY-STEP.md §3.2`).
- **Mongo dev DB** reachable qua `.env.development` MONGODB_URI (đã verify).

## Out-of-Scope (Defer)

- ❌ Sửa field-name mismatch `tryAtHome` (Mongo) vs `try_at_home` (Zod) — đang work qua converter layer; điều tra tách session
- ❌ Pull DHCP field-by-field protocol analysis từ peer PR INET-Support/cloud-labs#3
- ❌ Full VMware Workstation setup vào lab content — quá dài; archive trong `source/` thay vào TRY IT
- ❌ Auto-recapture script — manual once đủ, YAGNI

## Risks

| Risk | Phase | Mitigation |
|---|---|---|
| Client VM .129/.130 tắt → block Phase 2 | 2 | User boot trước, verify ping; nếu không bật được → cancel plan |
| Sample pcap > 5MB cap của PcapParser | 2 | Filter chặt `(udp port 67 or 68) or arp or icmp`; lease 120s đủ |
| Field-name mismatch khi update Mongo | 4 | DÙNG `tryAtHome` (camelCase, key Mongo) trong script; smoke test FE Phase 6 |
| Append làm bloat lab content | 3 | Full snippet walkthrough chỉ 2 step thêm; misconceptions tập trung 4 bẫy non-overlap với 5 cũ |
| Pcap re-capture có noise từ VMware DHCP .254 | 2 | Verify nftables filter active trên 2 client trước capture |

## Success Criteria

1. ✅ `lab.dhcp.tryAtHome.length === 9`, `walkthrough.length === 9`, `misconceptions.length === 9` sau Phase 4
2. ✅ `app/public/sample-pcaps/dhcp-case-{a,b}.pcap` exists, parseable bởi `pcap-parser.ts` (≤200 pkt, ≤5 MB)
3. ✅ Drag-drop case-A.pcap vào DhcpPlayground hiển thị ≥1 ICMP echo + ≥4 BOOTP/DHCP packets
4. ✅ Drag-drop case-B.pcap hiển thị ≥2 ARP reply với khác MAC cho cùng IP
5. ✅ `pnpm --dir app run typecheck` pass, FE Zod parse `lab.dhcp` không error
6. ✅ Browse `/labs/dhcp` render bình thường, 2 sample button work
7. ✅ `docs/project-changelog.md` + `docs/project-roadmap.md` có entry; journal entry tạo

## Next Steps After Completion

- Optional: tách session viết phase-7 cho DHCP field analysis deep (từ ý peer PR), append vào walkthrough hoặc tldr
- Optional: fix field-name mismatch tryAtHome ↔ try_at_home ở converter layer
- Optional: capture thêm pcap case-C (ARP Probe RFC 5227 khi gán manual IP chưa cấp)
