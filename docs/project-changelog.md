# Project Changelog

Reverse-chronological. Format: `## YYYY-MM-DD — <summary>`.

---

## 2026-06-11 — Lab VictoriaLogs observability + playground 3 mode

- **Thêm lab observability đầu tiên**: slug `victorialogs`, module `02-observability`, title "VictoriaLogs — Thu thập & truy vấn log tập trung" (45 phút). Tổng labs: 8 → 9.
- **VictoriaLogsPlayground** gồm 3 mode trong tab SEE: (1) Kiến trúc & Luồng dữ liệu (SVG animated, clickable explorer, toggle single/cluster), (2) LogsQL mini-evaluator (parser tập con chạy trên mock data), (3) Pipeline stepper (5 bước quá trình xử lý log từ ingest → stored → queried).
- **Playground components**: `victorialogs-playground.tsx` (root tab manager), `vlogs-architecture-flow.tsx` (animated SVG + clickable mode toggle), `vlogs-logsql-playground.tsx` (mini-evaluator + sample queries), `vlogs-logsql-parser.ts` (LogsQL subset parser), `vlogs-pipeline-stepper.tsx` (5-step visualization), `vlogs-mock-data.ts` (mock log fixtures).
- **MongoDB content**: seed qua `server/scripts/seed-victorialogs-lab.js` (idempotent) — lab ghi trực tiếp vào DB, Meili auto-sync. Lab có 3 misconceptions, 6 TL;DR, 6 walkthrough, 4 quiz, 7 flashcards, 4 tryAtHome.
- **Registry**: `VictoriaLogsPlayground` đã đăng ký trong `app/src/components/lab/diagrams/registry.ts`.
- Verify: typecheck pass; `/api/labs/victorialogs` trả lab content; playground render 3 mode trong SEE (live).

---

## 2026-06-03 — Mục "Bài Tập" chuyển PUBLIC + dọn dead code owner-gate

- **Public hoá**: gỡ owner-gate khỏi mục Bài Tập — ai cũng xem được (đồng nhất labs/search). BE bỏ `requireAuth`/`requireOwner` khỏi `/api/exercises` + `/:slug`; FE bỏ `isOwner` gate + forbidden states (`exercises.tsx`, `exercise-viewer.tsx`), nav "Bài Tập" luôn hiện (`site-header.tsx`).
- **Xoá hẳn dead code**: `server/auth/require-owner.js` (deleted); `isOwner` khỏi `auth-context.tsx`; env `OWNER_EMAIL`/`VITE_OWNER_EMAIL` khỏi `.env*` + `app/.env*` + `deploy.yml` (build & runtime); GitHub secret `OWNER_EMAIL` (removed).
- **Demo SSH mới** (syslog step 5): SSH login client 172 → server 171 nhận `sshd.log` (Accepted/Failed/Invalid user). Re-render toàn bộ ảnh terminal exercises + 3 panel DHCP cho sạch comment (không lộ AI); thêm `?v` cache-buster (Cloudflare immutable). Fix UTF-8 `render_terminal.py`.
- Verify: typecheck pass; anon `/api/exercises`→**200** (live).

## 2026-06-02 (v2) — Mục "Bài Tập" (Exercises) owner-gated + chuyển 3 lab Linux sang

- Thêm tính năng **Bài Tập** riêng tư (owner-gated): collection `exercises` độc lập, mỗi bài = **Đề bài → Hướng dẫn thực hiện → Demo thực tế**. Tối giản (không quiz/flashcards/progress/Meili/SM-2).
- Backend: `server/db/models/exercise-model.js` (Mixed subdocs, no Meili hook), `server/auth/require-owner.js` (chặn theo `OWNER_EMAIL` allowlist; 401 anon / 403 non-owner / case-insensitive), `server/api/exercises-routes.js` (`GET /api/exercises` + `/:slug`, owner-gate per-route), mount trong `server.js`.
- Frontend: nav "Bài Tập" chỉ hiện owner (`auth-context.isOwner` vs `VITE_OWNER_EMAIL`); route `/exercises` (catalog) + `/exercise/:slug` (renderer riêng); `lib/api.ts` fetchers + types.
- **MOVE 3 lab Linux** (`syslog`, `linux-boot-process`, `linux-swap`) từ `labs` → `exercises` (map tryAtHome→guide, output thật→demo) rồi **xóa khỏi labs collection** (labs 11→8). Backup: `plans/dattqh/260602-2112-.../backup/lab-*-pre-move.json`. Script: `migrate-linux-labs-to-exercises.js`.
- Revert FE labs về trước (roadmap `02-linux`→placeholder, `LAB_ORDER` bỏ 3 slug) vì 02-linux không còn lab công khai.
- Env: `OWNER_EMAIL` (server, `.env*`) + `VITE_OWNER_EMAIL` (client, `app/.env*`) = `quocdat254@gmail.com`. **Deploy lưu ý**: phải set 2 env này ở VPS prod, nếu không owner cũng bị 403/ẩn nav.
- Verify: typecheck pass; anon `/api/exercises`→401; `requireOwner` unit test 401/403/200 + case-insensitive; gate KHÔNG rò sang `/api/labs`/`/api/progress` (200). code-reviewer: APPROVE_WITH_NITS (đã fix H1 double-middleware + M1 silent-error).
- **Demo = ảnh chụp màn hình terminal THẬT**: mở cửa sổ `conhost` cổ điển chạy SSH (plink) live tới VM, chụp đúng cửa sổ bằng `PrintWindow` (P/Invoke, không full-screen → không lộ app khác). 10 ảnh tại `app/public/exercises/<slug>/screenshots/` (syslog 4 gồm FAIL/FIX perm, boot 3, swap 3). Tooling: `tools/capture.bat` + `tools/remote/*.sh` (transcript scripts; sudo password qua stdin, không hiện trên màn hình). `demo[].screenshot.src` dùng **full URL** (`https://hoc-cloud.inetdev.io.vn/...`) để copy markdown sang hệ khác vẫn xem được ảnh. Patch DB: `patch-exercise-demo-screenshots.js`. (`tools/render_terminal.py` — bản render PIL ban đầu, đã thay bằng ảnh chụp thật.)

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
