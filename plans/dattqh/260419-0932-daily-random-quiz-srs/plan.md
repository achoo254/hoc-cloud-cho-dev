---
title: "Daily Random Quiz + SRS với độ khó tăng dần"
description: "20 câu/ngày mỗi lab, mix due-review/weak/new, SRS rút gọn, difficulty scale theo streak."
status: pending
priority: P2
effort: 10h
branch: master
tags: [labs, quiz, srs, learning, frontend]
created: 2026-04-19
---

## Goal
Thay inline `data.quiz` (8 câu cố định) bằng pool 60-100 câu/lab, mỗi ngày random 20 câu theo chiến lược mix + SRS rút gọn, difficulty tăng theo streakDays.

## Data Flow
```
quiz-bank/{labId}.json (pool)  ──►  daily-selector (seeded PRNG)  ──►  20 Qs rendered
         ▲                              ▲                                    │
         │                              │                                    ▼
  phase-02 generate                srs-state + streak                localStorage write
                                    (quiz:{labId}:srs)              (answers + srs update)
```

## Phases

| # | File | Deliverable | Effort | Blockers |
|---|------|-------------|--------|----------|
| 01 | [phase-01-schema-srs-engine.md](./phase-01-schema-srs-engine.md) | Schema v2, SRS engine, seeded shuffle, daily selector trong `lab-template.js` | 3h | none |
| 02 | [phase-02-generate-quiz-banks.md](./phase-02-generate-quiz-banks.md) | Pipeline Gemini gen 8 JSON banks (60-100 Qs mỗi lab) | 3h | 01 (schema chốt) |
| 03 | [phase-03-migrate-inline-quiz.md](./phase-03-migrate-inline-quiz.md) | Loader async fetch bank, fallback inline `data.quiz` | 2h | 01, 02 |
| 04 | [phase-04-ux-badges-reset.md](./phase-04-ux-badges-reset.md) | Streak badge, due-count, difficulty indicator, reset button | 2h | 01, 03 |

## Key Decisions
- Pool 60-100 Qs/lab; 20 Qs/day (8 due + 4 weak + 8 new-by-tier, fill random)
- SRS rút gọn: đúng → `interval *= 2` (cap 16d), sai → `interval=1, wrongCount++`
- Seed = `YYYYMMDD+labId`, mulberry32 PRNG → reproducible same-day
- Bank file: `labs/_shared/quiz-bank/{labId}.json` (separate từ inline)
- Backward compat: no bank file → fallback `data.quiz` inline
- Schema v2 additive: `{id, difficulty, tags[], q, options, correct, whyCorrect, whyOthersWrong}`
- **Inline quiz → seed**: extract 8 inline Qs hiện tại, normalize (gán id/difficulty/tags), dùng làm seed; Claude gen thêm cho đủ 60-100/lab
- **Reset 2 dạng**: (a) Manual UI button xóa `quiz:${labId}:*`; (b) Auto daily: miss 1 ngày → streak về 0 (SRS per-Q GIỮ nguyên)
- **Streak GLOBAL** (cross-lab): `quiz:global:streakDays` + `quiz:global:lastActiveDate`; difficulty tier dùng streak này cho mọi lab
- **Generation engine**: Claude Code session trực tiếp (đọc HTML → gen JSON → self-review → ghi file); KHÔNG dùng Gemini/Python/ai-multimodal

## Storage Keys (localStorage)
| Key | Shape | Purpose |
|-----|-------|---------|
| `lab:quiz:{labId}` | `{answers:{qid:{picked,correct,ts}}, done}` | Answer log |
| `lab:quiz:{labId}:srs` | `{[qid]:{lastSeen,interval,wrongCount}}` | SRS state |
| `lab:quiz:{labId}:daily` | `{date, pickedIds[]}` | Cache today's selection |
| `lab:quiz:global:streakDays` | `number` | Global streak count (cross-lab) |
| `lab:quiz:global:lastActiveDate` | `YYYYMMDD` | Last day user opened any lab (for miss-day detection) |

## Test Matrix
| Layer | Test |
|-------|------|
| Unit | mulberry32 determinism; SRS interval math; selector mix counts |
| Integ | Load bank → select 20 → render → answer → SRS update → next day re-select |
| E2E | Open lab fresh → answer all → reload same day (same Qs) → advance date (new Qs) |
| Regression | Lab without bank file → inline fallback renders |

## Rollback
- Phase 01-02 isolated (new files, no existing edits) — revert files
- Phase 03 touches 8 HTML labs — guard with feature flag `USE_QUIZ_BANK` in `lab-template.js`, set `false` to fall back instantly
- Phase 04 UI-only — disable via CSS class removal

## File Ownership (no parallel conflict)
- Phase 01: `labs/_shared/lab-template.js` (exclusive)
- Phase 02: `labs/_shared/quiz-bank/*.json` (new files only)
- Phase 03: 8× `labs/01-networking/*.html` (exclusive per file)
- Phase 04: `labs/_shared/lab-template.js` (after 01), `lab-template.css`

## Success Criteria
- [ ] 8 banks, mỗi bank 60-100 Qs, 0 validator warnings
- [ ] Same-day reload = same 20 Qs; next-day = different set
- [ ] SRS đúng → interval doubles; sai → resets to 1d
- [ ] Streak day 1-3: 6E+2M; day 4-7: 3E+3M+2H; day 8+: 2E+3M+3H (verified via console dump)
- [ ] Reset button clears `lab:quiz:{labId}:*` keys only
- [ ] Lab không có bank → fallback inline works

## Unresolved Questions
1. **Câu multi-correct** có hỗ trợ không? (Hiện schema `correct: number` single-answer — giữ nguyên)

> Resolved (2026-04-19): inline merge as seed · miss-1-day resets streak · global streak · Claude-in-session generation (no Gemini).
