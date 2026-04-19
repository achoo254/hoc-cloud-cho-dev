# Phase 03 — Migrate Inline Quiz to Bank Loader

## Context Links
- Plan: [../plan.md](./plan.md)
- Depends: [phase-01](./phase-01-schema-srs-engine.md), [phase-02](./phase-02-generate-quiz-banks.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Blockers:** 01 (renderQuiz rewrite), 02 (banks exist)

## Requirements
1. `lab-template.js` init: async load `labs/_shared/quiz-bank/{labId}.json`
2. On fetch success → pass pool to renderQuiz
3. On fetch fail (404) → fallback to `data.quiz` inline (backward compat)
4. Inline `data.quiz` in 8 HTMLs stays unchanged (serves as fallback)
5. Feature flag `USE_QUIZ_BANK` default `true`; can disable quick

## Architecture

### Load Order
```
init() {
  const bankPromise = USE_QUIZ_BANK ? fetchBank(labId) : null;
  ...mount tldr/walkthrough synchronously...
  const pool = (await bankPromise) || data.quiz;
  mount('mount-quiz', renderQuiz, pool);
}
```

### fetchBank
```js
async function fetchBank(labId) {
  try {
    const res = await fetch(`../_shared/quiz-bank/${labId}.json`);
    if (!res.ok) return null;
    const pool = await res.json();
    if (!Array.isArray(pool) || pool.length < 20) {
      console.warn(`[lab:${labId}] bank too small (${pool?.length}), fallback inline`);
      return null;
    }
    return pool;
  } catch { return null; }
}
```

### Normalize Inline Fallback
Inline `data.quiz` không có `id`/`difficulty`/`tags` → gán on-the-fly:
```js
function normalizePool(pool, labId) {
  return pool.map((q, i) => ({
    id: q.id || `${labId}-inline-${i}`,
    difficulty: q.difficulty || 'medium',
    tags: q.tags || [],
    ...q,
  }));
}
```

If fallback pool < 20, selector returns whatever available (skip due/weak mix, just shuffle).

## Related Code Files
- `labs/_shared/lab-template.js:295-313` — init (modify mount-quiz to async)
- 8× `labs/01-networking/*.html` — no edit needed (inline stays as fallback)

## Implementation Steps
1. Add `USE_QUIZ_BANK = true` const top of lab-template.js
2. Add `fetchBank(labId)` + `normalizePool(pool, labId)` helpers
3. Modify `init()`: await bank, normalize, pass to renderQuiz
4. Test with 1 lab (net-01): with bank → 20 Qs from bank; rename bank file → fallback to inline 8 Qs
5. Adjust selector: if pool.length < 20, return `seededShuffle(pool)` directly
6. Verify all 8 labs render without console errors

## Todo List
- [ ] Feature flag + fetchBank
- [ ] normalizePool helper
- [ ] Modify init to await bank
- [ ] Guard selector for small pools
- [ ] Manual smoke test 8 labs
- [ ] Verify fallback by temp-renaming 1 bank

## Success Criteria
- Lab opens with bank → 20 Qs rendered
- Rename bank → inline 8 Qs render (no errors)
- `USE_QUIZ_BANK=false` → all labs fall back
- No network error in console on load

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CORS on file:// | High | High | README đã yêu cầu local server, keep that |
| Race: renderQuiz before pool loaded | Med | Med | await inside init — mount-quiz mounts last |
| Bank JSON corrupt | Low | Med | try/catch + fallback |
| Stale `:daily` cache after schema change | Med | Low | Bust cache if cached IDs not in current pool |

## Rollback
- Set `USE_QUIZ_BANK = false` — instant revert to inline behavior
