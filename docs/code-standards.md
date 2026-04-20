# Code Standards

## General

- TypeScript strict mode. No `any` without explicit justification.
- File size limit: 200 LOC. Split by concern when exceeded.
- File naming: kebab-case, descriptive enough to understand purpose without reading content.

## Component Architecture

### Lab Renderer (THINK / SEE / SHIP)

`lab-renderer.tsx` renders lab content in three phases:

- **THINK**: TL;DR table (or interactive playground on desktop)
- **SEE**: Walkthrough steps (or interactive playground on desktop)
- **SHIP**: Quiz, flashcards, try-at-home commands

Desktop shows interactive playground via CSS-only switch (`hidden md:block` / `md:hidden`). Mobile always falls back to text.

### Diagram Components

All interactive diagram components live under `src/components/lab/diagrams/`. Register new components in `registry.ts` — do not import them directly in `lab-renderer.tsx`.

## D3 vs Framer Motion Separation Rule

**D3 is for math only. Framer Motion owns all DOM/SVG animation.**

| Library | Allowed usage | Forbidden usage |
|---|---|---|
| `d3-scale`, `d3-shape` | `scaleLinear()`, path generators, layout math | `select()`, direct DOM mutation, `.attr()`, `.style()` |
| `framer-motion` | `<motion.*>` components, `useAnimation`, `AnimatePresence` | Manually calculating positions/scales |

Rationale: D3's DOM manipulation conflicts with React's virtual DOM reconciler. Use D3 to compute coordinates/paths, pass results as props to `motion.*` elements.

Example from `spike-poc.tsx`:
```ts
// D3: pure math, no DOM touch
const xScale = useMemo(
  () => scaleLinear().domain([0, DEVICES.length - 1]).range([80, CANVAS_WIDTH - 80]),
  []
)

// Framer Motion: owns the DOM element
<motion.circle cx={xScale(idx)} ... />
```

## SVG Export

Use `export-utils.ts::exportSvg()` — never bypass DOMPurify sanitization.

Forbidden profiles: `script`, `foreignObject` tags and inline event attributes (`onload`, `onclick`, `onerror`, `onmouseover`) are always stripped.

## Error Handling

Wrap all lazy-loaded diagram components in `PlaygroundErrorBoundary` with a text fallback. Never let playground errors break the full lab renderer.

## Content Schema

Lab content is validated against Zod schema in `src/lib/schema-lab.ts` (v3). The `diagram.type === 'custom'` + `diagram.component` field drives playground routing via `diagramRegistry`.
