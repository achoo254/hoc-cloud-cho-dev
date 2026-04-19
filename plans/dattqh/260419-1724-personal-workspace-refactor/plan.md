---
title: Personal Workspace Refactor
slug: personal-workspace-refactor
date: 2026-04-19
status: completed
priority: P1
effort: 0.5d
branch: master
tags: [docs, ui, dashboard, refactor]
blockedBy: []
blocks: [260419-1737-schema-v3-think-see-ship]
phases:
  - phase-01-docs.md
  - phase-02-index-dashboard.md
  - phase-03-smoke-test.md
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-1724-personal-workspace-refactor.md
relatedPlans:
  - 260419-1329-index-page-redesign  # reverse một phần (hero/howto/features)
  - 260419-1413-content-guidelines-migration  # extend guidelines
---

# Plan — Personal Workspace Refactor

Lột marketing layer khỏi repo. Chuyển index từ "landing + dashboard" → "dashboard-first" phục vụ hành động hằng ngày: ôn flashcard due + resume lab dang dở.

## Goal

- README ≤80 dòng, zero pitch
- `docs/project-overview-pdr.md` xoá hẳn
- `docs/content-guidelines.md` thêm 4 rule (tone, schema v2, lang, md location)
- `labs/index.html` mở ra = thấy ngay "DUE TODAY" + "Resume lab" above the fold

## Out of Scope

- SM-2 algorithm, lab-template runtime, server API, DB schema
- Lab content (đã refactor xong qua plan `260419-1413-content-guidelines-migration`)
- Build/deploy pipeline

## Phases

| # | File | Goal | Effort |
|---|------|------|--------|
| 01 | phase-01-docs.md | README rewrite + xoá PDR + extend guidelines | 1h |
| 02 | phase-02-index-dashboard.md | Bỏ hero/howto/features, thêm DUE TODAY + Resume | 2h |
| 03 | phase-03-smoke-test.md | Manual smoke + content-guidelines self-check | 30m |

## Success Criteria

- `wc -l README.md` ≤ 80
- `ls docs/project-overview-pdr.md` → not found
- `grep -i "dành cho\|chúc học\|tại sao chọn" README.md docs/` → empty
- `labs/index.html` viewport đầu tiên (1080p) chứa due-today block
- Browser console không error sau khi load `/`

## Risk

- Low. Pure content + DOM rearrange.
- Rollback: `git revert`.

## References

- Brainstorm: `plans/dattqh/reports/brainstorm-260419-1724-personal-workspace-refactor.md`
- Guidelines: `docs/content-guidelines.md`
- Coordinator: `labs/_shared/index-sections.js`
