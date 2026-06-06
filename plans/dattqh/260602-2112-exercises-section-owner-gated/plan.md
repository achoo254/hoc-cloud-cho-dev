---
title: Muc Bai Tap (Exercises) owner-gated
description: >-
  Mục Bài Tập riêng tư (owner-gated): collection exercises độc lập, mỗi bài gồm
  Đề bài → Hướng dẫn → Demo thật
status: completed
priority: P2
branch: master
tags:
  - feature
  - backend
  - frontend
  - auth
blockedBy: []
blocks: []
created: '2026-06-02T14:23:38.403Z'
createdBy: 'ck:plan'
source: skill
---

# Muc Bai Tap (Exercises) owner-gated

## Overview

Thêm mục **"Bài Tập"** riêng tư cho owner — nơi tạo các bài tập (yêu cầu giảng viên giao) độc lập, KHÔNG sửa trong labs. Mỗi bài tập = **Đề bài → Hướng dẫn thực hiện → Demo thực tế** (output thật). Collection `exercises` riêng, owner-gated ở cả API (`require-owner`) lẫn FE (ẩn nav). Tối giản: không quiz/progress/Meili/SM-2.

Design gốc: `plans/dattqh/reports/brainstorm-260602-2112-exercises-section-owner-gated-report.md`

## Quyết định đã chốt (từ brainstorm)

- Storage: collection `exercises` riêng (mirror `lab-model`, KHÔNG Meili post-save hook).
- Owner-gated: API chặn theo `OWNER_EMAIL` (env, default `dattqh@inet.vn`); FE ẩn nav theo `VITE_OWNER_EMAIL`.
- Schema camelCase: `{slug, title, topic, tags[], source, brief, estimatedMinutes, guide[{step,instruction,command?,note?}], demo[{step,what,command?,output,note?,screenshot?}], references[{label,url}]}`.
- Topic = free-text + tags (không enum). Quan hệ lab: độc lập (không labSlug).
- OUT: quiz/flashcards/misconceptions, progress/heatmap/leaderboard, SM-2, Meili search, multi-user.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Backend model](./phase-01-backend-model.md) | Completed |
| 2 | [API va owner auth](./phase-02-api-va-owner-auth.md) | Completed |
| 3 | [Frontend UI](./phase-03-frontend-ui.md) | Completed |
| 4 | [Seed va sample](./phase-04-seed-va-sample.md) | Completed |
| 5 | [Config va verify](./phase-05-config-va-verify.md) | Completed |

## Phase dependency

```
1 (model) → 2 (API+auth) → 3 (FE)
                   ↘ 4 (seed+sample, cần model+API để verify)
1+2+3+4 → 5 (config env + verify end-to-end)
```

## Dependencies

- Không cross-plan dependency. Feature độc lập với labs (collection riêng); không đụng 11 lab hiện có.
- Tái dùng pattern (đọc tham khảo, KHÔNG sửa): `lab-model.js`, `labs-routes.js`, `lab-catalog-grid.tsx`, `lab-viewer.tsx`, `require-auth.js`, `session-middleware.js`.

## Scope update (cook 260602-2134)

- **OWNER_EMAIL = `quocdat254@gmail.com`** (user xác nhận — email Google login prod).
- **Phase 4 đổi: MIGRATE thay vì sample.** Chuyển 3 lab Linux (`syslog`, `linux-boot-process`, `linux-swap`) hiện có → 3 exercises (brief + guide từ tryAtHome + demo từ output thật), rồi XÓA 3 lab khỏi labs collection + revert FE (roadmap 02-linux→placeholder, bỏ 3 slug khỏi LAB_ORDER) + cập nhật docs. Backup lab JSON trước khi xóa (content cũng còn trong content-drafts 260602-2027).
