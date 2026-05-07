---
type: implementation-plan
slug: tcpdump-lab-enhancement
date: 2026-05-07
status: pending
priority: medium
estimated_hours: 10
related_brainstorm: ../reports/brainstorm-260507-2215-tcpdump-lab-enhancement.md
related_labs: [icmp-ping, http]
blockedBy: []
blocks: []
---

# Plan — Bổ sung tcpdump cho lab `icmp-ping` & `http`

## Goal

Thêm full packet decoder + upload .pcap vào playground `icmp-ping` và `http`, đồng thời cập nhật content MongoDB (try_at_home, misconceptions, tldr, walkthrough, quiz, flashcards) để dạy `tcpdump`. KHÔNG tạo lab mới, KHÔNG đổi schema v3.

## Source

Brainstorm report: `../reports/brainstorm-260507-2215-tcpdump-lab-enhancement.md` — design + risks + success criteria đã chốt.

## Phases

| # | Phase | File | Est | Status |
|---|-------|------|-----|--------|
| 1 | PCAP parser (vanilla, client-side) | [phase-01-pcap-parser.md](phase-01-pcap-parser.md) | 1.5h | pending |
| 2 | Sample captures (icmp-ping + http) | [phase-02-sample-captures.md](phase-02-sample-captures.md) | 1h | pending |
| 3 | Packet decoder UI (3-panel desktop) | [phase-03-packet-decoder-ui.md](phase-03-packet-decoder-ui.md) | 3h | pending |
| 4 | Upload .pcap UI + integrate | [phase-04-upload-pcap.md](phase-04-upload-pcap.md) | 1.5h | pending |
| 5 | Mobile responsive | [phase-05-mobile-responsive.md](phase-05-mobile-responsive.md) | 1h | pending |
| 6 | Integrate vào 2 playground | [phase-06-integrate-playgrounds.md](phase-06-integrate-playgrounds.md) | 0.5h | pending |
| 7 | MongoDB content update script | [phase-07-mongo-content-update.md](phase-07-mongo-content-update.md) | 1h | pending |
| 8 | Smoke test + typecheck + build | [phase-08-smoke-test.md](phase-08-smoke-test.md) | 0.5h | pending |

**Total: ~10h**

## Order

Strict sequential 1 → 8. Phase 3 phụ thuộc Phase 1+2; Phase 4 phụ thuộc Phase 1+3; Phase 6 phụ thuộc Phase 3+4+5; Phase 8 cuối cùng.

## Success Criteria

- `pnpm --dir app run typecheck` xanh
- `pnpm --dir app run build` xanh
- 2 lab SEE section render PacketDecoder, sample capture click expand đúng
- Upload .pcap thật từ Linux render OK; invalid .pcap → toast lỗi không crash
- Mobile: stack vertical, không overflow ngang
- `try_at_home` MongoDB có 3 entries tcpdump/lab; Meilisearch search "tcpdump" trả 2 lab

## Out of Scope

PCAPNG, IPv6, TLS decryption, lab tcpdump độc lập, server-side capture generation, editor cho user-generated tcpdump labs.

## Risks

Xem section 7 brainstorm report.
