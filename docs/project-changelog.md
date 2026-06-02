# Project Changelog

Reverse-chronological. Format: `## YYYY-MM-DD — <summary>`.

---

## 2026-06-02 (v2) — Mục "Bài Tập" (Exercises) owner-gated + chuyển 3 lab Linux sang

- Thêm tính năng **Bài Tập** riêng tư (owner-gated): collection `exercises` độc lập, mỗi bài = **Đề bài → Hướng dẫn thực hiện → Demo thực tế**. Tối giản (không quiz/flashcards/progress/Meili/SM-2).
- Backend: `server/db/models/exercise-model.js` (Mixed subdocs, no Meili hook), `server/auth/require-owner.js` (chặn theo `OWNER_EMAIL` allowlist; 401 anon / 403 non-owner / case-insensitive), `server/api/exercises-routes.js` (`GET /api/exercises` + `/:slug`, owner-gate per-route), mount trong `server.js`.
- Frontend: nav "Bài Tập" chỉ hiện owner (`auth-context.isOwner` vs `VITE_OWNER_EMAIL`); route `/exercises` (catalog) + `/exercise/:slug` (renderer riêng); `lib/api.ts` fetchers + types.
- **MOVE 3 lab Linux** (`syslog`, `linux-boot-process`, `linux-swap`) từ `labs` → `exercises` (map tryAtHome→guide, output thật→demo) rồi **xóa khỏi labs collection** (labs 11→8). Backup: `plans/dattqh/260602-2112-.../backup/lab-*-pre-move.json`. Script: `migrate-linux-labs-to-exercises.js`.
- Revert FE labs về trước (roadmap `02-linux`→placeholder, `LAB_ORDER` bỏ 3 slug) vì 02-linux không còn lab công khai.
- Env: `OWNER_EMAIL` (server, `.env*`) + `VITE_OWNER_EMAIL` (client, `app/.env*`) = `quocdat254@gmail.com`. **Deploy lưu ý**: phải set 2 env này ở VPS prod, nếu không owner cũng bị 403/ẩn nav.
- Verify: typecheck pass; anon `/api/exercises`→401; `requireOwner` unit test 401/403/200 + case-insensitive; gate KHÔNG rò sang `/api/labs`/`/api/progress` (200). code-reviewer: APPROVE_WITH_NITS (đã fix H1 double-middleware + M1 silent-error).
- **Demo = ảnh terminal THẬT**: chạy lệnh thật trên VM → render output thành ảnh kiểu terminal (`tools/render_terminal.py`, PIL + Consolas). 10 ảnh tại `app/public/exercises/<slug>/screenshots/` (syslog 4 gồm FAIL/FIX perm, boot 3, swap 3). `demo[].screenshot.src` dùng **full URL** (`https://hoc-cloud.inetdev.io.vn/...`) để copy markdown sang hệ khác vẫn xem được ảnh. Patch DB: `patch-exercise-demo-screenshots.js`.

---

## 2026-06-02 — Module `02-linux`: 3 lab mới (syslog · boot process · swap)

> **Superseded 2026-06-02 (v2)**: 3 lab này đã được **chuyển sang mục Bài Tập** (exercises, owner-gated) và xóa khỏi labs collection. Entry dưới ghi lại quá trình tạo gốc.


- Thêm module `02-linux` với 3 lab schema-v3, insert thẳng MongoDB (DB thật qua `.env.development`): `syslog` (45m), `linux-boot-process` (40m), `linux-swap` (35m). Tổng lab: 8 → 11.
- Mỗi lab đủ mandatory: `misconceptions 4`, `tldr 6`, `walkthrough 6`, `quiz 5`, `flashcards 8`, `tryAtHome 3–4 phase`. Lab `syslog` có FAIL/FIX thật trong walkthrough (lỗi rsyslog 2207 permission → chown).
- Practical `tryAtHome` xây từ output THẬT trên 2 VM Ubuntu 24.04 (`dattqh-nat` 192.168.122.171 = syslog server / boot chậm; `dattqh-client` 192.168.122.172 = syslog client / boot nhanh). Evidence: `plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/evidence/`.
  - syslog: rsyslog server `imtcp/imudp 514` + dynafile template; client `omfwd` TCP + queue; verify log nhận tại `/var/log/remote/<host>/<prog>.log`.
  - boot: `systemd-analyze blame/critical-chain` chỉ thủ phạm `systemd-networkd-wait-online` (timeout 120s, FAILED trên 171 → boot 2min vs 172 9s).
  - swap: `swapon/free/proc/fstab/vmstat`, demo tạo swapfile phụ (priority -3) + swappiness set/revert.
- Script: `server/scripts/seed-linux-labs.js` (upsert idempotent + contentHash + backup), content drafts `plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/content-drafts/*.js`.
- FE: `roadmap-section.tsx` mở `02-linux` (`placeholder: false`, duration `~2h`); `lab-catalog-grid.tsx` thêm 3 slug vào `LAB_ORDER`. `typecheck` pass.
- Thêm `server/scripts/sync-meili-index.js` (bulk re-sync Mongo → Meili) dùng khi content ghi thẳng Mongo không qua server process.
- **Pending**: Meilisearch index production chưa có 3 lab này — prod Meili chạy localhost trên VPS (không reachable từ máy dev). Cần chạy `node --env-file=.env server/scripts/sync-meili-index.js` trên VPS để search thấy. Catalog + roadmap + `/lab/:slug` đã hoạt động (không phụ thuộc Meili).

---

## 2026-05-24 (v2) — DHCP lab content extend (peer-inspired ARP Probe + APIPA)

- Bổ sung lab `dhcp` content peer-inspired từ STEP-BY-STEP-v2-hybrid: +1 walkthrough step 10 (ARP Probe vs Gratuitous ARP + DHCPDECLINE → APIPA fallback), +3 misconceptions (Probe vs Gratuitous distinction, networkd KHÔNG gửi DECLINE, APIPA RFC 3927 không phải lỗi).
- Counts cuối: `walkthrough 9→10`, `misconceptions 9→12` (try_at_home giữ 9).
- Script `server/scripts/update-lab-dhcp-vmware-v2.js` (idempotent sentinel `step === 10`).
- Archive cập nhật: `source/STEP-BY-STEP-v1-original.md` (23 KB session đầu) + `source/STEP-BY-STEP-v2-hybrid.md` (42 KB, peer-inspired topology + RFC 5227/3927 references).
- Sample captures + IP scheme (`.81.x`) giữ nguyên — match pcap thực tế đã capture; mismatch với v2 topology (`.100.x`) defer xử lý.

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
