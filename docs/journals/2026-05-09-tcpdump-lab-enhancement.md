# tcpdump Lab Enhancement — PacketDecoder shipped, Mongo script pending manual run

**Date**: 2026-05-09 11:31
**Severity**: Medium
**Component**: `app/src/components/lab/diagrams/shared/` — PCAP parser + PacketDecoder UI
**Status**: Resolved (Phase 7 Mongo script + Phase 8 browser smoke deferred to human)

---

## What Happened

8-phase enhancement plan (`plans/dattqh/260507-2215-tcpdump-lab-enhancement/`) executed via `/cook --auto` in one session (~10h estimated, delivered same day). Four commits landed on master (8c2715b → 555ef8d → f204af0 → 20894ab). No push.

Delivered:
- Vanilla PCAP parser — zero deps, `DataView` for endianness, `Uint8Array` for raw bytes, Ethernet + Linux SLL link types, 5 MB / 200-packet caps
- 3-panel `PacketDecoder` UI: summary list / layer tree / hex view with byte-range highlights
- Drag-and-drop `.pcap` upload zone (fixed Firefox `dragenter` gap during review)
- Synthetic sample captures for icmp-ping and http playgrounds (generated in-browser, no server round-trip)
- Mongo content update script (`server/scripts/update-tcpdump-labs.js`) — written but NOT executed; must be run manually against a live Mongo instance

**User must verify before closing:**
1. Run `node server/scripts/update-tcpdump-labs.js` against staging/prod Mongo
2. Browser smoke: upload a real `.pcap` into icmp-ping and http playgrounds, confirm summary/tree/hex panels render correctly

---

## The Brutal Truth

The schema mismatch between the plan doc and the actual codebase was caught before any agent touched the code — but only because the plan was read carefully upfront. If that check had been skipped (the default agent behaviour would have been to trust the plan), the delegation prompt would have propagated wrong field names (`try_at_home` vs `tryAtHome`, `LabModel` vs `Lab`, `MONGO_URI` vs `MONGODB_URI`, `question`/`why` vs `q`/`whyCorrect`/`whyWrong`) into every downstream agent. That would have cost at minimum two full retry cycles — an hour of wasted compute and wall time. The plan was written two days before the session, probably from memory rather than from a `grep` of the Zod source.

The 200-LOC budget rule was also bent twice (`pcap-parser.ts` at 259 lines, `http-capture-builders.ts` at 205). The justification (cohesion: splitting a deterministic byte-walking state machine across files increases cognitive load without reducing complexity) is defensible, but the decision was accepted on agent reasoning alone, not reviewed against the rule's original intent. Future sessions should treat this as a flag, not a free pass.

---

## Technical Details

Key files shipped:
- `app/src/components/lab/diagrams/shared/pcap-parser.ts` — 262 lines; global header parse → per-packet loop; `inclLen=0` MALFORMED guard added after code review caught unhandled zero-length edge case
- `app/src/components/lab/diagrams/shared/http-capture-builders.ts` — 205 lines; `TextDecoder` replaces `String.fromCharCode(...spread)` to prevent stack overflow on large HTTP payloads; 4 KB line cap + 64-header cap enforced
- `app/src/components/lab/diagrams/shared/pcap-upload-zone.tsx` — 154 lines; `dragenter` handler was missing, causing Firefox to reject drops silently; added during code review pass
- `app/src/lib/hooks/use-media-query.ts` — 26 lines; new hook for mobile-responsive panel layout

Code review surfaced 3 real defects post-implementation (inclLen=0, dragenter, fromCharCode). All fixed before commit. This is the review step paying its cost.

---

## What We Tried

Nothing was retried for technical reasons. Schema corrections were pre-emptive. The only significant mid-session correction was the `String.fromCharCode` → `TextDecoder` replacement, driven by code review identifying the potential stack overflow on HTTP response bodies that exceed V8's argument stack limit (`RangeError: Maximum call stack size exceeded` on arrays > ~65k elements).

---

## Root Cause Analysis

**Schema drift between plan and codebase**: The plan author (same session, two days prior) wrote field names from memory instead of grepping `app/src/lib/schema-lab.ts`. Plans that reference model/field names should be auto-validated against Zod source on creation, or at least include a `<!-- verified against: schema-lab.ts rev X -->` marker so stale plans are visible.

**LOC overrun**: The 200-line rule was written for general modules. Parsers and builders that are intentionally sequential (byte offset arithmetic must be read top-to-bottom) don't decompose cleanly into sub-files without adding indirection that increases the error surface. The rule should have a documented exception for state-machine / sequential-decoder files, or a higher cap (e.g. 300 lines) for that category.

---

## Lessons Learned

1. **Always `grep` Zod schema before writing plan field names** — one `grep -r "tryAtHome\|try_at_home" app/src/lib/` before brainstorming saves retry cycles later.
2. **Code review is not ceremonial** — three bugs were caught that typecheck + build could not catch (runtime edge cases: zero-length packet, browser-specific drag event, stack overflow on large strings). Never skip.
3. **Upfront schema correction in delegation prompt** — passing verified corrections to the agent before it starts is orders of magnitude cheaper than letting the agent discover mismatches mid-implementation.
4. **Document LOC exceptions explicitly** — if a file is allowed to exceed the budget, note it in the file header comment with a reason. Silent overruns erode the rule for everyone.

---

## Next Steps

| Action | Owner | When |
|--------|-------|------|
| Run `node server/scripts/update-tcpdump-labs.js` against Mongo | User (needs DB access) | Before next lab session |
| Browser smoke: upload real `.pcap` into icmp-ping + http playgrounds | User | Same window |
| Push master to remote after smoke passes | User | After smoke |
| Codify LOC exception policy for sequential parsers in `docs/code-standards.md` | Agent (next docs-manager pass) | Next maintenance session |
| Add Zod field-name verification step to plan template (`phase-XX.md`) | Agent (next planner pass) | Next plan creation |
