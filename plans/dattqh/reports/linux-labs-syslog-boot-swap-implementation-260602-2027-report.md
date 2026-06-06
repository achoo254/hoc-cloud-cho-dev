# Report — 3 lab Linux (syslog · boot · swap)

Ngày: 2026-06-02 · Plan: `plans/dattqh/260602-2027-linux-labs-syslog-boot-swap/`

## Kết quả

3 lab schema-v3 module `02-linux` insert vào MongoDB thật (8→11 lab). Practical verify thật trên 2 VM Ubuntu 24.04.

| Lab | est | misc/tldr/wt/quiz/fc/tah | Điểm thực hành |
|-----|-----|--------------------------|----------------|
| `syslog` | 45m | 4/6/6/5/8/4 | rsyslog server↔client, FAIL/FIX perm thật |
| `linux-boot-process` | 40m | 4/6/6/5/8/3 | so sánh boot 171 (2min) vs 172 (9s) |
| `linux-swap` | 35m | 4/6/6/5/8/3 | swapfile demo + swappiness |

## Đã verify (bằng chứng thật)

- VM config thật: rsyslog server 171 (`imtcp/imudp 514` + dynafile) → port 514 LISTEN; client 172 (`omfwd` TCP+queue) → TCP ESTAB; log nhận tại `/var/log/remote/dattqh-client/*.log`. Bắt FAIL/FIX thật: lỗi 2207 permission → `chown syslog:syslog`.
- boot: `systemd-analyze blame` → `2min 131ms systemd-networkd-wait-online` (FAILED, timeout 120s) trên 171; 172 1.14s OK.
- swap: swapfile phụ 512M → priority -3, `free` 2.0→2.5Gi; swappiness 60→10→60.
- DB: catalog `/api/labs` + 3 detail `/api/labs/:slug` → 200, map snake_case đúng.
- FE: `typecheck` pass; roadmap mở `02-linux`; catalog `LAB_ORDER` +3 slug.
- Content guidelines §7: 0 ngôi xưng cấm, 0 cụm cấm, citations RFC/man/kernel đầy đủ.

## File thay đổi

- Tạo: `server/scripts/seed-linux-labs.js`, `server/scripts/sync-meili-index.js`, `plans/.../content-drafts/lab-{syslog,linux-boot-process,linux-swap}.js`, evidence + script SSH.
- Sửa FE: `app/src/components/dashboard/roadmap-section.tsx` (02-linux placeholder→false, ~2h), `app/src/components/dashboard/lab-catalog-grid.tsx` (LAB_ORDER +3).
- Docs: `project-changelog.md`, `project-roadmap.md`.
- DB thật: 3 doc mới collection `labs`.

## Trạng thái VM (để nguyên cho người học)

- 171: rsyslog server nhận log (`/etc/rsyslog.d/10-remote-server.conf`, `/var/log/remote/`). Boot chậm giữ nguyên (evidence).
- 172: rsyslog client forward (`/etc/rsyslog.d/90-forward.conf`). Swap về baseline (demo đã dọn).

## Unresolved / Pending

1. **Meilisearch production chưa có 3 lab** — prod Meili chạy `localhost:7700` trên VPS (deployment-guide §44), không reachable từ máy dev; `.env.development` Meili = localhost (không chạy). Search `/api/search` chưa thấy 3 lab. **Fix**: chạy `node --env-file=.env server/scripts/sync-meili-index.js` TRÊN VPS. Catalog/roadmap/`/lab/:slug` KHÔNG phụ thuộc Meili → đã hoạt động.
2. Lab mới chưa có interactive diagram (playground) — schema cho phép optional; 3 lab này text-only (KVM headless, không screenshot GUI như lab DHCP). Có thể thêm playground sau nếu cần.
3. Code chưa commit/push — chờ user review diff.
