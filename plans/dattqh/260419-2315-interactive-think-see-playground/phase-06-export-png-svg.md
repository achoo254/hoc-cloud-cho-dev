# Phase 06 — PNG/SVG export

> **[RED TEAM #7] PNG CUT khỏi pilot** — Browser screenshot tool đã giải quyết, PNG export là gold plating zero-learning-value với nhiều edge cases (tainted canvas, Safari toBlob null, CSS vars không resolve, foreignObject bỏ trống, capture non-atomic). Pilot giữ **SVG export tùy chọn** (1 phase, có thể defer). Nếu cắt hoàn toàn → effort -0.5d, acceptance bỏ export criterion.

**Priority:** P3 | **Effort:** 0.3d (SVG-only, confirmed Validation V5) | **Status:** REDUCED | **Depends:** phase-03

## Goal
Export current diagram state (current frame) ra PNG hoặc SVG file. No watermark.

## Related files
- `app/src/components/lab/diagrams/export-button.tsx` — NEW button group
- `app/src/components/lab/diagrams/export-utils.ts` — NEW serialize/convert helpers

## Implementation steps
1. Wrap playground SVG trong `<svg ref={svgRef}>` để capture.
2. **SVG export**: `XMLSerializer` serialize `svgRef.current` → Blob (`type: 'image/svg+xml'`) → `URL.createObjectURL` → `<a download>`.
3. **PNG export**:
   - Serialize SVG → data URL.
   - Tạo offscreen `Image` → load → draw vào `<canvas>` (2x devicePixelRatio cho retina).
   - `canvas.toBlob('image/png')` → download.
4. Test với Framer Motion — khi animating, snapshot frame hiện tại (pause trước khi capture).
5. File name format: `<lab-slug>-frame-<idx>-<YYYYMMDD>.{png|svg}`.
6. Export button group ở góc phải top playground, 2 button: "SVG" + "PNG".

## Acceptance criteria
- Click SVG → file `.svg` download, mở được trong browser + inkscape.
- Click PNG → file `.png` download, dimensions đúng canvas size × 2.
- No CORS error với fonts (Google fonts or system fonts).
- Export khi paused hoặc playing đều work.

## Risks
- Web font không inline → dùng system font stack hoặc inline fallback.
- Safari `canvas.toBlob` đôi khi null → add polyfill check + error toast nếu fail.
- `foreignObject` trong SVG không render được trong canvas → tránh foreignObject, stick với `<text>` elements.

## [RED TEAM] Required changes

### #4 — SVG export MUST sanitize trước khi tạo Blob (CRITICAL XSS)
```ts
import DOMPurify from 'dompurify'

function exportSvg(svg: SVGSVGElement) {
  const raw = new XMLSerializer().serializeToString(svg)
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror'],
  })
  const blob = new Blob([clean], { type: 'image/svg+xml' })
  // ... download
}
```
Acceptance thêm: export SVG với hostile-payload fixture (`<text>javascript:alert(1)</text>` injected) → file mở trong browser không execute script.

### #7 — PNG export CUT. Nếu restore v2:
- Pre-capture: dispatch SEEK tới frameIdx với `transition: { duration: 0 }`, `await new Promise(r => requestAnimationFrame(r))` → serialize → draw.
- Inline computed styles (resolve CSS vars `hsl(var(--primary))` → actual hex).
- Strip `<image>` elements với external `href` trước serialize.
- Cap canvas size `Math.min(4096, viewport × DPR)` cho iOS Safari.
- Test trên Safari Tech Preview trước khi ship.
- Explicit error modal (không toast) khi `toBlob` null.
