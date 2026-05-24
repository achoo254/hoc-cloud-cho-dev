# DHCP VMware Lab Codify — 2-Client Conflict Scenario

**Date**: 2026-05-24
**Severity**: Low (content addition, no infra change)
**Component**: lab `dhcp` content + `DhcpPlayground`
**Status**: Resolved

---

## What Happened

User request: codify nội dung lab DHCP thực tế (3 VM Ubuntu 24.04 trên VMware Workstation, isc-dhcp-server, 2 client test conflict) vào app lab content.

Source materials:
- `STEP-BY-STEP.md` (23 KB) + `REPORT.md` (6.9 KB) từ Agent đồng nghiệp đã chạy session lab trước đó trên VM `192.168.81.128:~/dhcp-lab/`
- 16 helper scripts (`40-case-A.sh`, `41-case-B.sh`, `case-A-c2-manual.sh`, `lib.sh`, etc.) sẵn sàng tái sử dụng cho re-capture

6 phases:
1. Archive STEP-BY-STEP.md + REPORT.md vào `plans/dattqh/260524-1055-dhcp-lab-codify/source/`
2. Re-capture 2 pcap trong session sạch — case-A.pcap (96 packets, 8.2 KB) + case-B.pcap (18 packets, 1.3 KB)
3. Viết 3 JSON drafts (+4 tryAtHome, +2 walkthrough, +4 misconceptions)
4. Mongo update script idempotent — counts 5/7/5 → 9/9/9
5. Hand-craft 2 sample captures (`dhcp-case-a-capture.ts`, `dhcp-case-b-capture.ts`) + integrate `PacketDecoder` vào `DhcpPlayground` (2 sections SEE)
6. Update changelog + roadmap + smoke test API endpoint

## Key Findings

### Tình huống lab gặp khi capture
- Khi user bật cả 2 VM client, **cả Client1 (DHCP) và Client2 (static .201) cùng claim `.201`** — đây tự nhiên là Case B condition. Capture ARP flap ngay bằng tcpdump + arping loop.
- Cho Case A, cần Client2 static `.200` + Client1 fresh DISCOVER. Hai client cùng IP `.201` → SSH random hit không ổn định. Giải pháp: user power off Client1 tạm thời → SSH .201 chỉ còn Client2 → switch static `.200` → bật Client1 lại → Client1 DHCP DISCOVER → server ping-check `.200` → Client2 reply → abandon → OFFER `.201`. Quan sát đúng như lý thuyết.
- DHCP server log dòng `ICMP Echo reply while lease 192.168.81.200 valid` + `Abandoning IP address 192.168.81.200: pinged before offer` là evidence quyết định cho Case A.

### Pattern integration với existing playground
- `PacketDecoder` shared (đã ship Phase 6 tcpdump enhancement 2026-05-09) dùng `defaultPackets: DecodedPacket[]` pre-decoded TS modules — KHÔNG fetch .pcap file
- pcap-parser.ts hỗ trợ Ethernet + IPv4 + ICMP + TCP — KHÔNG có ARP/UDP/DHCP decoder
- Quyết định: hand-craft 2 sample captures kiểu `icmp-ping-capture.ts` — byte builders + DecodedLayer arrays. Mỗi file ~270 dòng.
- Pcap thật (`case-A.pcap`, `case-B.pcap`) lưu trong `source/pcaps/` làm archive — upload thật vào playground vẫn work qua `PcapUploadZone` (chỉ Ethernet/IPv4/ICMP decode được, ARP/DHCP fall back raw hex).

### So sánh với peer PR INET-Support/cloud-labs#3
- Peer (MinhVuDinh23) dùng dnsmasq + 1 client + Server tự claim Gratuitous ARP → KHÔNG đáp ứng yêu cầu nguyên văn "+1 node client set IP manual"
- User's lab có 2 client thực + test cả 2 thứ tự (manual TRƯỚC vs SAU) → đáp ứng yêu cầu chính xác hơn
- Peer mạnh hơn ở DHCP field-by-field analysis (op/htype/hlen/flags/options 53/54/61/55/50/51/58/59) — defer cho session sau

## The Brutal Truth

7 bẫy real-world (CAP_NET_RAW silent fail, AF_PACKET bypass iptables, INIT-REBOOT lease cache, networkd-dispatcher re-apply filter, sudo+heredoc, pool teo dần, ping-check timing) là giá trị cốt lõi của user's lab — hầu hết lab tutorial chỉ show happy path. 4 misconceptions mới chính là codify lại 4 trong số 7 bẫy này.

Field-name mismatch `tryAtHome` (Mongo camelCase) vs `try_at_home` (Zod snake_case) tồn tại từ commit cũ. API endpoint `/api/labs/:slug` convert đúng qua `toLabContent()` ở `server/api/labs-routes.js` — verify trong smoke test Phase 6 (API trả `try_at_home: 9` đúng). Tech debt này defer fix.

`ping-check` chỉ work khi dhcpd có CAP_NET_RAW (chạy as root). Trong systemd unit mặc định Ubuntu 24.04, dhcpd chạy as user `dhcpd` (UID 113) → mất CAP_NET_RAW → silent fail. Đây là điểm gian xảo nhất; nếu không phát hiện, sẽ thấy Case A "work tùy lúc" mà không hiểu vì sao. Walkthrough step 8 + misconception #1 dạy đúng điểm này.

## Refs

- Plan: `plans/dattqh/260524-1055-dhcp-lab-codify/`
- Brainstorm: `plans/dattqh/reports/brainstorm-260524-1055-dhcp-lab-codify.md`
- Peer comparison: `plans/dattqh/reports/comparison-260524-1055-dhcp-lab-vs-peer-pr3.md`
- Source: `source/STEP-BY-STEP.md`, `source/REPORT.md`, `source/pcaps/case-{A,B}.pcap`
- Mongo update: `server/scripts/update-lab-dhcp-vmware-content.js` + `update-lab-dhcp-vmware.js`
- Sample captures: `app/src/components/lab/diagrams/shared/sample-captures/dhcp-case-{a,b}-capture.ts`
