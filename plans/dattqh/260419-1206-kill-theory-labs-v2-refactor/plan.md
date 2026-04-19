---
title: "Kill Theory CMS + Refactor Labs v2 (Deploy-Ready)"
description: "Xóa theory CMS, repurpose DB SQLite cho search+progress, refactor labs theo schema v2 (WHY + WHEN-IT-BREAKS + SEE-IT-ON-VPS + DEPLOY-READY), pilot với module 01-networking."
status: in-progress
priority: P0
effort: 7d
branch: master
progress:
  phase-01: done (theory CMS killed, server.js stripped, deps pruned)
  phase-02: done (migrations 002 + 003 applied, labs/labs_fts/progress tables live, 8 labs indexed)
  phase-03: done (schema v2 validator + 3 callouts + 4-toggle group)
  phase-04: done (DNS lab — 12 tldr + 7 walkthrough + 6 tryAtHome với v2 fields đủ; misconceptions/dependsOn/enables/estimatedMinutes=45)
  phase-05: deferred (7 remaining labs — content work ~5d, out of single-session scope)
  phase-06: done (/api/search FTS5 + global search-widget + `/` shortcut)
  phase-07: done (/api/progress + anon UUID cookie + progress-sync.js + dashboard badges)
  phase-08: done (README updated, structure + API docs + 4 chân kiềng)
tags: [cleanup, refactor, labs, schema-v2, sqlite, fts5, progress-sync]
created: 2026-04-19
blockedBy: []
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-1159-kill-theory-labs-v2-refactor.md
relatedPlans:
  - plans/dattqh/260419-1048-why-schema-v2          # schema v2 design, sẽ implement ở đây
  - plans/dattqh/260419-1034-theory-cms-lms         # DEPRECATED — code sẽ bị xóa ở phase 01
---

## Goal

Đơn giản hoá codebase về **1 vector thống nhất**: static labs tương tác cho dev deploy-ready. Xóa theory CMS. Repurpose DB SQLite cho 2 việc: (1) search labs full-text, (2) progress tracking multi-device. Refactor module 01-networking theo WHY Schema v2 làm pilot.

## Success Criteria

- [ ] `git grep -iE "theory|admin-guard|github-oauth" server/` = 0 match (ngoài comment lịch sử)
- [ ] `npm run dev` → `/healthz` OK, `/__livereload` OK
- [ ] DB có `labs`, `labs_fts`, `progress` — không còn `topics`/`sections`/`sections_fts`/`admin_sessions`
- [ ] Lab DNS refactored mở browser, console không có warning `[lab] missing ...`
- [ ] Search box global ở header mọi lab → `/api/search?q=dns` trả đúng lab DNS
- [ ] Progress sync: mở lab DNS trên device A → mark đọc → device B (cùng UUID cookie) thấy đã đọc
- [ ] Tất cả `/theory/*` → 404 (xóa hẳn, không redirect)
- [ ] README top-level không còn mục theory, có 4 chân kiềng

## Key Decisions

| Topic | Decision |
|---|---|
| Theory CMS | **KILL** — xóa hẳn, không archive |
| DB SQLite | **GIỮ** — repurpose cho labs_fts + progress |
| Schema v2 scope | **Module 01-networking only** (8 lab) làm pilot; 2-8 sau |
| Progress sync | **Anonymous UUID cookie**, không auth |
| Search UI | **Global header** ở mọi lab + dashboard |
| Legacy `/theory/*` | **Xóa hẳn**, 404 (không redirect) |
| `lab-data` schema | Thêm 3 trường bắt buộc: `whyBreaks`, `observeWith`, `deploymentUse` |

## Architecture — sau khi xong

```
server/
├── server.js                    # gọn hơn, chỉ static + search + progress API
├── db/
│   ├── sqlite-client.js         # giữ
│   ├── migrate.js               # giữ
│   └── migrations/
│       ├── 001-init.sql         # GIỮ (để reproduce DB cũ khi rollback)
│       └── 002-kill-theory.sql  # MỚI — DROP theory tables, ADD labs/labs_fts/progress
├── api/
│   ├── search-routes.js         # MỚI — /api/search?q= (FTS5)
│   └── progress-routes.js       # MỚI — GET/POST /api/progress
├── lib/
│   ├── csp-middleware.js        # giữ (bớt directive theory)
│   ├── sse-reload.js            # giữ
│   └── anon-uuid-cookie.js      # MỚI — set/read UUID cookie cho progress
└── scripts/
    └── sync-labs-to-db.js       # MỚI — đọc labs/**/*.html, extract lab-data JSON → bảng labs + FTS5

labs/
├── index.html                   # thêm search box global
├── _shared/
│   ├── lab-template.css         # thêm callout types (breaks/observe/deploy)
│   ├── lab-template.js          # thêm warn rules + render 3 callout + progress sync
│   └── search-widget.js         # MỚI — global search box component
└── 01-networking/*.html          # refactor theo schema v2
```

**XÓA hẳn:**
- `server/admin/` (routes + views)
- `server/auth/` (OAuth + session middleware + admin-guard)
- `server/content/` (markdown-renderer + callout-plugin + section-service)
- `server/public/theory-routes.js`
- `server/scripts/migrate-labs-to-md.js`, `verify-migration.js`
- `labs/_shared/theory-reader.js`
- Env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_WHITELIST`, etc

## Phases

| # | File | Effort | Depends on |
|---|------|--------|------------|
| 01 | `phase-01-cleanup-theory.md` | 0.5d | - |
| 02 | `phase-02-reshape-db-schema.md` | 0.5d | 01 |
| 03 | `phase-03-labs-template-v2.md` | 1d | 02 |
| 04 | `phase-04-refactor-dns-pilot.md` | 1d | 03 |
| 05 | `phase-05-refactor-remaining-networking.md` | 1.5d | 04 (review pilot xong mới làm) |
| 06 | `phase-06-search-ui-global.md` | 1d | 02 |
| 07 | `phase-07-progress-backend-multi-device.md` | 1d | 02 |
| 08 | `phase-08-docs-readme.md` | 0.5d | 01–07 |

**Tổng**: ~7 ngày. Phase 04 là **gate review** — dừng lại cho user xem UX trước khi quất tiếp 7 lab ở phase 05.

## Execution Order

```
01 cleanup
  └─ 02 DB schema
       ├─ 03 template v2
       │    └─ 04 DNS pilot (GATE)
       │         └─ 05 remaining 7 labs
       ├─ 06 search UI
       └─ 07 progress sync
            └─ 08 docs
```

Phase 03+06+07 có thể chạy parallel sau khi 02 xong, nhưng solo dev → khuyến nghị sequential để tránh rối.

## Risks

| Risk | Mitigation |
|------|------------|
| Xóa OAuth → mất session admin cũ đang đăng nhập | Accepted (chỉ có 1 admin = bạn) |
| Migration DB xoá theory data | `sqlite3 data.db .dump > backup-before-kill-theory.sql` trước khi migrate |
| Schema v2 strict → viết lab mới nặng hơn ~30% | Dev mode có flag `SKIP_WHY_WARN=1` để tắt warn tạm |
| Progress UUID collision | UUID v4 — probability ≈ 0, không cần xử lý |
| Search FTS5 sync chậm khi 50+ lab | `sync-labs-to-db.js` idempotent + diff-based, chỉ update lab thay đổi |

## Out-of-scope

- Module 02-08 refactor schema v2 (sẽ làm đợt riêng sau pilot thành công)
- `vpsExercise` cho module 02-08
- Test suite đầy đủ (chỉ smoke test FTS5 + progress endpoint)
- Multi-user role (1 user learner, không cần)
- Migrate DB sang Postgres/cloud (SQLite đủ forever cho use case)

## Open Questions

1. Cookie UUID — set `HttpOnly` (an toàn) hay accessible từ JS (thuận tiện đọc client)? → Đề xuất `HttpOnly; SameSite=Lax` + server trả lại UUID ở `/api/progress` cho client biết mình là ai (debug).
2. Progress granularity — track ở mức `lab.done` hay `lab.section.done` (mỗi phần TL;DR/walkthrough/quiz)? → Đề xuất mức lab + quiz score riêng, để KISS.
3. Search FTS5 index — include `whyBreaks`/`observeWith`/`deploymentUse` không (field mới)? → Đề xuất include hết để user search "502 bad gateway" cũng tìm được lab Nginx/Docker.
