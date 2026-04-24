---
title: "Phase 1 — Renderer HTML Link Verification"
status: pending
priority: P1
effort: 0.5h
depends_on: []
---

# Phase 1 — Renderer HTML Link Verification

## Context Links

- Renderer: `app/src/components/lab/lab-renderer.tsx`
- Brainstorm decision §8: HTML inline `<a href>` format locked
- Content-guidelines §3: link format requirements

## Overview

**Priority:** P1 — Must resolve before any content is written to MongoDB.

Verify which content fields support HTML inline links (`<a href="...">`) via
`dangerouslySetInnerHTML`, and which render as plain text strings. Content
authors need an authoritative map before drafting per-field content.

## Audit Results (pre-computed from code read)

| Field | Render method | HTML links supported? |
|-------|---------------|----------------------|
| `tldr[].what` / `name` / `term` | `{item.what}` plain text | ❌ No |
| `tldr[].why` | `{item.why}` plain text | ❌ No |
| `tldr[].whyBreaks` | `{item.whyBreaks}` plain text | ❌ No |
| `tldr[].deploymentUse` | `{item.deploymentUse}` plain text | ❌ No |
| `walkthrough[].what` | `dangerouslySetInnerHTML` | ✅ Yes |
| `walkthrough[].why` | `dangerouslySetInnerHTML` | ✅ Yes |
| `walkthrough[].observeWith` | `dangerouslySetInnerHTML` | ✅ Yes |
| `tryAtHome[].why` | `dangerouslySetInnerHTML` | ✅ Yes |
| `tryAtHome[].observeWith` | `dangerouslySetInnerHTML` | ✅ Yes |
| `misconceptions[].why` (new) | `dangerouslySetInnerHTML` (Phase 0 plan) | ✅ Yes (after Phase 0) |
| `misconceptions[].wrong` / `.right` (new) | plain text (Phase 0 plan) | ❌ No |

**Root issue for `tldr.why`:** `TldrSection` (line 161–163 of `lab-renderer.tsx`)
renders `{item.why}` as a React text node, not HTML. HTML in this field will
display as escaped raw text (literal `<a href=...>`).

## Decision Required

**Option A — Add `dangerouslySetInnerHTML` to `tldr.why`** (recommended)
- Consistent with `walkthrough.why` pattern
- Allows RFC inline links in tldr content
- Risk: any existing tldr.why content with `<` chars would render as HTML —
  verify no existing content has unintended HTML tags before switching

**Option B — Plain text only for tldr fields, links in walkthrough + misconceptions only**
- Zero code change in Phase 1
- tldr.why content must be written without HTML links (use parenthetical
  references instead, e.g. `RFC 791 §3.1` without anchor)
- Simpler but reduces discoverability of sources in the TL;DR table

**Recommended: Option A.** Existing `tldr.why` content is plain Vietnamese text
with no `<` chars (verified from MongoDB sample). Safe to switch.

## Requirements

If Option A chosen:
- Update `TldrSection` in `lab-renderer.tsx`: change `{item.why}` render to
  `dangerouslySetInnerHTML={{ __html: item.why }}`
- Apply same to `item.whyBreaks` and `item.deploymentUse` for consistency
  (same risk profile — plain text in DB currently)
- Confirm no other tldr sub-components render these fields differently
  (check `layer-stack-encap.tsx` line 207: renders `{item.why}` plain text —
  must patch this too for OSI playground THINK tab)

## Related Files

**Modify (if Option A):**
- `app/src/components/lab/lab-renderer.tsx` — `TldrSection` lines 161–173
- `app/src/components/lab/diagrams/layer-stack-encap.tsx` — line 207 (`{item.why}`)

**Read to verify no other tldr renderers:**
- `app/src/components/lab/diagrams/` — grep for `item.why` across all playground files

## Implementation Steps

1. Search all playground files for `item.why` / `tldr` renders: confirm render method
2. Decision: **LOCKED — Option A** (user confirmed 2026-04-24): add `dangerouslySetInnerHTML` to `tldr.why`, `tldr.whyBreaks`, `tldr.deploymentUse`
3. Apply Option A:
   a. In `TldrSection` (`lab-renderer.tsx`): convert `{item.why}`, `{item.whyBreaks}`, `{item.deploymentUse}` to `dangerouslySetInnerHTML`
   b. In `layer-stack-encap.tsx`: convert `{item.why}` and `{item.whyBreaks}` to `dangerouslySetInnerHTML`
   c. Typecheck: `pnpm --dir app run typecheck`
4. Document final decision in this phase file (update Status field)

## Todo

- [ ] Grep all playground files for `item.why` tldr renders
- [x] Decision locked: Option A (2026-04-24)
- [ ] Patch `TldrSection` in `lab-renderer.tsx` (Option A)
- [ ] Patch `layer-stack-encap.tsx` (Option A)
- [ ] Run typecheck — 0 errors
- [ ] Record final field × HTML-support matrix in this file

## Success Criteria

- Definitive per-field HTML support matrix recorded (this file, updated)
- If Option A: `tldr.why` rendered via `dangerouslySetInnerHTML` in both
  `TldrSection` and `layer-stack-encap.tsx`
- No typecheck errors
- No visual regression on existing labs (tldr plain text content unchanged)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing tldr.why has stray `<` chars causing HTML parse issues | Low | Med | Run `grep '<' ` on all 8 labs' tldr.why before switching render method |
| `layer-stack-encap.tsx` missed (OSI playground uses it) | Med | Med | Explicitly listed in related files; grep confirms |
| Other playground tldr renders missed | Low | Low | Grep `item\.why` across all diagrams/ before declaring done |

## Security Considerations

Same as Phase 0: `dangerouslySetInnerHTML` for author-controlled content.
Acceptable per current project posture. No user-input path to these fields.

## Next Steps

- Phase 2 (blocked on Phase 0 + 1): OSI pilot content update
- Phase 1 output feeds content format decision for all subsequent phases
