# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm@10.30.3** (pinned via `packageManager` field). Root + `app/` are separate projects (NOT a pnpm workspace) — cần install riêng hai nơi. Lockfile chuẩn: `pnpm-lock.yaml` (KHÔNG dùng `package-lock.json`).

```bash
# Install dependencies (root + app are separate installs)
pnpm install && pnpm --dir app install

# Development (run both in parallel terminals)
pnpm run dev:server          # Hono API on :8387
pnpm --dir app run dev       # Vite on :5173 (proxies /api → :8387)

# Type checking
pnpm --dir app run typecheck

# Build
pnpm --dir app run build     # FE → app/dist/
pnpm run build:server        # BE → dist-server/server.bundle.js

```

## Architecture

Monorepo with Vite+React SPA (`app/`) and Hono.js API server (`server/`).

### Data Flow

```
MongoDB (Lab collection)  ─┐
                           ├─ Hono API (/api/labs, /api/labs/:slug, /api/search)  ─→  Frontend
Meilisearch (search idx)  ─┘
```

MongoDB là single source of truth cho lab content. System labs mặc định được tạo trực tiếp trong MongoDB (không còn fixtures pipeline, không còn seed từ repo). Meilisearch index được sync từ Mongoose post-save hooks (auto). Không có lab content nào bundle vào FE.

### Frontend Structure

- `app/src/components/lab/lab-renderer.tsx` — Top-level renderer using THINK/SEE/SHIP phase pattern
- `app/src/components/lab/diagrams/registry.ts` — Maps `diagram.component` fixture keys to lazy-loaded React components
- `app/src/lib/schema-lab.ts` — Zod schema for lab content validation (v3)

### Adding a New Lab

1. Tạo lab mới qua UI editor (khi Phase 1-4 xong) hoặc insert trực tiếp vào MongoDB (schema — xem `docs/lab-schema-v3.md`)
2. Meilisearch tự sync qua post-save hook của Mongoose (`server/db/models/lab-model.js`)
3. Nếu cần interactive playground: tạo component trong `app/src/components/lab/diagrams/`, register trong `registry.ts`

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
| GET | `/healthz` | Health + DB status (Mongo + Meilisearch) |
| GET | `/api/labs` | Lab catalog (index entries from MongoDB) |
| GET | `/api/labs/:slug` | Full lab content by slug |
| GET | `/api/search?q=` | Meilisearch full-text search |
| GET | `/api/progress` | User progress by cookie / auth |
| POST | `/api/progress` | Upsert progress |
| GET | `/sse/reload` | Dev live-reload SSE |
