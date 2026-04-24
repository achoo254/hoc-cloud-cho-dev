---
title: "Phase 6 — Docs Sync + Retro"
status: pending
priority: P3
effort: 0.5h
depends_on: [phase-05]
---

# Phase 6 — Docs Sync + Retro

## Context Links

- Content guidelines: `docs/content-guidelines.md`
- Codebase summary: `docs/codebase-summary.md`
- System architecture: `docs/system-architecture.md`

## Overview

**Priority:** P3 — Final housekeeping. Codifies the depth pattern as enforceable
spec so future lab authors don't need to re-derive it.

Two outputs:
1. Update `docs/content-guidelines.md` — add §12 or extend §8 with the
   contract/mechanics/implication structure as an explicit rule
2. Update `docs/codebase-summary.md` — reflect new `misconceptions` field in
   stack if Phase 0 added infrastructure; reflect any component added in Phase 3

## Requirements

### content-guidelines.md additions

**New rule — depth pattern for `why` fields** (add under §8 or as new §12):

```
### `why` field depth standard

Every `why` field in `tldr[]`, `walkthrough[]`, and `misconceptions[]` must
follow the 3-paragraph structure:

P1 Contract — what does this component/layer receive, produce, and reference?
  Cite the authoritative spec (RFC/ISO anchor) for the behavior described.
P2 Mechanics — concrete header fields, state machine states, protocol values,
  or OS/kernel behavior. Specific numbers, field names, RFC sections.
P3 Implication — what does understanding this change about how a dev
  debugs, deploys, or reads vendor docs? Name the specific tool, command,
  or vendor concept affected.

Minimum length: ~200 chars. Maximum: no hard limit (collapse/expand handles UI).
```

**Extend §2 banned phrases** — add explicit examples found during this project:
- "nhiều người nhầm" → replace with the specific misconception stated as fact
- "thường gặp" → replace with specific RFC or OS behavior citation
- "thực tế" (standalone, without specific citation) → replace with named system

**Extend §3 cite format** — clarify HTML vs markdown:
- In MongoDB content fields rendered via `dangerouslySetInnerHTML`
  (`walkthrough[].why`, `misconceptions[].why`, `tldr[].why` after Phase 1):
  use HTML inline `<a href="https://datatracker.ietf.org/...">RFC XXXX §N</a>`
- In `.md` plan/doc files: use markdown `[RFC XXXX §N](url)`
- Never mix formats within the same field

### codebase-summary.md additions

Update the data flow / frontend section to reflect:
- `misconceptions[]` field now stored in MongoDB and mapped through API
- `MisconceptionsSection` component in `lab-renderer.tsx` (or extracted file)
- If Phase 3 added collapse/expand to `TldrSection`: note that `tldr[].why`
  supports long-form content with progressive disclosure

Only update sections that changed — do not rewrite unchanged sections.

### system-architecture.md

No changes unless Phase 3 introduced a new component file (then add to
Frontend Structure section). Check before deciding.

## Related Files

**Modify:**
- `docs/content-guidelines.md` — extend §2, §3, §8 (or add §12)
- `docs/codebase-summary.md` — update frontend structure + data flow sections

**Read first (to locate correct insertion points):**
- `docs/content-guidelines.md` current §8 end
- `docs/codebase-summary.md` current frontend structure section

**Conditionally modify:**
- `docs/system-architecture.md` — only if new component file created in Phase 3

## Implementation Steps

1. Read `docs/content-guidelines.md` §8 — identify correct insertion point for
   depth pattern rule (add as sub-section under §8 or new §12 after §11).

2. Add 3-paragraph depth standard rule. Add 3 banned phrase extensions to §2
   table. Add HTML vs markdown cite format clarification to §3.

3. Read `docs/codebase-summary.md` — locate frontend components section and
   data flow section.

4. Add `misconceptions` to data flow description. Add `MisconceptionsSection`
   to component list. Note Phase 3 outcome (collapse/expand or no change).

5. Check `docs/system-architecture.md` — if Phase 3 created new file, add entry.

6. Verify no broken cross-references between updated docs and existing content.

## Todo

- [ ] Read `docs/content-guidelines.md` to find insertion point
- [ ] Add 3-paragraph depth standard to §8 (or §12)
- [ ] Add 3 banned phrase extensions to §2
- [ ] Add HTML vs markdown cite format note to §3
- [ ] Read `docs/codebase-summary.md` to find affected sections
- [ ] Update data flow: add `misconceptions` field
- [ ] Update frontend components: add `MisconceptionsSection`
- [ ] Note Phase 3 TL;DR outcome in codebase-summary
- [ ] Check `system-architecture.md` — update if Phase 3 created new file
- [ ] Verify no broken cross-references

## Success Criteria

- `docs/content-guidelines.md` contains explicit 3-paragraph depth rule
- §2 banned phrases table includes "nhiều người nhầm", "thường gặp" (standalone)
- §3 includes HTML vs markdown format distinction for MongoDB content fields
- `docs/codebase-summary.md` reflects `misconceptions` field + `MisconceptionsSection`
- No broken internal links in updated docs

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Inserted rule conflicts with existing §8 content | Low | Low | Read §8 fully before inserting; match existing heading style |
| `codebase-summary.md` has stale info unrelated to this project | Low | Low | Update only the sections touched by this project; note "last updated" date |
| Doc update scope creep (rewriting unrelated sections) | Low | Med | Rule: only modify lines/sections that directly reflect Phase 0–5 changes |

## Security Considerations

None — documentation update only.

## Next Steps

- Project complete. All 8 labs have ≥2 misconceptions, RFC-cited `why` fields,
  and depth pattern content.
- Future: tighten `misconceptions` in Zod from `optional()` to `required()`
  once all 8 labs confirmed backfilled (post-Phase 5 verification).
- Future: metric collection — quiz completion rate, time-on-THINK-tab — to
  validate pedagogy impact of depth upgrade.
