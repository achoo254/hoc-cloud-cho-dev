---
title: "Phase 4 — Audit 7 Remaining Labs"
status: pending
priority: P1
effort: 2h
depends_on: [phase-00]
---

# Phase 4 — Audit 7 Remaining Labs

## Context Links

- Content guidelines: `docs/content-guidelines.md` §2, §3, §6
- Schema spec: `docs/lab-schema-v3.md` §7 (misconceptions ≥2), §8 (rationale)
- OSI pilot pattern: `plans/dattqh/reports/brainstorm-260424-0807-osi-think-depth-upgrade.md` §3
- Audit output dir: `plans/dattqh/260424-0922-osi-think-depth-upgrade/audits/`

## Overview

**Priority:** P1 — Runs in parallel with Phase 2/3. Produces per-lab gap reports
that drive Phase 5 content drafting.

Systematically audit 7 labs against the OSI pilot pattern:
- `arp`
- `dhcp`
- `dns`
- `http`
- `icmp-ping`
- `subnet-cidr`
- `tcp-udp`

## Audit Dimensions (per lab)

For each lab, assess 5 dimensions and assign a gap score (0 = none, 1 = minor, 2 = major):

| Dimension | Check | Score |
|-----------|-------|-------|
| **M** Misconceptions | count, quality of `wrong`/`right`/`why` | 0–2 |
| **T** TL;DR depth | `why` fields: analogy-heavy? missing RFC cite? surface-level? | 0–2 |
| **W** Walkthrough depth | `why` per step: contract/mechanics/implication present? | 0–2 |
| **C** Cite coverage | RFC/ISO anchor links per protocol claim | 0–2 |
| **B** Banned phrases | §2 violations: vague scope phrases present | 0–2 |

Total gap score 0–10. Priority for Phase 5: highest score first.

## Pre-Computed Findings (from MongoDB query)

From the audit query already run:

| Lab | tldr rows | walkthrough steps | misconceptions | Notes |
|-----|-----------|-------------------|----------------|-------|
| `arp` | 7 | 7 | MISSING | tldr[0].why: cites IP/MAC concept, no RFC |
| `dhcp` | 7 | 7 | MISSING | tldr[0].why: broadcast rationale present, no RFC 2131 cite |
| `dns` | 12 | 7 | MISSING | tldr[0].why: mentions stub resolver, no RFC 1034/1035 cite |
| `http` | 11 | 7 | MISSING | walkthrough[0].why: uses `<code>curl -v</code>` (HTML already) |
| `icmp-ping` | 6 | 6 | MISSING | tldr[0].why: uses `<code>ping</code>` (HTML already); walkthrough[0].why: "nhiều người nhầm" — banned-ish |
| `subnet-cidr` | 14 | 7 | MISSING | tldr[0].why: class A range cited, no RFC 1918 |
| `tcp-udp` | 6 | 7 | MISSING | walkthrough[0].why: "nc tạo 1 process" — no RFC |

All 7 labs: misconceptions `FIELD_MISSING` — score M=2 for all.

## Per-Lab Audit Protocol

For each lab, the auditor must:

1. Run MongoDB query to fetch full `tldr` + `walkthrough` arrays
2. Read each `why` field and score against 5 dimensions
3. List specific violations: banned phrases found, missing RFC cites, analogy phrases
4. Identify 3–5 misconception candidates (what would a dev misunderstand about this protocol?)
5. Write audit file to `audits/audit-{slug}.md`

## Audit File Template

```markdown
# Audit — {lab-title} ({slug})

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | ? | [specific issues] |
| W Walkthrough depth | ? | [specific issues] |
| C Cite coverage | ? | [RFC claims without links] |
| B Banned phrases | ? | [quoted violations] |
| **Total** | ? / 10 | |

## Priority: High / Med / Low

## Specific Violations

### TL;DR
- tldr[N].why: "[quoted text]" — [issue: missing RFC cite / analogy / banned phrase]

### Walkthrough
- step[N].why: "[quoted text]" — [issue]

## Misconception Candidates (3–5)

1. wrong: "..." → right: "..." (why it matters)
2. ...

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| [protocol behavior] | RFC XXXX §N |

## Phase 5 Scope Estimate

- misconceptions: N new items to draft
- tldr rows to rewrite: N / {total}
- walkthrough steps to rewrite: N / {total}
- Estimated effort: Xh
```

## Priority Ranking (Preliminary)

Based on pre-computed findings — to be confirmed after full audit:

| Rank | Lab | Rationale |
|------|-----|-----------|
| 1 | `icmp-ping` | "nhiều người nhầm" banned phrase, walkthrough[0].why uses analogy framing |
| 2 | `arp` | No RFC 826 cite in tldr; ARP poisoning misconception is high-value pedagogy |
| 3 | `dns` | 12 tldr rows — high volume, no RFC cites across any row |
| 4 | `tcp-udp` | Core protocol lab, high learner traffic expected |
| 5 | `http` | Already has `<code>` HTML — partial depth, needs RFC 9110 cites |
| 6 | `dhcp` | DORA flow already explained; add misconceptions + RFC 2131 cites |
| 7 | `subnet-cidr` | Math-heavy lab; misconceptions pattern less obvious, needs research |

## Related Files

**Create (one per lab):**
- `audits/audit-arp.md`
- `audits/audit-dhcp.md`
- `audits/audit-dns.md`
- `audits/audit-http.md`
- `audits/audit-icmp-ping.md`
- `audits/audit-subnet-cidr.md`
- `audits/audit-tcp-udp.md`

**Read:**
- MongoDB `labs` collection — full docs for all 7 slugs
- `docs/content-guidelines.md` §2 (banned phrases list)

## Implementation Steps

1. For each lab (can be done sequentially or batched):
   a. `mongosh <URI> --eval "printjson(db.labs.findOne({slug:'<slug>'},{tldr:1,walkthrough:1,_id:0}))"` — capture full arrays
   b. Read each `why` field; score 5 dimensions
   c. List concrete violations (quote the exact text)
   d. Draft 3–5 misconception candidates
   e. List RFC references needed for uncited claims
   f. Write `audits/audit-{slug}.md`

2. After all 7 audits: write `audits/audit-summary.md` with ranking table
   and total Phase 5 effort estimate.

## Todo

- [ ] Query MongoDB full doc for `arp` → write `audits/audit-arp.md`
- [ ] Query MongoDB full doc for `dhcp` → write `audits/audit-dhcp.md`
- [ ] Query MongoDB full doc for `dns` → write `audits/audit-dns.md`
- [ ] Query MongoDB full doc for `http` → write `audits/audit-http.md`
- [ ] Query MongoDB full doc for `icmp-ping` → write `audits/audit-icmp-ping.md`
- [ ] Query MongoDB full doc for `subnet-cidr` → write `audits/audit-subnet-cidr.md`
- [ ] Query MongoDB full doc for `tcp-udp` → write `audits/audit-tcp-udp.md`
- [ ] Write `audits/audit-summary.md` with final priority ranking + Phase 5 effort

## Success Criteria

- 7 audit files created, each with: gap score table, concrete violations quoted, ≥3 misconception candidates, RFC reference list
- `audit-summary.md` with ranked list and Phase 5 effort estimate per lab
- Total Phase 5 effort estimate ≤ 4h (re-scope if higher)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `subnet-cidr` (14 tldr rows) has too many items to audit thoroughly | High | Med | Focus on rows with protocol claims; skip math-only rows (no RFC needed for binary arithmetic) |
| Misconception candidates for `subnet-cidr` hard to find | Med | Low | Frame as "what does a dev misunderstand about CIDR vs classful?" — always findable |
| `dns` (12 tldr rows) audit takes disproportionate time | Med | Med | Batch: read all 12 why fields in one mongosh call, score in bulk |
| RFC links for some claims not findable | Low | Low | Use `content-guidelines.md` §3 priority order; if truly not in RFC, vendor docs (nginx.org, etc.) acceptable |

## Security Considerations

Read-only MongoDB queries — no write risk in this phase.

## Next Steps

- Phase 5 (blocked on this phase): content drafting per audit findings
- `audit-summary.md` is the direct input to Phase 5 work ordering
