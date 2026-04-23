# Codebase Summary

Monorepo: Vite + React 18 SPA (`app/`) + Hono.js API (`server/`). Production: https://hoc-cloud.inetdev.io.vn/

## Top-level

```
hoc-cloud-cho-dev/
├── app/                  # Vite + React SPA (TypeScript, Tailwind)
├── server/               # Hono.js API (Node 22+)
├── fixtures/labs/        # Lab JSON — source of truth (schema v3, sync vào MongoDB)
├── scripts/              # Build scripts (schema validate, bundler)
├── deploy/               # nginx.conf.example, ecosystem.config
└── docs/                 # Project documentation
```

## App (`app/src/`)

```
app/src/
├── App.tsx                 # React Router v7 root (lazy-loaded routes)
├── routes/                 # index, lab-viewer, search, dev/*, not-found
├── components/
│   ├── lab/                # Lab content rendering
│   │   ├── lab-renderer.tsx         # THINK/SEE/SHIP top-level renderer
│   │   ├── diagrams/                # Interactive playground components
│   │   │   ├── registry.ts          # Lazy-loaded diagram registry
│   │   │   ├── export-utils.ts      # SVG export + DOMPurify
│   │   │   ├── playground-error-boundary.tsx
│   │   │   └── *-playground.tsx     # Per-lab playgrounds
│   │   ├── quiz-block.tsx
│   │   ├── flashcard-sm2.tsx
│   │   └── code-block.tsx           # Shiki syntax highlighting
│   ├── dashboard/          # Guest/authed dashboard sections
│   │   ├── dashboard-layout.tsx
│   │   ├── guest-dashboard-layout.tsx
│   │   ├── stats-section.tsx / stat-tile.tsx
│   │   ├── heatmap-grid.tsx         # GitHub-style activity heatmap
│   │   ├── leaderboard-section.tsx
│   │   ├── due-section.tsx          # Spaced-repetition queue
│   │   ├── roadmap-section.tsx
│   │   └── progress-preview-card.tsx
│   ├── layout/             # RootLayout, header, nav
│   └── ui/                 # shadcn/Radix primitives
├── contexts/
│   └── auth-context.tsx    # Firebase Auth state provider
├── lib/
│   ├── firebase.ts         # Firebase client init (VITE_FIREBASE_CONFIG)
│   ├── api.ts              # Fetch helpers: getLabsIndex, getLabContent, search
│   ├── schema-lab.ts       # Zod schema v3
│   └── sm2.ts              # SM-2 spaced-repetition algorithm
└── hooks/                  # useLabsIndex (React Query) + others
```

## Server (`server/`)

```
server/
├── server.js               # Hono app entry, middleware chain
├── api/
│   ├── labs-routes.js      # GET /api/labs, GET /api/labs/:slug (MongoDB)
│   ├── search-routes.js    # GET /api/search (Meilisearch + <mark> highlights)
│   ├── progress-routes.js  # GET/POST /api/progress
│   └── leaderboard-routes.js
├── auth/
│   ├── firebase-admin.js   # firebase-admin SDK init (service account)
│   ├── firebase-auth.js    # POST /auth/session, /auth/logout
│   └── session-middleware.js  # HttpOnly cookie verification
├── db/
│   └── mongoose-models/    # MongoDB models (labs, progress, users)
├── lib/
│   └── csp-middleware.js   # Content Security Policy
├── scripts/
│   └── sync-labs-to-db.js  # Fixture → MongoDB + Meilisearch sync
└── ecosystem.config.cjs    # PM2 config (fork mode)
```

## Data Flow

```
fixtures/labs/*.json
  └─→ pnpm run sync-labs → MongoDB (labs collection) + Meilisearch (search index)
```

Lab JSON = source of truth. MongoDB documents + Meilisearch index = derived artifacts. FE đọc runtime qua `/api/labs` + `/api/labs/:slug` (React Query cache).

## Key Patterns

### Diagram Registry
`app/src/components/lab/diagrams/registry.ts` maps fixture `diagram.component` string → lazy React component. Unknown keys = safe no-op (console.warn).

### Feature Flag
`VITE_ENABLE_DIAGRAM_PLAYGROUND` (build-time) + `?textMode=1` (runtime) — disable playground, fall back to text.

### SVG Export
`export-utils.ts::exportSvg()` sanitizes via DOMPurify (`svg` + `svgFilters` profiles; blocks `script`/`foreignObject`/inline event handlers) before download.

### Auth Flow
1. Client signs in with Google via Firebase Auth
2. Client exchanges ID token → `POST /auth/session` → server sets HttpOnly cookie
3. `session-middleware` verifies cookie on API calls, attaches `user` to context
4. Guest users tracked by anonymous UUID cookie (progress still persists)

## Dependencies (selected)

| Package | Purpose |
|---|---|
| `hono` + `@hono/node-server` | HTTP framework |
| `mongoose` | MongoDB ODM |
| `meilisearch` | Full-text search client |
| `firebase-admin` / `firebase` | Server-side + client-side auth |
| `framer-motion` | All DOM/SVG animation |
| `d3-scale`, `d3-shape` | Math only (no DOM touch) |
| `dompurify` | SVG export sanitization |
| `@tanstack/react-query` | Data fetching + caching (labs index, lab content) |
| `zod` | Runtime schema validation |
| `shiki` | Code syntax highlighting |
