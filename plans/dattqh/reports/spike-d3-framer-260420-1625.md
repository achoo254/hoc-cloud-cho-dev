# Spike Report — D3 × Framer Motion Integration

**Date:** 2026-04-20
**Phase:** 00
**Decision:** ✅ GO

## Versions Pinned

| Package | Version |
|---------|---------|
| framer-motion | 11.18.2 (pre-existing) |
| d3-scale | 4.0.2 |
| d3-shape | 3.2.0 |
| @types/d3-scale | 4.0.9 |
| @types/d3-shape | 3.1.8 |

## Bundle Impact

| Chunk | Raw Size | Gzip Size |
|-------|----------|-----------|
| framer-motion (shared) | 112kb | 38kb |
| spike-playground (includes d3-scale/shape) | 3.8kb | 1.7kb |
| **Total new deps** | ~116kb | **~40kb** |

**Target:** < 60kb gzip → **PASS** ✅

## Integration Findings

### What Works
1. **D3 as pure math** — `scaleLinear().domain([0,2]).range([80,520])` outputs numbers, no DOM touch
2. **Framer Motion SVG** — `<motion.circle>` animates `cx`/`cy` props smoothly
3. **No conflict** — D3 computes positions, Framer handles all DOM mutations
4. **HMR stable** — Vite hot reload preserves component state
5. **TypeScript** — Full type coverage with @types packages

### Minor Issue (non-blocking)
- `onAnimationComplete` may not fire when animating to same position (packet at Client → animate to Client = no movement)
- Fix: Add initial offset or use `useEffect` timer for first frame advancement
- This is implementation detail for phase-03, not a D3×Framer integration issue

## Spike POC Location

- Component: `app/src/components/lab/diagrams/spike-poc.tsx`
- Route: `app/src/routes/spike-playground.tsx` → `/dev/spike`
- **Delete after phase-01 complete**

## Decision Rationale

| Criterion | Result | Notes |
|-----------|--------|-------|
| D3 + Framer no conflict | ✅ | Strict separation: D3=math, Framer=DOM |
| Bundle < 60kb gzip | ✅ | 40kb total, well under limit |
| HMR stable | ✅ | No hard reset on save |
| TypeScript clean | ✅ | No type errors |

**Conclusion:** Proceed with Phase 01. D3 scale utilities provide flexibility for future layout complexity while Framer Motion handles all animation. ESLint rule (phase-07) will enforce separation.

## Alternative Considered

- **Drop D3 entirely, use arithmetic** — Viable for simple layouts (`x = (width / (n-1)) * i`), but D3 scales provide `nice()`, `ticks()`, `invert()` for future interactive features (scrubber ↔ position mapping). Keep D3-scale for flexibility.
