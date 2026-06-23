# Codebase Summary

Monorepo: Vite + React 18 SPA (`app/`) + Hono.js API (`server/`). Production: https://hoc-cloud.inetdev.io.vn/

## Top-level

```
hoc-cloud-cho-dev/
├── app/                  # Vite + React SPA (TypeScript, Tailwind)
├── server/               # Hono.js API (Node 22+)
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
│   │   ├── lab-renderer.tsx         # THINK/SEE/TRY IT top-level renderer
│   │   ├── misconceptions-section.tsx  # Renders misconceptions[] above TL;DR on THINK tab
│   │   ├── shared/                  # Shared lab UI components
│   │   │   └── packet-decoder/      # 3-panel PCAP viewer (summary list / layer tree / hex view)
│   │   │       ├── packet-decoder.tsx       # Root component
│   │   │       ├── pcap-parser.ts           # Vanilla client-side PCAP parser (DataView + TextDecoder, max 5MB / 200 packets)
│   │   │       └── ...                      # Panel sub-components
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
│   ├── sm2.ts              # SM-2 spaced-repetition algorithm
│   └── hooks/
│       ├── use-media-query.ts   # useMediaQuery + useIsDesktop
│       └── ...                  # other hooks
└── hooks/                  # useLabsIndex (React Query) + others
```

## Server (`server/`)

```
server/
├── server.js               # Hono app entry, middleware chain
├── api/
│   ├── labs-routes.js      # GET /api/labs, GET /api/labs/:slug (MongoDB)
│   ├── exercises-routes.js # GET /api/exercises, GET /api/exercises/:slug (MongoDB, public)
│   ├── search-routes.js    # GET /api/search (Meilisearch + <mark> highlights, labs + exercises)
│   ├── progress-routes.js  # GET/POST /api/progress, POST /api/progress/touch, POST /api/progress/migrate
│   └── leaderboard-routes.js  # GET /api/leaderboard
├── auth/
│   ├── firebase-admin.js   # firebase-admin SDK init (service account)
│   ├── firebase-auth.js    # POST /auth/firebase/session, POST /auth/logout
│   └── session-middleware.js  # HttpOnly cookie verification
├── db/
│   ├── models/
│   │   ├── lab-model.js       # Lab schema + Meili post-save hook
│   │   ├── exercise-model.js  # Exercise schema (independent)
│   │   ├── user-model.js
│   │   ├── progress-model.js
│   │   ├── session-model.js
│   │   ├── migration-batch-model.js  # Guest→authed progress merge idempotency
│   │   └── index.js
│   └── migrations/  # MongoDB migrations (not SQL)
├── scripts/
│   ├── update-lab-tcpdump.js
│   ├── seed-victorialogs-lab.js
│   ├── migrate-linux-labs-to-exercises.js
│   └── sync-meili-index.js  # Bulk re-sync MongoDB → Meilisearch
├── lib/
│   ├── csp-middleware.js   # Content Security Policy
│   ├── anon-uuid-cookie.js # Guest tracking
│   └── ...
└── ecosystem.config.cjs    # PM2 config (fork mode, NODE_ENV=production)
```

## Data Flow

```
MongoDB (labs collection) ──┬──→  Hono API (/api/labs*)  ──→  FE (React Query)
                            │
Meilisearch (search index) ─┘  (tự sync qua Mongoose post-save hooks)
```

MongoDB = single source of truth cho lab content. Meilisearch được sync tự động từ Mongoose post-save/findOneAndUpdate/delete hooks (`server/db/models/lab-model.js`). FE không bundle lab content — đọc runtime qua API.

Field `misconceptions[]` (shape `{wrong, right, why}`) lưu trong MongoDB, trả về qua `/api/labs/:slug`, validate qua Zod schema (`app/src/lib/schema-lab.ts`), render bởi `MisconceptionsSection` component phía trên TL;DR trên tab THINK.

Field `tldr[].why` và `walkthrough[].why` hỗ trợ HTML inline link — render qua `dangerouslySetInnerHTML` (author-controlled content từ MongoDB).

## Key Patterns

### Diagram Registry
`app/src/components/lab/diagrams/registry.ts` maps fixture `diagram.component` string → lazy React component. Unknown keys = safe no-op (console.warn). Registered playgrounds:
- **VictoriaLogsPlayground** (`victorialogs-playground.tsx`): 3-mode observability — architecture flow (animated SVG, clickable single/cluster toggle), LogsQL mini-evaluator, pipeline stepper (5 steps ingest→stored→queried)
- **DhcpPlayground**: DORA 4-bước visualizer + 2 sample pcap (conflict scenarios A/B)
- **HttpPlayground**: 51 scenarios (auth, redirect, POST, streaming, etc.)
- **IcmpPingPlayground**, **ArpPlayground**, **DnsPlayground**, **TcpUdpPlayground**, **SubnetCidrPlayground**, **TcpIpPacketJourneyPlayground**

### Feature Flag
`VITE_ENABLE_DIAGRAM_PLAYGROUND` (build-time) + `?textMode=1` (runtime) — disable playground, fall back to text.

### SVG Export
`export-utils.ts::exportSvg()` sanitizes via DOMPurify (`svg` + `svgFilters` profiles; blocks `script`/`foreignObject`/inline event handlers) before download.

### Exercises System
Independent collection (`exercises` in MongoDB, separate from labs). Each exercise: **Đề bài (brief) → Hướng dẫn (guide) + ảnh/video → Demo thực tế (demo screenshots)**. No quiz/flashcards/SM-2/Meili. Public (no auth gate). 3 Linux exercises: `syslog`, `linux-boot-process`, `linux-swap` moved from labs (2026-06-02/03). API: `GET /api/exercises` (catalog), `GET /api/exercises/:slug` (full content). FE: `/exercises` route + `/exercise/:slug` renderer. Model: `server/db/models/exercise-model.js`. Routes: `server/api/exercises-routes.js`.

### Auth Flow
1. Client signs in with Google via Firebase Auth
2. Client exchanges ID token → `POST /auth/firebase/session` → server sets HttpOnly cookie
3. `session-middleware` verifies cookie on API calls, attaches `user` to context
4. Guest users tracked by anonymous UUID cookie (progress still persists)
5. On authed login, `POST /api/progress/migrate` merges guest progress → user bucket (idempotent via `migration-batch-model.js`)

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
