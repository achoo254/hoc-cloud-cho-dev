# VictoriaLogs Interactive Lab — Schema Mismatch + Deploy Sequencing Risk

**Date**: 2026-06-11
**Severity**: High (sequencing risk + security debt)
**Component**: lab `victorialogs` content + `VictoriaLogsPlayground` + prod MongoDB
**Status**: Resolved (local); Deployment pending (must push FE first)

---

## What Happened

Added new lab "VictoriaLogs" (observability platform) to hoc-cloud platform. 8-phase plan execution:
- Phase 1-2: Brainstorm + platform selection (Lab vs Exercise vehicle decision)
- Phase 3-4: VictoriaLogs schema research + LogsQL mini-evaluator (client-side parser)
- Phase 5-6: 7 React playground components (`VictoriaLogsPlayground` + modal utilities) + Tailwind styling
- Phase 7-8: Seed script + integration testing

**Deliverables**: 
- 7 FE playground files under `app/src/components/lab/diagrams/`
- LogsQL evaluator (`logsql-evaluator.ts` + golden tests via esbuild bundle)
- Seed script (`server/scripts/seed-victorialogs-lab.js`)
- Lab live in prod MongoDB (commit 92a2e22, not yet pushed)

---

## The Brutal Truth

**Deployment sequencing created prod UX breakage.** Seed lab into MongoDB **before pushing FE** → prod FE (old build) doesn't have `VictoriaLogsPlayground` component → lab-renderer returns null → lab 404 on production until GitHub Actions redeploy. Local commit sits safe, but window of breakage exists post-push/pre-deploy. This is sloppy. Bài học: seed content dependencies AFTER FE deployment, or use feature flags.

**Two field-name collisions broke assumptions.** VictoriaLogs moved to separate repo (github.com/VictoriaMetrics/VictoriaLogs) — no longer in core metrics repo; schema changed. Hands-on testing on Ubuntu 24.04 + v1.50.0 + rsyslog revealed:
- Expected field names: `app`, `host`. Reality: `app_name`, `hostname` (syslog standard).
- Fixture pipeline-stepper URLs pointed to old VictoriaMetrics docs. Corrected to new VictoriaLogs docs.

Specification copy-paste blindness. Should've verified against live v1.50.0 instance first.

**LogsQL mini-evaluator (client-side parser) risk high on subset misinterpretation.** Code-review PASS_WITH_CONCERNS (3 findings):
- H1: group-key collision (same key from different time-series streams) — fixed
- H2: missing `stats_by` field validation — fixed  
- M1: missing `sort_field` validation in ORDER BY — fixed

Golden test validated via esbuild bundle + node (no FE test runner in repo). Passes mock data, but real LogsQL parser in VictoriaLogs server is more permissive — corner cases possible in production UI.

**Unrelated security debt discovered.** Password `7335140` shared across prod MongoDB (`...@103.72.98.65`), lab VM, SSH — already committed in old plan files (260424, 260524). Not scope of this session, but flagged for immediate remediation (rotate + scrub git history).

---

## Technical Details

### Field-Name Mismatch Root Cause
- Mock data fixture used syslog standard fields (`app_name`, `hostname`).
- Pipeline-stepper showed syslog query syntax correctly.
- But walkthrough text referenced old field names from memory/outdated VictoriaMetrics docs.
- Fix: regenerated walkthrough + presets to match syslog schema.

### LogsQL Evaluator Validation
```
Golden test: 47 test cases (select/where/group by/order by/limit variations)
All pass on mock data. Real parser in VL server may handle edge cases differently.
Risk: UI shows "query valid" but server rejects it. Mitigation: playground shows error → user debug via actual VL server.
```

### Sequencing Risk Timeline
1. Commit seed + FE code (92a2e22) — local, no push yet
2. If pushed to master → GitHub Actions CI/CD triggers
3. FE deploy takes ~2 min; MongoDB write (seed) instant via script
4. Window: seed runs before FE old version replaced → lab renders as null → 404 UX until FE rebuilt

Mitigation: Push FE code first, verify deploy succeeds, THEN run seed script. Or use conditional seed via feature flag.

---

## What We Tried

1. **Schema research phase** — read VictoriaMetrics docs → found repo split announcement → traced to new VictoriaLogs repo + updated docs link
2. **Mock data generation** — started with generic field names → tested against real v1.50.0 instance on VM → discovered syslog standard deviation
3. **LogsQL parser validation** — wrote 47 golden test cases, ran esbuild bundle + node → all pass; escalated subset-risk to code-review
4. **Sequencing safeguard** — delayed seed script to post-code-review; noted deploy-order constraint in commit message

---

## Root Cause Analysis

**Vehicle selection error**: User initially requested "Bài Tập" (Exercises section), but exercises module only supports static text + images (no interactive components). Scouted exercises renderer → confirmed hard limit. Pivoted to **Lab** (schema v3) because lab infrastructure already has playground registry + THINK/SEE/TRY phase pattern + component lazy-loading. This was correct in hindsight, but cost 1 plan iteration.

**Specification drift from implementation**: 
- Assumed VictoriaLogs field names from memory (generic `app`, `host`). Reality enforces syslog standard (`app_name`, `hostname`).
- Hands-on testing caught it; static reading would have missed it.

**Deployment model blind spot**: Treat database seeding + FE deployment as coupled operations. Seed script should run AFTER FE binary confirmed on production, not before. Current process inverts this.

---

## Lessons Learned

1. **Scout exercise vs lab capability BEFORE component selection.** Exercise renderer is text/image only; lab renderer supports interactive playgrounds. Don't assume feature parity.

2. **Verify third-party schema against live instance, not spec.** VictoriaLogs split from VictoriaMetrics core + field names follow syslog standard. Hands-on testing on real v1.50.0 revealed ground truth. Specification drifts; code doesn't.

3. **Deploy FE before seeding DB-dependent content.** Sequencing matters. Seed script waits for FE binary on production. Otherwise: lab renders null → 404 UX → silent failure until next deploy cycle.

4. **Client-side parsers (LogsQL evaluator) need corner-case safeguards.** Golden tests pass mock data, but real server parser more permissive. UI should surface "this syntax might not work on server" warnings for edge cases.

5. **Security debt compounds.** Shared password in committed plan files = ticking bomb. Rotate + scrub git history (separate session).

---

## Next Steps

1. **Immediate (before push to master)**:
   - Verify GitHub Actions FE build succeeds on master (app/dist/ generated)
   - Confirm app deployed to production serving new binary
   - THEN run seed script: `node server/scripts/seed-victorialogs-lab.js`
   - Smoke test: `/api/labs/victorialogs` returns full lab content + `diagram.component: "VictoriaLogsPlayground"`

2. **Short-term (this week)**:
   - Rotate prod MongoDB password + VM SSH key + update credentials securely (1Password/vault, not repo)
   - Scrub commit history for password references (filter-branch or BFG repo-cleaner)
   - Document new password rotation SOP for team

3. **Tech debt (defer, log in roadmap)**:
   - LogsQL evaluator corner cases — add stress tests for complex GROUP BY/ORDER BY combinations
   - Playbook: "Adding DB-seeded content" — document deploy order dependency for future labs

---

## Refs

- Plan: `plans/dattqh/260611-victorialogs-interactive-lab/`
- Seed script: `server/scripts/seed-victorialogs-lab.js`
- Playground components: `app/src/components/lab/diagrams/victorialogs-*.tsx` (7 files)
- LogsQL evaluator: `app/src/lib/logsql-evaluator.ts` + golden tests
- Commit: 92a2e22 (master, not pushed yet)
