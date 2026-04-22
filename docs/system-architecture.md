# System Architecture

Production: **https://hoc-cloud.inetdev.io.vn/**

## High-level Topology

```
┌────────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ Lab Renderer │  │  Dashboard   │  │  Firebase Auth SDK │    │
│  │ THINK/SEE/SHIP│  │  + Heatmap  │  │  (Google provider) │    │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘    │
│         │                 │                    │ ID token      │
└─────────┼─────────────────┼────────────────────┼───────────────┘
          │ /api/*          │ /api/progress      │ /auth/session
          ▼                 ▼                    ▼
┌────────────────────────────────────────────────────────────────┐
│               Nginx (VPS) — reverse proxy + static              │
│   · serve app/dist/ (SPA fallback)                              │
│   · proxy /api/*, /auth/*, /sse/* → 127.0.0.1:8387              │
└─────────────────────────────┬──────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                Hono.js (Node 22, PM2 cluster)                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ /api/   │ │ /auth/  │ │ /sse/    │ │ session-middleware │   │
│  │ search  │ │ session │ │ reload   │ │ (verify cookie)    │   │
│  │progress │ │ logout  │ │          │ │                    │   │
│  │leader.. │ │         │ │          │ │                    │   │
│  └────┬────┘ └────┬────┘ └──────────┘ └─────────┬──────────┘   │
│       │           │ firebase-admin              │               │
│       ▼           ▼ verifyIdToken               ▼               │
│  ┌─────────────────────┐          ┌──────────────────────────┐  │
│  │  MongoDB (mongoose) │          │   Firebase Auth (Google) │  │
│  │  + Meilisearch      │          │   (external IdP)         │  │
│  │  (full-text search) │          └──────────────────────────┘  │
│  └─────────────────────┘                                        │
└────────────────────────────────────────────────────────────────┘
```

## Content Pipeline

```
fixtures/labs/*.json   ── source of truth (schema v3, Zod-validated)
        │
        ├─── scripts/fixtures-to-ts.mjs ──→ content/*.ts
        ├─── scripts/generate-labs-index.mjs ──→ app/src/generated/labs-index.ts
        ├─── scripts/generate-search-index.mjs ──→ app/src/generated/search-index.json
        └─── server/scripts/sync-labs-to-db.js ──→ MongoDB (labs collection)
                                                    + Meilisearch (search index)
```

Lab JSON = single source of truth. TypeScript modules, search index, MongoDB documents = derived artifacts regenerated via `npm run gen:content` + `npm run sync-labs`.

## Request Flows

### 1. Anonymous visitor → Lab viewing

```
GET /lab/dns
  → Nginx → SPA index.html
  → React Router lazy-loads lab-viewer route
  → fetch /api/progress (sets anon UUID cookie if absent)
  → render THINK (playground + TL;DR) → SEE (walkthrough) → SHIP (quiz)
```

### 2. Google sign-in → Session cookie

```
Client: firebase.auth().signInWithPopup(GoogleProvider)
      → onAuthStateChanged fires → grab ID token
      → POST /auth/session { idToken }
Server: firebase-admin.verifyIdToken(idToken)
      → upsert user row (uid, email, displayName, photoURL)
      → set HttpOnly Secure SameSite=Lax session cookie (signed)
      → return { user }
Subsequent requests include cookie → session-middleware attaches ctx.user
```

### 3. Search

```
GET /api/search?q=subnet
  → search-routes.js
  → Meilisearch query (typo-tolerant, ranked)
  → return [{ slug, title, snippet_with_<mark>_highlights }]
```

Client fallback: MiniSearch on bundled `search-index.json` when API unreachable.

### 4. Progress & Leaderboard

```
POST /api/progress { lab_slug, opened_at?, completed_at?, quiz_score? }
  → INSERT OR REPLACE INTO progress (uuid or user_id, lab_slug, ...)
  → update user streak on completion

GET /api/leaderboard
  → aggregate completion_count + current_streak per authed user
  → top N by score
```

## Rendering Architecture

### Lab Renderer THINK/SEE/SHIP

| Phase | Desktop (`md:block`) | Mobile (`md:hidden`) |
|-------|---------------------|----------------------|
| THINK | Interactive playground | TL;DR table |
| SEE | Interactive playground | Walkthrough steps |
| SHIP | Quiz + flashcards + try-at-home commands (same on both) |

CSS-only switch — no JS-based device detection.

### D3 vs Framer Motion Separation

**D3** = math only (`scaleLinear`, path generators). **Framer Motion** owns all DOM/SVG. Never `d3.select()` — conflicts with React reconciler.

### Playground Registry

`app/src/components/lab/diagrams/registry.ts` maps fixture `diagram.component` strings to lazy-loaded components. Unknown keys = safe no-op + `console.warn`. Errors wrapped by `PlaygroundErrorBoundary` fallback to text mode.

### Feature Flag Strategy

- Build-time: `VITE_ENABLE_DIAGRAM_PLAYGROUND=false` → disable all playgrounds
- Runtime escape hatch: `?textMode=1` URL param → ép text mode
- Per-component: `PlaygroundErrorBoundary` → auto-fallback on runtime error

## Security Boundaries

| Layer | Mechanism |
|-------|-----------|
| Session | HttpOnly + Secure + SameSite=Lax signed cookie |
| SVG export | DOMPurify (`svg` + `svgFilters` profiles, block `script`/`foreignObject`/inline events) |
| CSP | `server/lib/csp-middleware.js` — strict default-src + nonce-based script |
| Auth token | Firebase ID token exchanged server-side, never stored client-side |
| CI secrets | `VITE_FIREBASE_CONFIG` + `FIREBASE_SERVICE_ACCOUNT_JSON` via GitHub Secrets |

## Progress State Machine

One `Progress` document per `(user, lab)`. Two buckets coexist: guest entries keyed by `userUuid` (anonymous cookie), authed entries keyed by `userId` (Mongo ObjectId). Login triggers a merge — see **Migration** below.

```
           touch / POST                quiz_score set                  completed_at set
unopened  ──────────────────▶  opened  ──────────────▶  quiz_attempted  ─────────────▶  completed
                                  │                                                       ▲
                                  └─────────────────── flashcard-mastered ────────────────┘
```

### Invariants

| Field              | Setter                          | Policy                                             |
|--------------------|---------------------------------|----------------------------------------------------|
| `openedAt`         | `$setOnInsert` on first touch   | Written once; never bumped — marks the true start. |
| `lastOpenedAt`     | `$set` on every `/touch` + POST | Always latest; powers recent-activity sort.        |
| `completedAt`      | `$min` when quiz-full or flash mastered | Earliest completion wins across races.     |
| `quizScore`        | `$set` (clamped 0–100)          | Last write wins; usually monotonic in practice.    |
| `lastUpdated`      | Mongoose `timestamps`           | Auto, on any write.                                |

"Completed" is defined as `quizScore === 100` **OR** all flashcards mastered — whichever fires first. The FE sends `completed_at` on either condition; BE `$min` guarantees the earliest sticks.

### FE vs BE Source of Truth

| Concern                       | Owner | Notes                                         |
|-------------------------------|-------|-----------------------------------------------|
| `openedAt` initial timestamp  | BE    | FE never sends it — prevents clock skew bugs. |
| `completedAt` computation     | FE    | FE decides the trigger; BE clamps via `$min`. |
| SM-2 flashcard state          | FE    | localStorage only; not persisted server-side. |
| Quiz score numeric range      | BE    | Clamp 0–100 regardless of FE input.           |

### Migration (guest → authed)

On successful login (`/auth/firebase/session`), the FE calls `POST /api/progress/migrate` with a UUID v4 `batchId` (persisted in localStorage for retry). BE reads the guest bucket via `userUuid` cookie and merges it into `userId` using `$min` on timestamps + `$setOnInsert` on identifiers — idempotent by construction.

**2-phase batch record** (Mongo standalone, no transactions): a `MigrationBatch` doc guards the bulkWrite:

```
1. Insert batch { userId, batchId, status: 'pending' }        ← unique (userId, batchId)
2. bulkWrite guest entries → user bucket (unordered)
3. Update batch status: 'completed' + completedAt + imported count
```

Replay semantics: duplicate `batchId` → read existing doc. `status === 'completed'` → `{ status: 'already_applied' }`. `status === 'pending'` → `{ status: 'in_progress' }` (crashed mid-flight or still running; FE retries after ~5s). Because the bulkWrite itself is idempotent (`$setOnInsert` + `$min`), re-running a pending batch is safe.

## Deploy Pipeline

See `docs/deployment-guide.md` for full detail.

```
push master → GitHub Actions
  → npm ci (root + app/)
  → inject VITE_FIREBASE_CONFIG
  → build FE (vite) + BE (esbuild single bundle)
  → smoke test /healthz
  → tar: dist/ + server.bundle.js
  → SCP to VPS release folder
  → pm2 startOrRestart ecosystem.config.cjs --env production
```

VPS minimal runtime: `node` + `pm2`. MongoDB + Meilisearch run as external services (self-hosted or managed). No native addon required.
