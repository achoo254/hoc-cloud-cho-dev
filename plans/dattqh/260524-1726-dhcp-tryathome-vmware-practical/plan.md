---
title: "DHCP Lab — Replace tryAtHome bằng 6 Core + 3 Optional Practical Phase"
description: "Thay 9 item tryAtHome cũ của lab DHCP bằng 6 phase practical bám yêu cầu bài tập (Setup, dhcpd minimal, DORA + Wireshark, Case A manual TRƯỚC, Case B manual SAU, Compare & Report) + 3 phase optional mở rộng (NAT, ping-check, APIPA). Schema extension backward compatible, embed reference screenshots VMware Workstation Pro 25H2."
status: pending
priority: P2
effort: 12h
branch: master
tags: [content, labs, dhcp, schema-v3, frontend, vmware, screenshots]
created: 2026-05-24
blockedBy: []
blocks: []
relatedPlans:
  - 260524-1055-dhcp-lab-codify  # completed — codify SBS-v2 vào walkthrough/misconceptions; plan này thay tryAtHome
  - 260424-0922-osi-think-depth-upgrade  # cùng lab dhcp
brainstormReport: plans/dattqh/reports/brainstorm-260524-1726-dhcp-tryathome-vmware-practical-v2.md
---

# Plan — DHCP tryAtHome → 6 Core + 3 Optional Practical Phase

## Overview

Thay hẳn 9 item `tryAtHome[]` cũ (text-only commands) bằng cấu trúc 6 phase Core (bám assignment) + 3 phase Optional (mở rộng SBS-v2-hybrid). Mỗi phase có `steps[]` (do/expect/screenshot), `analysis` block (observation/mechanism/lesson), reference screenshot embed trong `app/public/labs/dhcp/screenshots/`.

**Yêu cầu bài tập gốc**: ESXi/VMware + Ubuntu 24.04 + 1 Server + 1 Client + Option +1 Client manual + tcpdump/Wireshark + Case A & B.

## Goals

- Schema v3 patch backward compatible (7 lab khác không đổi)
- 6 core phase render đúng UI + đầy đủ evidence
- 3 optional phase collapsed, có thể skip nếu user không muốn cover
- Mongo update script idempotent
- FE typecheck + build pass

## Non-Goals

- KHÔNG bump schema version (pure additive)
- KHÔNG xây upload endpoint cho user screenshot
- KHÔNG ESXi screenshot riêng — chỉ note tương đương
- KHÔNG đổi `walkthrough` / `misconceptions` / `tldr` (đã codify ở plan trước)

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | Schema extension (Zod + TS + docs) | 1h | pending |
| 2 | Renderer extension (TRY IT card + image grid + analysis callout) | 2h | pending |
| 3 | Static assets folder setup + Vite verify | 0.5h | pending |
| 4 | Lab authoring — Core 6 phase (user chạy VMware + screenshot) | 4h | pending |
| 5 | Lab authoring — Optional 3 phase (skippable) | 2h | pending |
| 6 | Mongo update script (idempotent + hash backup) | 1h | pending |
| 7 | Smoke test FE + screenshot load verify | 1h | pending |
| 8 | Docs + journal + changelog | 0.5h | pending |

## Dependencies

- Tools: Node, pnpm, MongoDB local, VMware Workstation Pro 25H2 (user)
- VM templates: Ubuntu Server 24.04 (3 VM: Server + 2 Client) — user trách nhiệm dựng
- Existing code touched:
  - `app/src/lib/schema-lab.ts` (Zod schema)
  - `app/src/components/lab/lab-renderer.tsx` (TRY IT section)
  - `docs/lab-schema-v3.md`
  - `server/scripts/` (new update script)
- Brainstorm v2: `plans/dattqh/reports/brainstorm-260524-1726-dhcp-tryathome-vmware-practical-v2.md`

## Success Criteria

- [ ] Zod schema accept extended `tryAtHome[]` shape; reject malformed
- [ ] 7 lab cũ render không đổi (manual smoke test 2-3 lab)
- [ ] DHCP lab render 6 core phase đầy đủ screenshot + analysis
- [ ] 3 optional phase collapsed, click expand OK
- [ ] FE `pnpm --dir app run typecheck` pass
- [ ] FE `pnpm --dir app run build` pass
- [ ] Mongo update script rerun không nhân đôi
- [ ] Journal entry + changelog cập nhật

## Risk register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| User không hoàn thành 6 phase lab trong session | Med | Chia phase commit riêng; Optional có thể skip |
| Screenshot lộ info nhạy cảm | Low | Pre-commit checklist crop/blur |
| Schema thay đổi break lab khác | Med | Field optional + Zod `.optional()`; smoke test 2-3 lab khác trước merge |
| VMware UI version drift sau này | Low | Caption ghi rõ "Workstation Pro 25H2" |
| Bundle size +3.4MB | Low | `public/` static, không vào JS bundle |

## Next Steps

1. Bắt đầu Phase 1 (schema) — không cần user input
2. Phase 4 cần user availability để chạy VMware lab — block phase này cho đến khi user sẵn sàng
