# Phase 04 — UX: Streak Badge, Due Count, Difficulty Indicator, Reset

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends: [phase-01](./phase-01-schema-srs-engine.md), [phase-03](./phase-03-migrate-inline-quiz.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 2h
- **Blockers:** 01, 03

## Requirements
1. **Streak badge** (GLOBAL, cross-lab, top of quiz section): "🔥 Streak: 5 ngày" — đọc từ `quiz:global:streakDays`, hiển thị giống nhau trên mọi lab
2. **Due-count badge** per quiz: "8 câu cần ôn · 4 câu yếu · 8 câu mới"
3. **Difficulty indicator** trên mỗi câu: dot hoặc label `easy|medium|hard`
4. **Reset — 2 dạng**:
   - **(a) Manual UI button**: "⟲ Reset tiến độ quiz lab này"
     - Confirm dialog trước wipe
     - Clears `quiz:{labId}`, `quiz:{labId}:srs`, `quiz:{labId}:daily` (prefix `lab:`)
     - KHÔNG đụng tới `quiz:global:*` (streak giữ nguyên)
   - **(b) Auto daily miss-reset**: triggered in Phase 01 `checkAndBumpStreak()` tại lab open
     - Gap ≥ 2 ngày giữa `lastActiveDate` và today → `streakDays = 1` (today counts)
     - UI-side: sau khi streak reset, badge hiển thị "🔥 Streak: 1 ngày" (hoặc toast "Streak đã reset vì miss 1 ngày")
     - SRS per-Q KHÔNG đụng tới
5. **Today's date label**: "Quiz ngày {DD/MM/YYYY}" — user biết bộ câu đổi mỗi ngày

## Architecture

### DOM additions (renderQuiz top banner)
```
<div class="quiz-header">
  <div class="quiz-date">Quiz ngày 19/04/2026</div>
  <div class="quiz-streak">🔥 Streak: 5 ngày</div>
  <div class="quiz-mix">8 due · 4 yếu · 8 mới</div>
</div>
...
<div class="quiz-actions">
  <button class="btn btn-reset-quiz">⟲ Reset tiến độ</button>
</div>
```

### Per-question difficulty chip
```html
<div class="quiz-q">
  <span class="diff-chip diff-{easy|medium|hard}">{tier}</span>
  Q{n}. {text}
</div>
```

### Reset logic — (a) manual per-lab
```js
function resetQuizProgress(labId) {
  if (!confirm('Xóa toàn bộ tiến độ quiz lab này? (Streak global KHÔNG bị xóa)')) return;
  ['quiz:'+labId, 'quiz:'+labId+':srs', 'quiz:'+labId+':daily']
    .forEach(k => localStorage.removeItem(STORAGE_PREFIX + k));
  location.reload();
}
```

### Reset logic — (b) auto miss-day
Handled in Phase 01 `checkAndBumpStreak()` (called at `LabTemplate.init()`). UI chỉ đọc kết quả:
```js
const streakBefore = +(localStorage.getItem(STORAGE_PREFIX + 'quiz:global:streakDays') || 0);
const streakAfter = checkAndBumpStreak();
if (streakBefore > 1 && streakAfter === 1) {
  // show toast: "Streak đã reset — hãy giữ thói quen hôm nay"
}
```

### CSS additions (`lab-template.css`)
```
.quiz-header { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
.quiz-streak, .quiz-mix, .quiz-date { padding:4px 10px; border-radius:4px; background:var(--bg-input); font-family:var(--mono); font-size:12px; }
.diff-chip { display:inline-block; padding:2px 8px; border-radius:3px; font-size:11px; margin-right:8px; }
.diff-easy { background:var(--green-dim); color:var(--green); }
.diff-medium { background:var(--accent-dim); color:var(--accent); }
.diff-hard { background:rgba(255,80,80,0.15); color:#ff7070; }
.btn-reset-quiz { opacity:0.6; }
.btn-reset-quiz:hover { opacity:1; }
```

## Related Code Files
- `labs/_shared/lab-template.js` — renderQuiz (add header + chips + reset)
- `labs/_shared/lab-template.css` — add chip/header styles

## Implementation Steps
1. Compute mix counts in selector, return `{picks, meta:{due,weak,new}}`
2. renderQuiz: build header with date + streak + mix badges
3. renderQuiz: add diff-chip span to each `quiz-q`
4. Add reset button + confirm + reload
5. Add CSS rules
6. Manual QA: check all 3 streak tiers (manipulate `lab:quiz:streak` via DevTools)

## Todo List
- [ ] Selector returns meta counts
- [ ] renderQuiz header banner
- [ ] Difficulty chip per Q
- [ ] Reset button + handler
- [ ] CSS rules
- [ ] QA: day 1, day 5, day 10 simulated

## Success Criteria
- Badge shows correct streak day (cùng giá trị khi chuyển giữa labs)
- Mix counts match actual 20 picked
- Manual reset wipes only this lab's quiz keys (other labs + flashcards + global streak intact)
- Auto miss-day reset: simulate lastActiveDate = today-2 → open lab → streak = 1, SRS state still intact
- Difficulty chip colored correctly per Q

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Reset wipes flashcards/global streak by accident | Low | High | Only delete `quiz:{labId}*` prefix; NEVER touch `quiz:global:*` hay flashcard keys — test explicitly |
| Auto-reset confuse user (streak về 1 không rõ lý do) | Med | Low | Toast nhẹ giải thích "miss 1 ngày" |
| Confirm dialog blocked by browser | Low | Low | Fallback: inline `<dialog>` component if needed later |
| Streak count drift (timezone) | Med | Low | Use `YYYYMMDD` from local Date, document behavior |

## Rollback
- Revert CSS + renderQuiz changes. Core selector/SRS logic intact.
