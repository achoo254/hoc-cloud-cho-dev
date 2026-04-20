# SVG Export: White Text on White Background

**Date**: 2026-04-20 17:37
**Severity**: Medium
**Component**: `src/components/lab/diagrams/export-utils.ts`
**Status**: Resolved

## What Happened

Exported SVGs from the THINK/SEE Playground were rendering invisible text. Dark theme used white text via Tailwind classes — classes that mean nothing outside the browser's computed style context. Strip the DOM, lose the color.

## The Brutal Truth

We shipped an export feature without ever opening the output file in a blank browser tab. That's the whole test. We didn't do it. The fix was obvious in hindsight: SVGs are dumb documents, not styled components.

## Technical Details

- Root cause: `fill: white` lives in Tailwind utility classes; standalone SVG has no stylesheet
- SVG has no `background-color` property — `<rect fill="rgb(9,9,11)">` must be injected as first child
- Fix: `inlineComputedStyles()` calls `getComputedStyle()` per element and writes `fill`, `stroke`, `font-*` as inline attributes; background `<rect>` hardcoded to `rgb(9, 9, 11)`

## Lessons Learned

- Always open exported files in isolation before calling a feature done
- SVG export = snapshot, not live DOM — every style must travel with the file
- `getComputedStyle()` is the correct escape hatch for Tailwind-in-SVG problems

## Next Steps

- [ ] Add visual smoke test for SVG export output (open in `<img>` tag, check non-white pixel presence)
- [ ] Audit PNG export path for the same class-stripping issue
