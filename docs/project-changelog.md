# Project Changelog

Reverse-chronological. Format: `## YYYY-MM-DD — <summary>`.

---

## 2026-05-09 — tcpdump lab enhancement (plan phase)

- Tạo plan 8 phase để bổ sung tcpdump teaching content cho lab `icmp-ping` và `http`.
- Thiết kế `PacketDecoder` shared component (3-panel UI: summary list / layer tree / hex view) + vanilla client-side PCAP parser (DataView/TextDecoder, giới hạn 5 MB / 200 packets).
- MongoDB content update script (`server/scripts/update-lab-tcpdump.js`, idempotent) bổ sung `tryAtHome`, `misconceptions`, `tldr`, `walkthrough`, `quiz`, `flashcards` về tcpdump.
- Thêm `useMediaQuery` / `useIsDesktop` hook (`app/src/lib/hooks/use-media-query.ts`).
- Schema v3 và `registry.ts` không thay đổi.
