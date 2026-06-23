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

## 2026-06-02 (v2) — Exercises (public) + move 3 Linux labs

- **Exercises feature**: collection `exercises` độc lập, each exercise = brief + guide + demo screenshots. No quiz/flashcards/Meili. Public API.
- **3 Linux labs moved**: `syslog`, `linux-boot-process`, `linux-swap` (labs 8→5). Integrated as exercises with real terminal screenshots.
- **Env cleanup**: Removed `OWNER_EMAIL`, `VITE_OWNER_EMAIL`, `require-owner.js` middleware (2026-06-03).
- **Verify**: typecheck pass; `/api/exercises` public 200; full integration tests pass.

---

## Archive

### 2026-05-24 (v2) — DHCP lab extend (ARP Probe, APIPA, RFC 5227) — Superseded by 3 Linux labs becoming exercises (2026-06-02 v2)

### 2026-05-24 — DHCP lab codify (VMware conflict A/B) — Superseded by 3 Linux labs becoming exercises (2026-06-02 v2)

### 2026-05-09 — tcpdump lab enhancement (plan phase) — Superseded by 3 Linux labs becoming exercises (2026-06-02 v2)

