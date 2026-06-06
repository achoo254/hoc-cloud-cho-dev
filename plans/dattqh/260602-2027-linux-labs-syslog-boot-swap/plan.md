# Plan — 3 lab Linux: Syslog · Boot Process · Swap

**Ngày:** 2026-06-02 · **Module mới:** `02-linux` · **Branch:** master

## Mục tiêu

Thêm 3 lab schema-v3 vào MongoDB (DB thật qua `.env.development`), Meili auto-sync. Phần
practical `tryAtHome` xây từ output THẬT chạy trên 2 VM Ubuntu 24.04:
- `dattqh-nat@192.168.122.171` — syslog **server** / VM boot chậm (demo)
- `dattqh-client@192.168.122.172` — syslog **client** / VM boot nhanh (so sánh)

Evidence thật: `evidence/verified-outputs-from-vms.md` (đã verify end-to-end).

## 3 lab

| # | Slug | Title | est.min | tryAtHome |
|---|------|-------|---------|-----------|
| 1 | `syslog` | Syslog tập trung (rsyslog server ↔ client) | 45 | 4 phase (2 VM) |
| 2 | `linux-boot-process` | Quá trình khởi động Linux | 40 | 3 phase |
| 3 | `linux-swap` | Swap — khi nào dùng, cấu hình | 35 | 3 phase |

Mỗi lab đủ 9 mandatory: misconceptions(≥2) · tldr · walkthrough · quiz(≥4) · flashcards(≥5) ·
tryAtHome(≥2). Optional FAIL/FIX/AUTOMATE thêm khi có evidence thật (syslog có FAIL/FIX perm).

## Trạng thái phase

- [x] Phase A — Cấu hình + verify thật trên 2 VM, capture evidence — **DONE**
  - [x] rsyslog server 171 (imudp/imtcp 514 + dynafile template) → port 514 LISTEN
  - [x] rsyslog client 172 (omfwd TCP + queue) → TCP ESTAB, log nhận tại `/var/log/remote/`
  - [x] Bắt FAIL/FIX thật: perm denied → chown syslog:syslog
  - [x] Boot: systemd-analyze blame/critical-chain → thủ phạm `networkd-wait-online` (120s timeout, 171 FAILED)
  - [x] Swap: swapon/free/proc/fstab/vmstat trên cả 2
- [x] Phase B — Author 3 content module (`content-drafts/lab-*.js`, ES module + HTML) — **DONE** (dùng .js thay JSON để tránh escaping HTML)
- [x] Phase C — Seed `server/scripts/seed-linux-labs.js` → chạy `node --env-file=.env.development` → 3 lab vào DB thật (8→11) — **DONE**
- [x] Phase D — Verify + review — **DONE**
  - [x] Dry-run validate counts/shape (ALL_VALID)
  - [x] Integration: dev:server + curl `/api/labs` + 3 detail → 200, snake_case map đúng
  - [x] FE: typecheck pass; roadmap mở `02-linux`, catalog LAB_ORDER + 3 slug
  - [x] Self-review content-guidelines §7: 0 ngôi xưng cấm, 0 cụm cấm, citations đầy đủ
  - [ ] **Pending (cần VPS)**: sync prod Meilisearch — `node --env-file=.env server/scripts/sync-meili-index.js` trên VPS

## Quyết định (user xác nhận)

- DB target: DB thật mà `.env.development` trỏ (`103.72.98.65`) — KHÔNG phải local stale
- Syslog stack: **rsyslog 514 RFC 5424**, 171=server, 172=client (cả 2 đã cài sẵn)
- Phạm vi: build cả 3, review 1 lượt cuối

## Tham chiếu

- Schema: `docs/lab-schema-v3.md` · Guidelines: `docs/content-guidelines.md`
- Insert pattern mẫu: `server/scripts/update-lab-dhcp-tryathome-v3.js`
- API map Mongo→FE: `server/api/labs-routes.js` (camelCase → snake_case)
- Model: `server/db/models/lab-model.js` (Mixed subdocs, post-save Meili sync)

## Ghi chú

- KVM headless → tryAtHome dùng evidence text (`steps[].expect`), KHÔNG screenshot PNG (khác lab DHCP dùng VMware GUI).
- Không sửa boot config 171 (giữ nguyên evidence boot chậm); fix chỉ document.
- Không dùng Mongo transaction (single-node) — script upsert tuần tự.
