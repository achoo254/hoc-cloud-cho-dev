# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (both root and app)
npm install && npm install --prefix app

# Development (run both in parallel terminals)
npm run dev:server    # Hono API on :8387
npm run dev:app       # Vite on :5173 (proxies /api → :8387)

# Type checking
npm run typecheck --prefix app

# Build
npm run build --prefix app   # FE → app/dist/
npm run build:server         # BE → dist-server/server.bundle.js

# Validate lab fixtures against schema
node scripts/validate-lab-fixtures.js

# Regenerate content modules from fixtures
npm run gen:content

# Sync labs to SQLite DB
npm run sync-labs
```

## Architecture

Monorepo with Vite+React SPA (`app/`) and Hono.js API server (`server/`).

### Data Flow

```
fixtures/labs/*.json  ─→  npm run gen:content  ─→  app/src/generated/
                                               ─→  content/*.ts
                     ─→  npm run sync-labs    ─→  data/hoccloud.db (SQLite + FTS5)
```

Lab JSON fixtures are the source of truth. Generated TypeScript modules and SQLite tables are derived.

### Frontend Structure

- `app/src/components/lab/lab-renderer.tsx` — Top-level renderer using THINK/SEE/SHIP phase pattern
- `app/src/components/lab/diagrams/registry.ts` — Maps `diagram.component` fixture keys to lazy-loaded React components
- `app/src/lib/schema-lab.ts` — Zod schema for lab content validation (v3)

### Adding a New Lab

1. Create fixture JSON in `fixtures/labs/` (see `docs/lab-schema-v3.md`)
2. Validate: `node scripts/validate-lab-fixtures.js`
3. Generate: `npm run gen:content`
4. Sync DB: `npm run sync-labs`
5. If interactive playground needed: create component in `app/src/components/lab/diagrams/`, register in `registry.ts`

### Adding a New Playground

1. Create `{name}-playground.tsx` in `app/src/components/lab/diagrams/`
2. Export named component matching registry entry
3. Register in `registry.ts` with lazy import
4. Set `diagram.component` in fixture JSON to registry key

## Key Patterns

### D3 vs Framer Motion Separation

D3 is math only. Framer Motion owns all DOM/SVG animation.

```ts
// D3: pure math
const xScale = scaleLinear().domain([0, n]).range([0, width])

// Framer Motion: owns the DOM
<motion.circle cx={xScale(idx)} />
```

Never use `d3.select()` or direct DOM mutation — conflicts with React reconciler.

### Lab Renderer Phases

- **THINK**: TL;DR table (desktop shows interactive playground)
- **SEE**: Walkthrough steps (desktop shows interactive playground)
- **SHIP**: Quiz, flashcards, try-at-home commands

Desktop/mobile switch is CSS-only (`hidden md:block`).

### SVG Export

Use `export-utils.ts::exportSvg()` — sanitizes via DOMPurify before download. Never bypass.

### Error Boundaries

Wrap lazy-loaded diagram components in `PlaygroundErrorBoundary`. Never let playground errors break lab rendering.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/search?q=` | FTS5 full-text search |
| GET | `/api/progress` | User progress by cookie |
| POST | `/api/progress` | Upsert progress |
| GET | `/sse/reload` | Dev live-reload SSE |
