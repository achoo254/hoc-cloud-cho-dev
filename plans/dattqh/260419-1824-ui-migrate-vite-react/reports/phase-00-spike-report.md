# Phase 00 — Spike + Fixtures Report

**Date:** 2026-04-19 19:05 · **Status:** PARTIAL DONE (data/schema gates passed, spike UI deferred to next session)

## Scope completed this session

- ✅ DB inspection + reality check
- ✅ Fixture dump (8 labs)
- ✅ Zod schema (loose base + domain extras + `.passthrough()`)
- ✅ Validation all labs
- ⏸️ Scaffold `app/` (deferred to next session per user option C)
- ⏸️ Bundle/Lighthouse/HMR measurements (deferred)

## Reality check findings

| Assumption | Actual | Impact |
|---|---|---|
| 50+ labs | **8 labs** | Scope collapsed: rewrite justified only as learning project, not refactor necessity |
| Schema v3 = THINK/SEE/SHIP column names | DB columns = `tldr_json / walkthrough_json / quiz_json / flashcards_json / try_at_home_json` (v2 naming, v3 content) | Naming mapping: tldr→THINK, walkthrough→SEE, try_at_home→SHIP |
| Uniform schema | **Domain-specific variance** in tldr (networking layers, DHCP DORA, CIDR terms) | Schema uses `.passthrough()` + optional domain fields |
| Content arrays of strings | `failModes` / `fixSteps` can be string **or** object `{symptom,evidence}` / `{step,command}` | Schema uses `z.union([string, object])` |

## Gate results

| Gate | Threshold | Result |
|---|---|---|
| Schema parse coverage | ≥ 95% | **100% (8/8)** ✅ |
| Main bundle gzip | ≤ 100KB | Deferred (no scaffold yet) |
| HMR p95 | ≤ 500ms | Deferred |
| Spike UI feels better | Subjective | Deferred |

**Decision: partial GO.** Data/schema risk resolved. UI/bundle gates still pending — need scaffold spike next session to finalize go/no-go.

## Files created

- `scripts/dump-lab-fixtures.js` — SQLite → JSON dump
- `scripts/lab-schema.js` — Zod schema v3
- `scripts/validate-lab-fixtures.js` — gate validator
- `fixtures/labs/*.json` (8 files) — source of truth for next phases
- `package.json` — `zod@^4` added as devDep

## Schema snapshot

- `TldrItemSchema` — base `{why, whyBreaks, deploymentUse?}` + optional domain fields (layer/name/pdu/device/protocol/step/port/payload/term/value/what)
- `WalkthroughStepSchema` — `{step, what, why, whyBreaks?, observeWith?, code?, failModes?, fixSteps?}`
  - `failModes` = array of `string | {symptom, evidence?}`
  - `fixSteps` = array of `string | {step, command?}`
- `QuizItemSchema` — `{q, options[], correct, whyCorrect?, whyWrong?}`
- `FlashcardSchema` — `{front, back, why?}`
- `TryAtHomeSchema` — `{cmd, why, observeWith?}`
- All use `.passthrough()` for forward compatibility

## Next session tasks

1. Scaffold `app/` (Vite+React+TS+Tailwind+shadcn+Framer Motion+React Router+React Query)
2. Port `scripts/lab-schema.js` → `app/src/lib/schema-lab.ts`
3. Build prototype `<LabRenderer>` rendering 1 fixture
4. Build `<StatsSection>` with fake data + heatmap
5. Measure: bundle gzip, Lighthouse, HMR
6. Update this report with final GO/NO-GO

## Risks re-assessed

- ✅ Schema v3 domain variance: **resolved** via union + passthrough
- 🟡 Bundle budget: unknown until scaffold
- 🟡 "Learning project" framing accepted by user — scope kept, but effort estimate removed (AI agent executes)

## Unresolved

- Where to put Zod schema long-term: `app/src/lib/schema-lab.ts` (after Phase 01 scaffold) — confirm path when scaffolding
- DB schema rename (v2 columns → v3 names like `think_json / see_json / ship_json`) — out of scope lần này, hoặc làm trong Phase 07 follow-up?
