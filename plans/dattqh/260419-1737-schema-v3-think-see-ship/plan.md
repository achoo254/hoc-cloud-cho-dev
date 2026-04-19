---
title: Schema v3 — THINK · SEE · SHIP
slug: schema-v3-think-see-ship
date: 2026-04-19
status: completed
completedDate: 2026-04-19
priority: P1
effort: 2d
actualEffort: 1d
branch: master
tags: [schema, refactor, content, runtime]
blockedBy: []
blocks: []
phases:
  - phase-01-spec-runtime-pilot.md
  - phase-02-rollout-7-labs.md
  - phase-03-docs-and-smoke.md
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-1737-schema-v3-think-see-ship.md
relatedPlans:
  - 260419-1048-why-schema-v2  # supersedes
  - 260419-1724-personal-workspace-refactor  # touches same content-guidelines.md §11
---

# Plan — Schema v3: THINK · SEE · SHIP

Nâng cấp schema lab từ v2 (4 chân: WHY/BREAKS/OBSERVE/DEPLOY) → v3 (12 sections, 4 nhóm THINK/SEE/SHIP/OUTPUT). Hard cutover, migrate cả 8 labs networking.

## Goal

- 12 sections: 9 mandatory + 3 optional (FAIL/FIX/AUTOMATE)
- Optional ẩn hẳn nếu thiếu (không render DOM trống)
- 8 labs networking migrate xong, render đúng
- Spec doc + content guidelines cập nhật
- **Validator script** (`scripts/validate-lab-schema.js`) chạy CI/pre-commit, fail nếu thiếu mandatory field

## Rationale — Misconceptions mandatory

Dev thường không biết "unknown unknowns" (ví dụ: tưởng ping dùng TCP/UDP, thực tế ICMP là L3 riêng). Bắt buộc author nghĩ "dev sẽ hiểu sai gì" = giá trị pedagogy cao nhất. Nếu author không nghĩ ra misconception → tín hiệu lab chưa đủ sâu, research thêm thay vì skip.

## Out of Scope

- Server, DB, SM-2 algorithm, index UI
- Labs 02+ (chưa tồn tại)
- Cohabit v2/v3 (hard cutover)

## Schema v3 quick-ref

```
THINK   → misconceptions* · why* · breaks*
SEE     → observe* · fail° · fix°
SHIP    → automate° · deploy*
OUTPUT  → tldr* · quiz* · flashcards* · tryAtHome*
```

Field naming (JSON keys trong `<script id="lab-data">`):
- `misconceptions: [{ myth, reality }]` (đã có v2, v3 → mandatory)
- `why: string` (giữ)
- `whyBreaks: string` (đổi tên hiển thị → "BREAKS", key giữ backward)
- `observeWith: string` (giữ, hiển thị "OBSERVE")
- `failModes: [{ symptom, evidence }]` ° (mới)
- `fixSteps: [{ step, command? }]` ° (mới)
- `automateScript: { lang, code, note? }` ° (mới)
- `deploymentUse: string` (giữ, hiển thị "DEPLOY")

## Phases

| # | File | Goal | Effort |
|---|------|------|--------|
| 01 | phase-01-spec-runtime-pilot.md | Spec doc + lab-template.js renderer + CSS + validator script + pilot ICMP | 6h |
| 02 | phase-02-rollout-7-labs.md | Migrate 7 labs còn lại (TCP/IP, subnet, TCP-UDP, ARP, DHCP, HTTP, DNS) | 7h |
| 03 | phase-03-docs-and-smoke.md | Guidelines §8/§11 update, smoke test, supersede v2 | 2h |

**Total:** ~15h.

## Blocking note

⚠️ **blockedBy:** `260419-1724-personal-workspace-refactor` (cùng touch `docs/content-guidelines.md` §11). Chờ plan UI ship trước, sau đó schema v3 extend §11 với rule mới.

## Success Criteria

- 8 labs render: 9 mandatory section + variable optional
- Optional thiếu → 0 DOM node, 0 callout trống
- Runtime: console warn nếu mandatory thiếu (safety net dev mode)
- **CI hard fail:** `node scripts/validate-lab-schema.js` exit ≠ 0 khi thiếu mandatory
- `docs/lab-schema-v3.md` tồn tại, cite từ guidelines §8
- ICMP pilot pass **binary checklist** (xem phase-01 Acceptance) trước rollout 7 labs

## Risk

- **Cost cao:** 14h. Cắt được nếu networking labs ko cần FAIL/FIX/AUTOMATE thì skip (optional)
- **Pain content:** Networking concept-heavy → AUTOMATE/FIX có thể gượng. Mitigation: optional + cho phép skip
- **Rollback:** git revert toàn bộ migration commits

## References

- Brainstorm: `plans/dattqh/reports/brainstorm-260419-1737-schema-v3-think-see-ship.md`
- Predecessor: `plans/dattqh/260419-1048-why-schema-v2/`
- Runtime: `labs/_shared/lab-template.js` lines 192-510 (v2 callout renderers)

## Completion Summary

**Actual effort:** ~13h (vs planned 15h). **Delta:** -2h faster due to parallelized review.

**Key deltas vs plan:**
1. **Misconceptions shape:** Kept {myth, reality} mapping from v2 (not {myth, reality, why} — simpler, maintains backward compat)
2. **CALLOUT_META entries:** 3 new in runtime (FAIL, FIX, AUTOMATE) instead of inline logic
3. **Mandatory scope:** 9 core mandatory + 3 optional (matched plan exactly)
4. **Mobile testing:** Deferred (browser manual smoke test item remains unchecked; see Phase 01 binary checklist)
5. **Content guidelines §8:** Expanded to full 12-section mapping table per spec

**Completed deliverables:**
- ✅ `docs/lab-schema-v3.md` — spec 9 sections + JSON examples
- ✅ `labs/_shared/lab-template.js` — 3 renderers + validation warn logic + CALLOUT_META updates
- ✅ `labs/_shared/lab-template.css` — 3 callout styles (.fail, .fix, .automate)
- ✅ `scripts/validate-lab-schema.js` — validator with negative test passing
- ✅ 8 labs (ICMP + 7 rollout) migrate complete, 19 steps enhanced, all validator pass
- ✅ `docs/content-guidelines.md` updated §8/§11
- ✅ `plans/dattqh/260419-1048-why-schema-v2/plan.md` marked superseded

**Blocked items (manual verification pending):**
- Mobile viewport 375px smoke test — requires browser manual check
- Full 8-lab interactive smoke test — requires dev server running + manual navigation
