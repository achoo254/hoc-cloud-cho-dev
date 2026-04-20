---
title: Interactive THINK/SEE Playground — tcp-ip-packet-journey pilot
slug: interactive-think-see-playground
date: 2026-04-19
status: completed
completedAt: 2026-04-20
priority: P2
effort: 3-3.5d (spike 0.5d + core 2.5d + SVG export 0.3d; KHÔNG analytics/Playwright suite)
branch: master
tags: [frontend, d3, framer-motion, interactive, pilot]
blockedBy: []
blocks: []
phases:
  - phase-00-spike-d3-framer.md         # [RED TEAM #11] NEW 0.5d spike
  - phase-01-schema-registry-responsive.md
  - phase-02-layer-stack-encap.md
  - phase-03-journey-story-mode.md      # absorbs Step-mode keyboard
  - phase-04-step-mode-scrubber.md      # CUT (v2)
  - phase-05-sandbox-failure-injection.md  # CUT (v2)
  - phase-06-export-png-svg.md          # REDUCED: SVG-only w/ DOMPurify, PNG CUT
  - phase-07-polish-a11y.md             # + Playwright E2E + analytics tracking + env flag
relatedReports:
  - plans/dattqh/reports/brainstorm-260419-2315-interactive-think-see-playground.md
relatedPlans:
  - plans/dattqh/260419-1737-schema-v3-think-see-ship/plan.md
---

# Plan — Interactive THINK/SEE Playground

## Goal
Thay THINK (TL;DR) + SEE (Walkthrough) của lab `tcp-ip-packet-journey` từ text thuần bằng playground tương tác: 4-layer stack encapsulation demo + packet journey simulator với 3 modes (story / step / sandbox). Desktop only; mobile giữ renderer text hiện tại.

## Stack
- D3 (`d3-scale`, `d3-shape`) — layout only; enforce pure-math via ESLint (no `d3-selection`)
- Framer Motion 11.18 (đã có)
- React 18 + TypeScript + shadcn/ui (đã có)
- Zod 3.24 (đã có) — fixture schema
- **DOMPurify** (NEW) — SVG export sanitize
- **KHÔNG** analytics, **KHÔNG** Playwright suite — self-learning repo, KISS triệt để

## Phases
1. **Schema + component registry + responsive switch** — scaffold foundation.
2. **Layer-stack encapsulation (THINK)** — 4-layer SVG + drag-to-encap.
3. **Journey story mode (SEE)** — timeline scrubber bound to `walkthrough[]`.
4. **Step-by-step mode** — Next/Prev/Pause controls on top of story mode.
5. **Sandbox + failure injection** — IP/port input, presets, failure toggles, localStorage persist.
6. **PNG/SVG export** — current diagram state → downloadable file.
7. **Polish + a11y** — keyboard nav, aria-live, `prefers-reduced-motion`, bundle audit.

## Success criteria

### Shipping (binary)
- Lab `tcp-ip-packet-journey` trên desktop render playground thay vì text TLDR + walkthrough list.
- Mobile (<768px) fallback `LabRenderer` hiện tại (CSS-only path — xem [RED TEAM #14]).
- Story mode render 8 frames hardcoded khớp `walkthrough[]` của pilot lab (không claim 100% generic).
- No regression các lab khác — automated Vitest snapshot test (xem [RED TEAM #13]).
- Bundle playground lazy-load + ErrorBoundary fallback khi chunk load fail ([RED TEAM #9]).
- Feature flag `VITE_ENABLE_DIAGRAM_PLAYGROUND` (default true) cho kill switch ([RED TEAM #12]).

### Self-reflection (Validation Session 2 revise — KISS)
Repo này là **self-learning của 1 người**, không phải product có user base. Vì vậy:
- **Không instrumentation, không admin page, không metric formula.**
- Pilot validation = **tự dùng lab pilot 2-3 lần trong tuần đầu**, ghi note trong `journal/` (nếu có) hoặc ngay trong plan này: "có hiểu hơn text baseline không? mode nào dùng thật? bug nào gặp?".
- Rollout 6 labs còn lại = **subjective gut check** sau self-test. Nếu thấy phí công → dừng. Nếu thấy giúp → template hoá + apply.
- Finding #2 (red team) vẫn được tôn trọng ở mức: **không rollout blind**. Chỉ có điều "validate" = tự xài, không phải stats.

## Out of scope
- 7 labs còn lại (chờ pilot validate).
- Mobile interactive diagram.
- Watermark PNG export.
- Generic diagram primitives (`layer-stack`, `sequence`, `bit-mask`) — scaffold schema thôi, implement sau.

## Risks
- D3 vs Framer tranh DOM → strict separation rule, enforce bằng ESLint `no-restricted-imports` cho `d3-selection` trong `diagrams/**` ([RED TEAM #15]). Alt: bỏ D3 hoàn toàn, thay `scaleBand`/`scaleLinear` bằng arithmetic 4 dòng.
- Bundle bloat → lazy-load + modular D3 imports + ErrorBoundary cho ChunkLoadError ([RED TEAM #9]).
- Animation state machine phình → `useReducer` explicit frames + monotonic `animationId` token chống race ([RED TEAM #3]).
- Custom component debt → pilot để learn, code có thể rewrite; không treat as foundation.
- Rollback → feature flag `VITE_ENABLE_DIAGRAM_PLAYGROUND` config-only không cần rebuild ([RED TEAM #12]).

## Red Team Review

### Session — 2026-04-19
**Reviewers:** Security Adversary · Failure Mode Analyst · Assumption Destroyer · Scope & Complexity Critic
**Raw findings:** 38 · **Capped:** 15 (4 Critical, 8 High, 3 Medium) · **Accepted:** 15 · **Rejected:** 0
**Report:** `plans/dattqh/reports/red-team-260419-2321-interactive-think-see-playground.md`

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Walkthrough lab là ICMP+DNS, schema giả định TCP+port | Critical | Accept | phase-05 (cut) + plan success criteria |
| 2 | Success criteria không đo learning | Critical | Accept | plan.md Success criteria |
| 3 | setTimeout cleanup + animation race scrub/play | Critical | Accept | phase-03 |
| 4 | SVG export XSS qua XMLSerializer không sanitize | Critical | Accept | phase-06 |
| 5 | 3 modes là scope creep — cut step/sandbox | High | Accept | phase-04, phase-05 (cut) |
| 6 | Schema 4 variants premature abstraction | High | Accept | phase-01 |
| 7 | PNG export cluster (tainted canvas, CSS vars, non-atomic) | High | Accept | phase-06 (cut PNG) |
| 8 | localStorage thiếu Zod revalidate + version + try/catch | High | Accept | phase-05 (nếu restore v2) |
| 9 | Lazy-load không có ErrorBoundary | High | Accept | phase-01 |
| 10 | Frame-mapper heuristic mâu thuẫn hardcoded | High | Accept | phase-03 |
| 11 | Effort 4-6d ảo tưởng, không có spike | High | Accept | plan.md + phase-00 (new) |
| 12 | Không có feature flag / kill switch | High | Accept | plan.md risks |
| 13 | Không có automated regression test | High | Accept | phase-07 (sớm hơn phase-01) |
| 14 | Desktop-only dùng media-query = 0 net save | Medium | Accept | phase-01 |
| 15 | D3×Framer separation không enforcement | Medium | Accept | plan.md risks + phase-02 |

## Validation Log

### Session 1 — 2026-04-19 23:32

| # | Topic | Decision | Rationale |
|---|-------|----------|-----------|
| V1 | D3 keep/drop | **Keep** `d3-scale` + `d3-shape` | Flexibility v2. ESLint rule enforce separation. |
| V2 | Test infra | ~~Playwright E2E~~ → **Manual smoke test** | Revised S2: self-learning, 8 labs manual check + TS compile đủ. |
| V3 | Analytics | ~~localStorage tracking~~ → **Self-reflection note** | Revised S2: không user base, không cần metric. |
| V4 | Feature flag | **Env var** `VITE_ENABLE_DIAGRAM_PLAYGROUND` | Build-time flag. Kill switch nếu broken. |
| V5 | Pilot scope | **Story + SVG export** | phase-00/01/02/03/06-reduced/07. phase-04/05 CUT v2. |
| V6 | Learning metric | ~~Completion rate ≥60%~~ → **Subjective gut check** | Revised S2: tự dùng 2-3 lần, judge có giúp không. |
| V7 | Kill criterion | ~~N≥30 sessions~~ → **Self-test feel** | Revised S2. |

### Session 2 — 2026-04-19 23:40 (repo philosophy correction)
User reminder: **self-learning repo, không phải product**. Revise:
- Cắt admin page analytics + Playwright suite (over-engineering).
- Manual smoke: 8 labs tự click qua; TypeScript `tsc --noEmit` cover compile regression.
- Finding #2 downgrade: không instrumentation; pilot validation = tự dùng.
- Effort: 5-5.5d → **3-3.5d**.

### Propagated changes
- `plan.md` Stack: bỏ Playwright + tracking, giữ DOMPurify
- `plan.md` Success criteria: self-reflection thay metric
- `plan.md` effort: 5-5.5d → 3-3.5d
- `phase-06`: giữ SVG + DOMPurify
- `phase-07`: manual smoke + env flag; cắt Playwright + analytics page

## Completion Summary — 2026-04-20

| Phase | Status | Notes |
|-------|--------|-------|
| phase-00 spike-d3-framer | ✅ complete | D3+Framer POC validated |
| phase-01 schema-registry-responsive | ✅ complete | DiagramSchema + registry + responsive switch |
| phase-02 layer-stack-encap | ✅ complete | 4-layer SVG + drag-to-encap |
| phase-03 journey-story-mode | ✅ complete | Timeline scrubber + autoplay |
| phase-04 step-mode-scrubber | CUT (v2) | Deferred per RED TEAM #5 |
| phase-05 sandbox-failure-injection | CUT (v2) | Deferred per RED TEAM #5 |
| phase-06 export-png-svg | ✅ complete | SVG-only + DOMPurify per RED TEAM #7 |
| phase-07 polish-a11y | ✅ complete | Keyboard nav, aria-live, reduced-motion, bundle audit |

**Result:** All 6 active phases delivered. Pilot scope (story mode + SVG export + a11y) shipped to `tcp-ip-packet-journey`.
Next: Self-test pilot lab 2-3x this week; subjective gut check before rolling out remaining 7 labs.
