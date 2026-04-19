# Phase 01 — Schema v2 + SRS Engine + Daily Selector

## Context Links
- Plan: [../plan.md](./plan.md)
- Current runtime: `labs/_shared/lab-template.js:122-179` (renderQuiz)
- Current schema ref: `labs/README.md:43-56`

## Overview
- **Priority:** P1 (blocker cho phase 02-04)
- **Status:** pending
- **Effort:** 3h

## Requirements
1. Schema v2 additive: `{id, difficulty, tags[]}` + existing fields
2. Seeded PRNG (mulberry32) → same day same shuffle
3. SRS rút gọn: đúng `interval *= 2` (cap 16d), sai reset `interval=1, wrongCount++`
4. Daily selector: 8 due + 4 weak + 8 new-by-tier, fill random
5. Difficulty tier theo streakDays (day 1-3 / 4-7 / 8+)
6. Streak tracker: GLOBAL cross-lab
   - Keys: `lab:quiz:global:streakDays` (number), `lab:quiz:global:lastActiveDate` (YYYYMMDD)
   - Auto-reset: khi mở bất kỳ lab, nếu `(today - lastActiveDate) > 1 day` → `streakDays = 0`
   - Bump: today != lastActiveDate → `streakDays++` (chỉ 1 lần/ngày); `lastActiveDate = today`
   - SRS state của từng câu KHÔNG bị reset — chỉ streak reset
7. Backward compat: if `q.id` missing, fallback to index-based key

## Architecture

### Module layout (giữ single file `lab-template.js`, thêm helpers)
```
lab-template.js
├── [existing]
├── mulberry32(seed) → rand()          // PRNG
├── seededShuffle(arr, seed)           // Fisher-Yates + mulberry32
├── hashLabDate(labId, date) → seed    // YYYYMMDD+labId → int
├── quizSrsUpdate(state, correct)      // mutate one qid's SRS
├── selectDailyQuiz(pool, srsState, streakDays, seed) → 20 items
├── getStreakDays()                    // read lab:quiz:global:streakDays, apply miss-day reset
├── checkAndResetStreakIfMissed()     // call on lab open; if gap>1d → streakDays=0
├── bumpStreak()                       // call on lab open after check; idempotent per date
└── renderQuiz(...) rewrite             // use selector, qid-based state
```

### Selector Algorithm
```
Input: pool (60-100), srsState, streakDays, seed
1. now = Date.now()
2. due = pool.filter(q => srs[q.id]?.lastSeen && srs[q.id].lastSeen + srs[q.id].interval*DAY <= now)
3. weak = pool.filter(q => (srs[q.id]?.wrongCount ?? 0) >= 2 && !due.includes(q))
4. seen = pool.filter(q => srs[q.id]?.lastSeen)
5. new = pool.filter(q => !seen.includes(q))
6. tier = difficultyTier(streakDays)  // e.g. {easy:6, medium:2, hard:0}
7. pick 8 from due (seeded shuffle, slice)
8. pick 4 from weak
9. pick newByTier: for each diff in tier, pick N from new.filter(diff)
10. if total < 20, fill from remaining pool
11. seeded-shuffle final list for display order
```

### Difficulty Tier
```js
function difficultyTier(streakDays) {
  if (streakDays <= 3) return { easy: 6, medium: 2, hard: 0 };
  if (streakDays <= 7) return { easy: 3, medium: 3, hard: 2 };
  return { easy: 2, medium: 3, hard: 3 };
}
```

### Global Streak Logic
```js
const TODAY = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; };
const daysBetween = (a, b) => {
  const p = s => new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8));
  return Math.round((p(b) - p(a)) / 86400000);
};
function checkAndBumpStreak() {
  const today = TODAY();
  const last = localStorage.getItem(STORAGE_PREFIX + 'quiz:global:lastActiveDate');
  let streak = +(localStorage.getItem(STORAGE_PREFIX + 'quiz:global:streakDays') || 0);
  if (!last) streak = 1;
  else {
    const gap = daysBetween(last, today);
    if (gap === 0) return streak;          // same day, no-op
    if (gap === 1) streak += 1;            // consecutive
    else streak = 1;                       // miss ≥1 day → reset to 1 (today counts)
  }
  localStorage.setItem(STORAGE_PREFIX + 'quiz:global:streakDays', streak);
  localStorage.setItem(STORAGE_PREFIX + 'quiz:global:lastActiveDate', today);
  return streak;
}
```
Gọi `checkAndBumpStreak()` ở `LabTemplate.init()` (on lab open), TRƯỚC khi `selectDailyQuiz` chạy (để tier dùng streak mới).

### SRS Update
```js
function quizSrsUpdate(prev, correct) {
  const p = prev || { lastSeen: 0, interval: 1, wrongCount: 0 };
  if (correct) return { ...p, lastSeen: Date.now(), interval: Math.min(p.interval * 2, 16) };
  return { ...p, lastSeen: Date.now(), interval: 1, wrongCount: p.wrongCount + 1 };
}
```

## Related Code Files
- `labs/_shared/lab-template.js:5` — STORAGE_PREFIX
- `labs/_shared/lab-template.js:10-25` — sm2 (reference, untouched)
- `labs/_shared/lab-template.js:32-36` — store helper (reuse)
- `labs/_shared/lab-template.js:39-49` — validateData (extend for id/difficulty)
- `labs/_shared/lab-template.js:122-179` — renderQuiz (rewrite)
- `labs/_shared/lab-template.js:295-313` — init (pass quiz via pool loader)

## Implementation Steps
1. Add PRNG + seed helpers top of file (after STORAGE_PREFIX)
2. Add SRS helpers (`quizSrsUpdate`) + global streak `checkAndBumpStreak()` (merged check + bump)
3. Add `difficultyTier(streakDays)` + `selectDailyQuiz(pool, srs, streak, seed)`
4. Extend `validateData`: warn if `q.id` missing, difficulty not in enum
5. Rewrite `renderQuiz`:
   - Accept `pool` param (not 8 Qs)
   - Read `lab:quiz:{labId}:daily` — if today cached use it, else run selector + cache
   - Key answers/srs by `q.id` (not index)
   - On answer: update srs only (streak đã bump ở init)
   - Note: `checkAndBumpStreak()` chạy trong `LabTemplate.init()` — xử lý cả miss-day-reset và bump trong 1 call
6. Unit-testable: extract selector into pure fn (exported on `LabTemplate` for console testing)

## Todo List
- [ ] Add mulberry32 + seededShuffle
- [ ] Add hashLabDate, difficultyTier
- [ ] Add quizSrsUpdate, streak helpers
- [ ] Add selectDailyQuiz
- [ ] Extend validateData
- [ ] Rewrite renderQuiz (qid-keyed state)
- [ ] Export selector on LabTemplate for testing
- [ ] Update getQuizScore to use qid-keyed state

## Success Criteria
- `LabTemplate.selectDailyQuiz(pool, {}, 1, 20260419)` returns 20 items deterministic
- Same pool+same day = same IDs; next day = different
- SRS: answer correct twice → interval 2d → 4d
- Streak bumps only once per date (global, cross-lab)
- Miss 1 day (gap≥2) → streak reset về 1 on next lab open; SRS state per-Q nguyên vẹn

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Qid collision across labs | Low | Med | Namespace by labId in storage (already done) |
| PRNG non-determinism cross-browser | Low | High | mulberry32 is pure int math, test Chrome+Firefox |
| Selector returns <20 on tiny pool | Med | Med | Fill step 10 + warn if pool<20 |
| Existing users lose progress | High | Low | Old index-keyed answers ignored; log once "migrated" |

## Rollback
- Revert this file only. Phase 02-04 depend on it; if rolled back, labs still render via inline quiz path (phase 03 fallback).
