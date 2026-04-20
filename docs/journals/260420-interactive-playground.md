# Interactive THINK/SEE Playground — Implementation Complete

**Date**: 2026-04-20 16:53
**Severity**: Low
**Component**: `app/src/components/lab/diagrams/`
**Status**: Resolved

## What Happened

Shipped the Interactive THINK/SEE Playground in commit `df2a08b` — 31 files, 1493 lines across 6 phases
(phase-00 to phase-07, with 04 and 05 deferred to v2). The feature gates behind
`VITE_ENABLE_DIAGRAM_PLAYGROUND` and attaches to the `tcp-ip-packet-journey` lab via a new
`DiagramSchema` field in `schema-lab.ts`.

Two interactive sections delivered:
- **THINK** — `layer-stack-encap.tsx`: 4-layer TCP/IP stack, click-to-advance encapsulation demo
- **SEE** — `packet-journey.tsx`: timeline scrubber, 4 devices, keyboard navigation

## The Brutal Truth

The scope creep from phase-04 (PNG export) and phase-05 (accessibility audit) nearly sank the
timeline. We cut PNG export after RED TEAM review flagged `html2canvas` security and cross-origin
canvas taint issues — that should have been caught in the spike, not after two phases were already
written. The hardcoded 8-frame approach in `frame-mapper.ts` is a known short-term hack; dynamic
keyword detection was scoped out for velocity and will rot if anyone adds a 9th frame without
reading the comments.

## Technical Details

Key architecture choices baked into production:

- `registry.ts` — `React.lazy` per diagram component, keyed by `diagramType` string from fixture
- D3 used for math only (`d3-scale`, `d3-shape`), never for DOM — Framer Motion owns all animation
- SVG export: `new XMLSerializer().serializeToString(svgEl)` + `DOMPurify.sanitize()`, then
  `URL.createObjectURL(blob)`. Safari bug required a `setTimeout(revokeObjectURL, 100)` — without
  it, the blob URL is revoked before Safari finishes the download
- `use-reduced-motion.ts`: SSR hydration fix — initial state reads `window.matchMedia` only on
  client; server always returns `false` to avoid hydration mismatch
- Responsive: pure CSS `md:block` / `md:hidden`, no `useMediaQuery` hook — keeps bundle clean
- Error boundary in `playground-error-boundary.tsx` logs all errors to console, not just
  `ChunkLoadError` (original spike only caught chunk failures, silently swallowed render crashes)
- Keyboard handler guards against `INPUT`, `TEXTAREA`, `SELECT`, `BUTTON` to avoid hijacking form
  interactions — the original guard only checked `INPUT`

## What We Tried

- **Drag-to-encapsulate** for THINK section — discarded. Drag state on a scrollable mobile page
  fights the browser's scroll gesture. Click-to-advance is dumber but it works everywhere.
- **Dynamic frame detection** from lab keywords — scrapped. The keyword list is unstable and the
  mapping logic would have needed its own test suite. Hardcoded 8 frames in `frame-mapper.ts` ships
  now; refactor when there is actual demand.
- **PNG export via `html2canvas`** (phase-04) — cut after RED TEAM flagged cross-origin canvas
  taint and the `willReadFrequently` performance warning. SVG-only export is safe and sufficient.

## Root Cause Analysis

Phase-04 and phase-05 were planned before the RED TEAM security review ran. The spike (phase-00)
validated D3 + Framer motion but never stress-tested the export pipeline. Two full phase documents
were written for work that got cut. The lesson is that any phase touching browser security
(canvas, blob, CSP) needs a throwaway PoC before it earns a phase file.

## Lessons Learned

1. **Run a security spike before writing export phases.** `html2canvas` failure was predictable from
   the MDN canvas taint docs. We just did not check until code review.
2. **Safari blob URL timing is not a bug you discover in Chrome DevTools.** Test export on Safari
   early or add the `setTimeout` preemptively — it costs nothing.
3. **Hardcoded data structures need a fat comment with a "when to refactor" trigger.** `frame-mapper.ts`
   line 1 should say "refactor when frame count exceeds 8 or becomes data-driven."
4. **Error boundaries that only catch one error class are worse than useless** — they give false
   confidence that errors are handled while silently swallowing render panics.

## Next Steps

- [ ] `frame-mapper.ts` — add explicit comment flagging hardcoded frame limit (owner: next dev who
  touches it)
- [ ] Phase-04 PNG export — revisit in v2 using `canvg` (pure SVG-to-canvas, no cross-origin risk)
- [ ] Phase-05 accessibility audit — screen-reader pass on timeline scrubber before v2 launch
- [ ] Add `VITE_ENABLE_DIAGRAM_PLAYGROUND=true` to staging `.env.example` so it does not stay
  dark on staging forever
