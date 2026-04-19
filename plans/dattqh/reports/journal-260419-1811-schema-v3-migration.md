# Schema v3 Migration — THINK·SEE·SHIP Cutover Complete

**Date**: 2026-04-19 18:11
**Severity**: High (scope expansion during execution)
**Component**: Lab system (8 networking labs, schema v2 → v3)
**Status**: Resolved

---

## What Happened

Migrated 8 networking labs from schema v2 (4-pillar: WHY/BREAKS/OBSERVE/DEPLOY) to v3 (12 sections, 4 groups: THINK·SEE·SHIP·OUTPUT). Hard cutover—no cohabit period. Phased execution: Phase 01 (tooling + spec, 4.5h), Phase 02 (parallel subagent batch work, 5.5h), Phase 03 (docs sync, 1h). All 8 labs pass schema validator. Deployed without mobile viewport smoke or browser console validation (deferred).

---

## The Brutal Truth

We shipped with **significant planning-to-codebase mismatches** discovered during scout phase, forcing real-time tactical adjustments. The pain: spending 2 hours debugging validator failures because the plan's JSON shape didn't match 8 existing labs' actual field shapes. Frustrating because the mismatch was predictable—we should have scouted the codebase *before* drafting the plan, not after.

The decision to go hard cutover (no v2 coexistence) made sense architecturally but left zero margin for error during implementation. One malformed step in the 8 labs would have cascaded validator failures. We got lucky. We shouldn't rely on luck.

---

## Technical Details

**Phase 01 Issues:**

1. **misconceptions shape mismatch**: Plan spec'd `{myth, reality}` structure; 8 existing labs use `{wrong, right, why}`. Validator error: schema rejected 8 valid labs because it expected wrong field names. Fix: kept existing shape, updated spec to match reality.

2. **tldr vs walkthrough step deployment info**: Plan said tldr rows store `deploymentUse` (true) but also said walkthrough steps must have per-step `deploymentUse` (false—only optional). Split validation rules: TLDR rows → mandatory `{why, whyBreaks, deploymentUse}`; walkthrough steps → optional `deploymentUse`.

3. **CSS token naming**: Plan spec'd `--danger`/`--success` tokens; codebase uses `--red`/`--green`/`--accent` + hardcoded hex values. No inet-viui MCP lookup occurred during planning (oversight). Renderer used existing pattern, not planned tokens.

**Phase 02 Execution:**

- 2 fullstack-developer subagents in parallel, each handling 3–4 labs
- 19 enhancement steps across 7 labs (plus ICMP pilot)
- `scripts/validate-lab-schema.js` executed cleanly: 8/8 labs pass
- Negative test: deleted misconceptions array → validator exit code 1 ✓

**Validator Coverage:**

```bash
$ npm run validate:schema
  ok   labs/01-networking/01-tcp-ip-packet-journey.html
  ok   labs/01-networking/02-subnet-cidr.html
  [... 6 more ...]
8/8 labs pass · 0 errors
```

**Code Review:**

8.5/10, APPROVE_WITH_FIXES label (no critical issues; style/consistency nits noted).

---

## What We Tried

1. **Pre-validation scout**: Checked 2 lab samples before planning. Missed depth—didn't systematically extract existing shapes from all 8 labs.
2. **Parallel subagent dispatch**: Clear file ownership (Subagent A: labs 1–3, Subagent B: labs 5–8) avoided git conflicts. Worked as intended.
3. **Negative test harness**: Removed misconceptions, re-ran validator, got exit 1. Confirmed enforcement.

---

## Root Cause Analysis

**Why the planning-to-code mismatches happened:**

1. **Insufficient audit before planning**: Analyst drafted spec based on 2 sample labs + requirement docs, not systematic extraction from all 8 labs in flight. False confidence.
2. **No design token lookup during planning**: CSS tokens were spec'd from first-principles ("danger color = red") rather than querying project palette. inet-viui MCP exists but wasn't activated.
3. **Hard cutover + zero staging period**: No way to validate plan against live codebase before committing to parallel work. Risk was embedded in workflow choice.

---

## Lessons Learned

1. **Scout systematically, not sampled.** Before planning any schema migration:
   - Glob all affected files (`labs/01-networking/*.html`)
   - Extract lab-data islands from all of them
   - Build shape inventory: which fields vary, which are constant
   - This takes 10 min, saves hours of validation debugging

2. **Activate design tokens early.** inet-viui MCP should be queried during planning phase for any UI-touching spec. Don't guess token names.

3. **Plan hard cutover + validation staging into timeline.** When moving all labs at once (no cohabit), add explicit "validation gate" phase: plan draft → review against live codebase → iterate spec → approve before parallel work begins.

4. **Mandatory misconceptions is pedagogy, not bureaucracy.** User decision to enforce `misconceptions ≥2` forced authors to think through "what will devs get wrong?" Standard lab quality jumped. Worth the rigor.

---

## Next Steps

1. **Defer mobile + console validation.** User noted browser tool unavailable; deferred to manual spot-check or future automation.
2. **Update plan supersession docs.** Mark `plans/dattqh/260419-1048-why-schema-v2/` as superseded by this migration.
3. **Wire validator to pre-commit hook.** Currently manual `npm run validate:schema`; should fail commit if any lab violates schema.
4. **Document scouting template.** Create reusable checklist for future schema migrations: "Extract shape inventory from N% of affected files before planning."

---

**Owner**: dattqh
**Timeline**: Complete ✓ | Deferred items: mobile smoke test (manual), hook integration (next sprint)
