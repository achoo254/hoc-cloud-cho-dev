---
title: "Retro — OSI THINK Depth Upgrade"
date: 2026-04-24
plan: plans/dattqh/260424-0922-osi-think-depth-upgrade/
---

# Retro — OSI THINK Depth Upgrade

## Scope Delivered

- **8 labs** covered: OSI + 7 remaining (DNS, TCP, HTTP, TLS, BGP, ICMP, SSH)
- **33 misconceptions** added (avg 4.1/lab; all ≥2)
- **39 tldr[].why** rewrites — 3-paragraph P1/P2/P3 structure, HTML links to RFC/vendor
- **18 walkthrough[].why** rewrites — same depth standard
- Infrastructure: `misconceptions[]` field added to Zod schema + Mongoose labSchema + API passthrough
- New component: `MisconceptionsSection` at `app/src/components/lab/misconceptions-section.tsx`, rendered above TL;DR on THINK tab via `lab-renderer.tsx`
- `tldr[].why` + `walkthrough[].why` upgraded to HTML-link support via `dangerouslySetInnerHTML`

## Phase Timeline

| Phase | Description | Outcome |
|-------|-------------|---------|
| P0 | Zod + Mongoose + API infra | Done, same session |
| P1 | MisconceptionsSection component | Done, same session |
| P2 | dangerouslySetInnerHTML upgrade for why fields | Done, same session |
| P3 | TL;DR overflow check / collapse-expand | **Skipped** — no overflow in visual QA |
| P4 | Content audit (8 labs gap analysis) | 1 agent run |
| P5 | Content drafting + apply (7 lab runs + 1 OSI) | 7 sequential apply runs |
| P6 | Docs sync + retro | This file |

## What Worked

- **Generic apply script + per-lab JSON patch** pattern: single `apply-misconceptions.js` script reused across 8 labs with separate `*-patch.json` data files. Zero schema drift between labs.
- **Mongoose post-save hook** auto-synced Meilisearch — no manual reindex step after content patches.
- **Content guidelines §2/§6 as enforcement lever**: having banned phrases pre-listed in `docs/content-guidelines.md` gave the content agent concrete rejection criteria, reducing back-and-forth on vague language.
- **Option C descope** (skip collapse/expand UI, use HTML dangerouslySetInnerHTML directly): saved ~2h vs original estimate; no visible UX regression since MisconceptionsSection handles long content natively.

## What Failed & Fix

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| Mongoose silently dropped `misconceptions` field in Phase 2 | Field not defined in `labSchema` (strict mode default) | Added `misconceptions` array field definition to `server/db/models/lab-model.js` schema |
| `MisconceptionsSection` initially only used `dangerouslySetInnerHTML` on `why`, not `wrong`/`right` | First pass treated `wrong`/`right` as plain text | Updated component to render `wrong`/`right` as plain text (correct) — `why` only needs HTML; `wrong`/`right` are short strings |
| Phase 5 apply script failed on 2 labs due to slug mismatch | Patch JSON used display title, not MongoDB slug field | Fixed by using `{ slug: "..." }` query filter instead of `{ title: "..." }` |

## Effort vs Estimate

| Phase | Estimate | Note |
|-------|---------|------|
| P0–P2 infra | 1h | On target |
| P3 overflow check | 0.5h | Skipped (0h) — net saving |
| P4 audit | 0.5h | 1 agent run, on target |
| P5 content | 4.75h (Option B) → descoped to Option C | Option C delivered 8 labs at estimated 3–4h; actual ~3.5h across 7 runs |
| P6 docs sync | 0.5h | On target |

## Follow-ups

1. ~~**Tighten Zod**: `misconceptions` currently `z.array(...).optional()`~~ — **DONE 2026-04-24**: changed to `.min(2)` required in `app/src/lib/schema-lab.ts`; typecheck pass.
2. **Metric collection**: quiz completion rate + time-on-THINK-tab per lab — needed to validate pedagogy impact of depth upgrade.
3. **Content guidelines enforcement**: add `why` depth standard to lab checklist (§7) — currently only in §12, not the per-lab review checklist.

## Resolved Post-Retro

- **Prod verification**: `.env.development` trỏ thẳng prod MongoDB → toàn bộ apply đã chạy thẳng prod. Confirmed by `scripts/verify-all-labs-think-depth.js` 2026-04-24: 8/8 labs pass, `misconceptions >= 2`, `tldr[0].why` has RFC cite, `misconceptions[0]` has RFC cite.
- **HTML links in wrong/right**: đã support từ Phase 2 fix (`misconceptions-section.tsx` dùng `dangerouslySetInnerHTML` trên cả 3 fields).

## Unresolved Questions

- None. All follow-ups tracked above.
