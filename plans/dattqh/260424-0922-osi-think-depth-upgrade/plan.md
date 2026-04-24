---
title: "THINK Section Depth Upgrade — All 8 Labs"
description: "Add misconceptions infrastructure + rewrite tldr/walkthrough why fields with RFC-cited, fact-first content across 8 networking labs"
status: pending
priority: P1
effort: 12h
branch: master
tags: [content, labs, mongodb, frontend, schema]
created: 2026-04-24
---

# THINK Depth Upgrade — 8 Labs

## Critical Finding (Pre-plan Audit)

`misconceptions` field does NOT exist anywhere in the current stack:
- Not in MongoDB documents (all 8 labs: `FIELD_MISSING`)
- Not in `toLabContent()` API mapping (`server/api/labs-routes.js`)
- Not in Zod schema (`app/src/lib/schema-lab.ts`)
- Not rendered in any component (`lab-renderer.tsx` or playgrounds)

**Phase 0 (infrastructure) is mandatory before any content work.**

## Phases

| # | Phase | Status | Effort | Blocker |
|---|-------|--------|--------|---------|
| 0 | [Infrastructure — misconceptions full stack](./phase-00-misconceptions-infrastructure.md) | pending | 2h | None |
| 1 | [Renderer HTML link verification](./phase-01-renderer-html-link-verify.md) | pending | 0.5h | None |
| 2 | [OSI pilot content update](./phase-02-osi-pilot-content-update.md) | pending | 1.5h | Phase 0, 1 |
| 3 | [TL;DR UI overflow check (conditional)](./phase-03-tldr-ui-overflow-conditional.md) | pending | 1h | Phase 2 |
| 4 | [Audit 7 remaining labs](./phase-04-audit-7-labs.md) | pending | 2h | Phase 0 |
| 5 | [Bulk content upgrade 7 labs](./phase-05-bulk-content-upgrade.md) | pending | 4h | Phase 3, 4 |
| 6 | [Docs sync + retro](./phase-06-docs-sync-retro.md) | pending | 0.5h | Phase 5 |

## Dependency Graph

```
Phase 0 ─┬─→ Phase 1 ─→ Phase 2 ─→ Phase 3 ─→ Phase 5 ─→ Phase 6
          └─→ Phase 4 ─────────────────────────────↑
```

## Key Constraints

- `content-guidelines.md` §2: no vague scope phrases
- `content-guidelines.md` §3: every protocol claim → RFC/ISO anchor cite
- `lab-schema-v3.md` §7: misconceptions ≥2 mandatory
- HTML inline `<a href>` format for links (confirmed by existing `<code>`, `<strong>` in content)
- `tldr[].why` renders as plain text (no `dangerouslySetInnerHTML`) → **HTML links NOT supported in tldr.why currently**
- `walkthrough[].why` renders via `dangerouslySetInnerHTML` → HTML links supported

## Resolved Decisions (2026-04-24, user confirmed)

| # | Question | Decision |
|---|---|---|
| 1 | tldr.why render path | **Add `dangerouslySetInnerHTML` to `TldrSection`** — consistent với walkthrough.why; sanitize upstream via Zod validation + trusted author content |
| 2 | contentHash update strategy | **Script set `new Date().toISOString()` on update** — simple cache-bust; FE không verify content hash, Meilisearch re-sync OK |
| 3 | misconceptions in Zod | **Optional first → required (≥2) after Phase 5** — không break 7 labs đang trống; tighten validation sau khi Phase 5 backfill xong |

## Unresolved (long-term, ngoài scope plan)

1. `contentHash` duplicate edge case nếu Mongo pre-save hook so sánh (hiện tại không có) — verify trong Phase 0 inspection
2. Metric đo "độ sâu hiểu" (quiz completion, thời gian đọc) — retro Phase 6 flag cho iteration sau
