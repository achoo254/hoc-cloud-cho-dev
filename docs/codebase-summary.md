# Codebase Summary

App: `hoc-cloud-app` — Vite + React 18 SPA, TypeScript, TailwindCSS.

## Directory Structure

```
app/
├── src/
│   ├── components/
│   │   ├── lab/               # Lab content rendering
│   │   │   ├── diagrams/      # Interactive playground components
│   │   │   │   ├── registry.ts               # Diagram component registry
│   │   │   │   ├── tcp-ip-journey-playground.tsx
│   │   │   │   ├── layer-stack-encap.tsx
│   │   │   │   ├── packet-journey.tsx
│   │   │   │   ├── export-utils.ts            # SVG export + DOMPurify sanitization
│   │   │   │   ├── export-button.tsx
│   │   │   │   ├── playground-error-boundary.tsx
│   │   │   │   └── frame-mapper.ts
│   │   │   ├── lab-renderer.tsx   # Top-level THINK/SEE/SHIP renderer
│   │   │   ├── quiz-block.tsx
│   │   │   ├── flashcard-sm2.tsx
│   │   │   ├── code-block.tsx
│   │   │   └── progress-bar.tsx
│   │   └── ui/                # Shadcn/Radix UI primitives
│   ├── lib/
│   │   ├── schema-lab.ts      # Zod schema for lab content (v3)
│   │   ├── hooks/
│   │   ├── search-client.ts
│   │   └── sm2.ts             # Spaced-repetition algorithm
│   ├── routes/
│   └── fixtures/              # Generated static lab content
└── package.json
```

## Key Patterns

### Diagram Registry

`src/components/lab/diagrams/registry.ts` maps fixture `diagram.component` string keys to lazy-loaded React components.

```ts
export const diagramRegistry = {
  TcpIpJourneyPlayground: lazy(() => import('./tcp-ip-journey-playground')...),
} satisfies Record<string, React.LazyExoticComponent<DiagramComponent>>

export type DiagramRegistryKey = keyof typeof diagramRegistry
```

- Add new interactive diagrams by registering them here — consumer (`lab-renderer.tsx`) resolves by key automatically.
- Unknown keys log a `console.warn` and render nothing (safe no-op).

### Feature Flag: Interactive Playground

`VITE_ENABLE_DIAGRAM_PLAYGROUND` controls whether the playground renders. Defaults to enabled (only set to `'false'` to disable). See [deployment-guide.md](./deployment-guide.md).

### SVG Export

`export-utils.ts::exportSvg()` serializes SVG, sanitizes via DOMPurify (`svg` + `svgFilters` profiles, blocks `script`/`foreignObject` tags and inline event attributes), then triggers browser download.

## Dependencies (selected)

| Package | Purpose |
|---|---|
| `framer-motion` | DOM animations in diagram components |
| `d3-scale`, `d3-shape` | Math calculations only (no DOM manipulation) |
| `dompurify` | SVG export sanitization |
| `@tanstack/react-query` | Data fetching |
| `minisearch` | Client-side full-text search |
| `zod` | Runtime schema validation |
