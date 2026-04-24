---
title: "Phase 5 — Bulk Content Upgrade (7 Labs)"
status: pending
priority: P1
effort: 4h
depends_on: [phase-03, phase-04]
---

# Phase 5 — Bulk Content Upgrade (7 Labs)

## Context Links

- Audit files (input): `plans/dattqh/260424-0922-osi-think-depth-upgrade/audits/`
- OSI pilot script (template): `plans/dattqh/260424-0922-osi-think-depth-upgrade/scripts/update-osi-lab-think-depth.js`
- Content pattern: `plans/dattqh/reports/brainstorm-260424-0807-osi-think-depth-upgrade.md` §3
- RFC sources: brainstorm §3 table + per-lab audit RFC reference lists

## Overview

**Priority:** P1

Apply the OSI pilot pattern to all 7 remaining labs, working in priority order
from `audits/audit-summary.md`. Each lab gets:
1. `misconceptions[]` — ≥2 items (≥4 for high-gap labs per audit finding)
2. `tldr[].why` rewrites for flagged rows
3. `walkthrough[].why` rewrites for flagged steps

Process per lab is identical to Phase 2 (OSI pilot). One mongosh script per lab.

## Content Pattern (from OSI pilot)

Each `why` field follows the 3-paragraph structure:

```
P1 Contract — tầng/component nhận gì, tạo gì, spec reference (RFC/ISO anchor link)
P2 Mechanics — header/field cụ thể, state machine, protocol detail
P3 Implication cho dev — đổi cách debug/deploy khi hiểu điều này
```

Each misconception item:
```json
{
  "wrong": "Claim dev thường tin sai (1 câu, cụ thể)",
  "right": "Fact đúng (1–2 câu, cite RFC/vendor nếu có)",
  "why": "HTML string — tại sao sự nhầm lẫn này gây hậu quả cụ thể (debug/deploy)"
}
```

## Per-Lab RFC Reference Map

Starting point for content drafting — expand with audit findings:

| Lab | Key RFCs / Standards |
|-----|---------------------|
| `arp` | RFC 826 (ARP), RFC 791 §3.1 (IP/MAC relationship), IEEE 802.3 (Ethernet frame), CAPEC-141 (ARP spoofing) |
| `dhcp` | RFC 2131 (DHCP), RFC 2132 (DHCP options), RFC 1700 (port 67/68), RFC 8415 (DHCPv6) |
| `dns` | RFC 1034 (DNS concepts), RFC 1035 §4 (message format), RFC 7720 (root servers), RFC 4034 (DNSSEC) |
| `http` | RFC 9110 (HTTP semantics), RFC 9112 (HTTP/1.1), RFC 9113 (HTTP/2), RFC 6265 (cookies) |
| `icmp-ping` | RFC 792 (ICMP), RFC 791 §3.2 (TTL), RFC 1191 (PMTU Discovery), RFC 4443 (ICMPv6) |
| `subnet-cidr` | RFC 1918 (private address space), RFC 4632 (CIDR), RFC 950 (subnetting), RFC 1219 (address allocation) |
| `tcp-udp` | RFC 9293 (TCP, replaces 793), RFC 768 (UDP), RFC 5681 (congestion control), RFC 6298 (RTO), RFC 793 §2.7 (4-tuple) |

## Work Order

Execute in priority order from `audits/audit-summary.md`. Default order (update
after audit summary produced):

1. `icmp-ping` — highest gap score (preliminary)
2. `arp`
3. `dns`
4. `tcp-udp`
5. `http`
6. `dhcp`
7. `subnet-cidr`

## Per-Lab Process

For each lab `{slug}`:

### Step 1 — Read audit file
`audits/audit-{slug}.md` → extract: misconception candidates, flagged tldr rows
(indices), flagged walkthrough steps (indices), RFC reference list.

### Step 2 — Draft content
- Draft `misconceptions[]` items: ≥2, ideally 3–4 for high-gap labs
- Draft `why` rewrites for flagged tldr rows only (indices from audit)
- Draft `why` rewrites for flagged walkthrough steps only (indices from audit)
- Apply 3-paragraph contract/mechanics/implication structure
- All protocol claims: HTML `<a href="https://datatracker.ietf.org/...">RFC XXXX §N</a>`
- No banned phrases (§2): no "nhiều dev", "thường gặp", "phổ biến", "thế giới"
- Specific vendor/tool/RFC references replace vague scope phrases

### Step 3 — Write mongosh script
Script location: `scripts/update-{slug}-think-depth.js`
Template identical to `scripts/update-osi-lab-think-depth.js`:
1. Print DB name + slug as safety check
2. Read current doc, patch only flagged indices (preserve unflagged rows)
3. `$set` misconceptions + patched tldr + patched walkthrough + new contentHash
4. Print verification: `misconceptions.length`, `tldr[flagged_idx].why.substring(0,80)`

### Step 4 — Execute + verify
```bash
mongosh "<URI>" "plans/dattqh/260424-0922-osi-think-depth-upgrade/scripts/update-{slug}-think-depth.js"
```
Verify:
- `misconceptions.length >= 2`
- patched `why` first 80 chars correct
- `contentHash` changed
- API: `GET /api/labs/{slug}` → `misconceptions` present

### Step 5 — Visual QA
- Open lab on FE THINK tab
- Misconceptions section visible above TL;DR
- RFC links clickable, open correct section
- No layout breakage (informed by Phase 3 decision)

## File Ownership Per Lab

Each lab's script is a separate file — no cross-lab file conflicts:

| Lab | Script file | Backup file |
|-----|------------|-------------|
| `arp` | `scripts/update-arp-think-depth.js` | `scripts/backup-arp-pre-update.json` |
| `dhcp` | `scripts/update-dhcp-think-depth.js` | `scripts/backup-dhcp-pre-update.json` |
| `dns` | `scripts/update-dns-think-depth.js` | `scripts/backup-dns-pre-update.json` |
| `http` | `scripts/update-http-think-depth.js` | `scripts/backup-http-pre-update.json` |
| `icmp-ping` | `scripts/update-icmp-ping-think-depth.js` | `scripts/backup-icmp-ping-pre-update.json` |
| `subnet-cidr` | `scripts/update-subnet-cidr-think-depth.js` | `scripts/backup-subnet-cidr-pre-update.json` |
| `tcp-udp` | `scripts/update-tcp-udp-think-depth.js` | `scripts/backup-tcp-udp-pre-update.json` |

**No two labs share files. No app code changes in this phase.**

## Related Files

**Create:**
- `scripts/update-{slug}-think-depth.js` × 7
- `scripts/backup-{slug}-pre-update.json` × 7 (captured before each update)

**Read:**
- `audits/audit-{slug}.md` × 7
- MongoDB live docs for each slug

## Todo

- [ ] Read `audits/audit-summary.md` → confirm work order
- [ ] **icmp-ping**: draft content → write script → execute → verify → visual QA
- [ ] **arp**: draft content → write script → execute → verify → visual QA
- [ ] **dns**: draft content → write script → execute → verify → visual QA
- [ ] **tcp-udp**: draft content → write script → execute → verify → visual QA
- [ ] **http**: draft content → write script → execute → verify → visual QA
- [ ] **dhcp**: draft content → write script → execute → verify → visual QA
- [ ] **subnet-cidr**: draft content → write script → execute → verify → visual QA
- [ ] Confirm all 8 labs (incl. OSI) pass content-guidelines §7 checklist

## Success Criteria

- All 7 labs: `misconceptions.length >= 2`
- All 7 labs: `GET /api/labs/{slug}` returns `misconceptions` array
- All flagged `tldr[].why` + `walkthrough[].why` rewritten per audit
- Zero banned phrases across all new content
- Every protocol claim in new content has RFC/ISO anchor cite
- Visual QA: misconceptions cards visible on THINK tab for all 7 labs
- RFC links open correct IETF/ISO section on click

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `dns` (12 tldr rows) — most rows need rewrite, high effort | High | Med | Audit first: only rows with missing cites/analogy need rewrite; math/definition rows may be OK |
| `subnet-cidr` misconceptions hard to draft authentically | Med | Low | Frame around CIDR vs classful confusion (RFC 4632 vs classful), subnetting math pitfalls |
| Mongosh script patches wrong row index (off-by-one if tldr rows reordered) | Med | High | Script prints patched row index + first 80 chars before committing; verify match |
| Meilisearch out of sync if Meili was down during update | Low | Low | Re-run bulk sync script (`server/db/sync-search-index.js`) after all 7 updates |
| Content quality inconsistency across labs (different drafter sessions) | Med | Med | Use OSI pilot §4 as canonical template; apply same 3-paragraph structure consistently |

## Rollback

Per-lab: restore from `scripts/backup-{slug}-pre-update.json` via:
```js
db.labs.findOneAndUpdate({slug:'{slug}'}, {$set: <backup_doc>})
```
Independent per lab — rollback one without affecting others.

## Security Considerations

- One-shot scripts in `plans/` — not committed to `server/`. No credentials in files.
- MongoDB URI passed via CLI (not hardcoded in script).
- All content is admin-authored; no user-input path.

## Next Steps

- Phase 6: update `docs/content-guidelines.md` to codify the new depth pattern
  as enforceable contract; update `docs/codebase-summary.md` if Phase 3
  introduced component redesign
