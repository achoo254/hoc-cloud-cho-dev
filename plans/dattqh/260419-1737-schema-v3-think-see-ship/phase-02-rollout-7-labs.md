# Phase 02 — Rollout 7 Networking Labs

**Status:** completed | **Effort:** 7h | **Actual:** 5.5h | **Priority:** P1 | **Depends:** Phase 01

## Goal

Migrate 7 labs còn lại sang schema v3. Thêm content cho misconceptions (mandatory) + failModes/fixSteps/automateScript (optional, viết khi tự nhiên).

## Files

```
labs/01-networking/01-tcp-ip-packet-journey.html
labs/01-networking/02-subnet-cidr.html
labs/01-networking/03-tcp-udp.html
labs/01-networking/05-arp.html
labs/01-networking/06-dhcp.html
labs/01-networking/07-http.html
labs/01-networking/08-dns.html
```

## Per-lab checklist

Mỗi lab:

- [x] Thêm `misconceptions` (≥2 myth) ở top-level
- [x] Review từng walkthrough row: thêm `failModes`/`fixSteps`/`automateScript` nếu **tự nhiên có**
- [x] Skip optional nếu gượng ép (vd ARP — không cần AUTOMATE thì để trống)
- [ ] Test render: mở browser, không error console *(pending manual verification)*

## Suggested per-lab focus

| Lab | Misconception gợi ý | FAIL/FIX gợi ý | AUTOMATE gợi ý |
|-----|---------------------|----------------|-----------------|
| 01 TCP/IP | "OSI 7 layer = thực tế" → TCP/IP 4 layer mới là dùng | Wireshark capture sai interface | tcpdump rotate script |
| 02 Subnet | "/24 = 256 host" → 254 usable | IP conflict log dmesg | Subnet calc Python |
| 03 TCP/UDP | "UDP = nhanh hơn TCP luôn" → tuỳ workload | TIME_WAIT exhaust → port full | netstat watch script |
| 05 ARP | "ARP chỉ chạy LAN" → đúng nhưng ảnh hưởng VPN/bridge | ARP storm log | arp-scan cron |
| 06 DHCP | "DHCP cần thiết mọi LAN" → static IP cho server | DHCP starvation log | DHCP lease dump |
| 07 HTTP | "HTTPS = secure 100%" → cần kiểm cert chain | 502 Bad Gateway → upstream | curl health probe |
| 08 DNS | "DNS = chỉ A record" → MX/TXT/CNAME etc | NXDOMAIN log | dig batch script |

(Bảng là gợi ý. Lab nào không tự nhiên → skip optional, chỉ thêm misconceptions mandatory.)

## Workflow batch

Chia 2 batch để dễ review:

**Batch 1** (3 labs, 3h): 01, 02, 03
**Batch 2** (4 labs, 4h): 05, 06, 07, 08

Sau mỗi batch: smoke test browser, commit riêng.

## Acceptance

- [x] 7 labs có `misconceptions` ≥2 myth
- [x] Optional sections viết khi tự nhiên, KHÔNG forced
- [ ] `npm run dev` mở từng lab → không console error *(pending manual verification)*
- [ ] Callout render đúng style v3 *(pending manual verification)*
- [x] Git diff: chỉ chạm 7 file `.html`, không chạm runtime/CSS
