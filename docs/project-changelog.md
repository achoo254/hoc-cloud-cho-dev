# Project Changelog

Reverse-chronological. Format: `## YYYY-MM-DD — <summary>`.

---

## 2026-05-24 — DHCP lab codify (VMware 2-client conflict scenario)

- Bổ sung lab `dhcp` content thực hành: +4 `tryAtHome` (systemd-run tcpdump, dhcpcd ép DISCOVER, Case A ping-check, Case B arping), +2 `walkthrough` steps (step 8 = Conflict A ping-check, step 9 = Conflict B ARP flap, full snippet 30+ dòng/step), +4 `misconceptions` (CAP_NET_RAW silent fail, AF_PACKET bypass iptables, INIT-REBOOT lease cache, Linux netplan không DAD).
- Counts: `tryAtHome 5→9`, `walkthrough 7→9`, `misconceptions 5→9`.
- Sample pcap captures cho DhcpPlayground: `dhcp-case-a-capture.ts` (6 packets DISCOVER → ICMP probe → reply → OFFER khác IP → REQUEST → ACK) + `dhcp-case-b-capture.ts` (6 packets ARP flap 2 MAC cùng IP).
- Mongo update script (`server/scripts/update-lab-dhcp-vmware.js`, idempotent sentinel `walkthrough[].step === 8`).
- Source archive: `plans/dattqh/260524-1055-dhcp-lab-codify/source/{STEP-BY-STEP.md,REPORT.md,pcaps/case-{A,B}.pcap}` từ session lab thực tế trên VM 192.168.81.128.
- Schema v3, `lab-model.js`, `registry.ts` không thay đổi.

---

## 2026-05-09 — tcpdump lab enhancement (plan phase)

- Tạo plan 8 phase để bổ sung tcpdump teaching content cho lab `icmp-ping` và `http`.
- Thiết kế `PacketDecoder` shared component (3-panel UI: summary list / layer tree / hex view) + vanilla client-side PCAP parser (DataView/TextDecoder, giới hạn 5 MB / 200 packets).
- MongoDB content update script (`server/scripts/update-lab-tcpdump.js`, idempotent) bổ sung `tryAtHome`, `misconceptions`, `tldr`, `walkthrough`, `quiz`, `flashcards` về tcpdump.
- Thêm `useMediaQuery` / `useIsDesktop` hook (`app/src/lib/hooks/use-media-query.ts`).
- Schema v3 và `registry.ts` không thay đổi.
