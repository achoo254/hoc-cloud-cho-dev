---
phase: 5
title: Config va verify
status: completed
priority: P1
effort: 1.5h
dependencies:
  - 2
  - 3
  - 4
---

# Phase 5: Config va verify

## Overview
Wiring env owner (`OWNER_EMAIL` + `VITE_OWNER_EMAIL`), cập nhật docs, và verify end-to-end 3 case bảo mật (401/403/200) + typecheck.

## Requirements
- Functional: env owner set đúng dev + (hướng dẫn) prod. Verify owner thấy/non-owner bị chặn.
- Non-functional: không lộ data cho non-owner ở bất kỳ tầng nào.

## Architecture
- Server đọc `OWNER_EMAIL` (Hono, runtime env). Client đọc `VITE_OWNER_EMAIL` (Vite build-time).
- Dev: `.env.development` (server) + `app/.env` hoặc `app/.env.development` (client VITE_*). Prod: thêm vào pipeline/VPS (deployment-guide).

## Related Code Files
- Modify: `.env.example`, `.env.development`, `app/.env.example` (+ `app/.env` local), `docs/deployment-guide.md` (env table), `docs/project-changelog.md`, `docs/project-roadmap.md`
- Read for context: `app/.env` (cấu trúc VITE_*), `docs/deployment-guide.md` (env section)

## Implementation Steps
1. Thêm `OWNER_EMAIL=dattqh@inet.vn` vào `.env.example` + `.env.development` (+ `.env` prod nếu có quyền). Comment: comma-separated allowlist.
2. Thêm `VITE_OWNER_EMAIL=dattqh@inet.vn` vào `app/.env.example` + `app/.env` (local dev). Lưu ý build prod cần biến này.
3. `docs/deployment-guide.md`: thêm 2 env vào bảng (required cho mục Bài Tập; quên → owner bị 403/ẩn nav).
4. Verify end-to-end:
   - `node --env-file=.env.development server/server.js` (boot ok).
   - anon: `curl -s -o /dev/null -w "%{http_code}" /api/exercises` → `401`.
   - owner: đăng nhập FE (Google = dattqh@inet.vn) → nav "Bài Tập" hiện → `/exercises` list sample → `/exercise/:slug` render brief+guide+demo. (hoặc curl với cookie sid hợp lệ → 200.)
   - non-owner: (nếu có account khác) → 403 + nav ẩn.
   - `pnpm --dir app run typecheck` pass.
5. Docs: changelog + roadmap entry (module/feature "Bài Tập" owner-gated).

## Success Criteria
- [ ] 3 case bảo mật đúng: anon 401, non-owner 403, owner 200.
- [ ] Owner thấy nav + render được sample exercise; non-owner không thấy nav.
- [ ] typecheck pass; 11 lab + dashboard hiện có không đổi hành vi.
- [ ] Env documented; changelog/roadmap updated.

## Risk Assessment
- Quên set env prod khi deploy → owner bị chặn trên prod. Deployment-guide phải ghi rõ.
- Verify "owner 200" qua curl cần cookie sid thật — nếu khó, verify qua FE đã đăng nhập (đủ tin cậy).
- Sample exercise nằm DB prod (chỉ owner thấy) — quyết định giữ/xoá (open item plan).
