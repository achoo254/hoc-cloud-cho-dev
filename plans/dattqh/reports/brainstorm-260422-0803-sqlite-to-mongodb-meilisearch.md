# Brainstorm: SQLite → MongoDB + Meilisearch Migration

**Date:** 2026-04-22  
**Status:** Approved  
**Author:** Claude (brainstormer)

## Problem Statement

User muốn migrate từ SQLite (better-sqlite3) sang MongoDB vì quen sử dụng MongoDB hơn. Đồng thời kết hợp Meilisearch cho full-text search thay vì FTS5.

## Decisions

| Aspect | Decision |
|--------|----------|
| **Primary DB** | MongoDB (self-hosted VPS) |
| **Database name** | hoc_cloud_cho_dev_db |
| **Auth** | **[RED TEAM] Credentials removed - see .env** |
| **Driver** | Mongoose ODM |
| **Schema style** | Embedded documents |
| **Search engine** | Meilisearch (self-hosted, port 7700) |
| **Migration strategy** | Big-bang |

## Architecture

```
fixtures/labs/*.json
       │
       ▼
┌─────────────────┐     sync      ┌─────────────────┐
│    MongoDB      │ ──────────▶   │   Meilisearch   │
│  (primary DB)   │               │  (search index) │
│                 │               │                 │
│  - labs         │               │  - labs index   │
│  - progress     │               │                 │
│  - users        │               │                 │
│  - sessions     │               │                 │
└─────────────────┘               └─────────────────┘
       │                                   │
       ▼                                   ▼
┌─────────────────────────────────────────────────────┐
│                   Hono API Server                   │
│  GET /api/labs/:slug     → MongoDB                  │
│  GET /api/search?q=      → Meilisearch              │
│  POST /api/progress      → MongoDB                  │
└─────────────────────────────────────────────────────┘
```

## Collection Mapping

| SQLite Table | MongoDB Collection | Notes |
|--------------|-------------------|-------|
| labs | labs | Embedded tldr, walkthrough, quiz, flashcards, tryAtHome |
| labs_fts | (removed) | Replaced by Meilisearch |
| progress | progress | Reference to users via userId |
| users | users | firebaseUid as unique identifier |
| sessions | sessions | tokenHash unique |
| _migrations | (removed) | Mongoose handles schema sync |

## Mongoose Schemas

### Lab
```javascript
{
  slug: { type: String, unique: true, required: true },
  module: String,
  title: { type: String, required: true },
  filePath: String,
  estimatedMinutes: Number,
  tldr: [{ term: String, definition: String }],
  walkthrough: [Schema.Types.Mixed],
  quiz: [{
    question: String,
    answers: [String],
    correctIndex: Number,
    explanation: String
  }],
  flashcards: [{ front: String, back: String }],
  tryAtHome: [{ command: String, description: String }],
  contentHash: String,
  updatedAt: { type: Date, default: Date.now }
}
```

### Progress
```javascript
{
  userUuid: String,
  labSlug: { type: String, required: true },
  openedAt: Date,
  completedAt: Date,
  quizScore: Number,
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  lastUpdated: { type: Date, default: Date.now }
}
```

### User
```javascript
{
  firebaseUid: { type: String, unique: true, sparse: true },
  email: String,
  displayName: String,
  photoUrl: String,
  createdAt: { type: Date, default: Date.now }
}
```

### Session
```javascript
{
  tokenHash: { type: String, unique: true, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

## Meilisearch Index Configuration

### labs index
```javascript
{
  primaryKey: 'id',  // = slug
  searchableAttributes: [
    'title',
    'module', 
    'tldr_terms',
    'tldr_definitions',
    'walkthrough_text'
  ],
  filterableAttributes: ['module'],
  sortableAttributes: ['title'],
  typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 } }
}
```

### Document shape
```javascript
{
  id: 'docker-basics',
  title: 'Docker Fundamentals',
  module: 'containers',
  tldr_terms: ['Container', 'Image', 'Dockerfile'],
  tldr_definitions: ['Isolated environment...', '...'],
  walkthrough_text: 'Combined text from all walkthrough steps...'
}
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Update | Add mongoose, meilisearch; Remove better-sqlite3 |
| `server/db/sqlite-client.js` | Remove | Replaced by mongo-client |
| `server/db/mongo-client.js` | Create | Mongoose connection singleton |
| `server/db/meilisearch-client.js` | Create | Meilisearch client singleton |
| `server/db/models/` | Create | Mongoose schemas (Lab, Progress, User, Session) |
| `server/db/sync-search-index.js` | Create | Sync labs from MongoDB to Meilisearch |
| `server/db/migrate.js` | Remove | Not needed with Mongoose |
| `server/db/migrations/*.sql` | Archive | Keep for reference |
| `server/api/search-routes.js` | Update | FTS5 → Meilisearch client |
| `server/api/progress-routes.js` | Update | SQLite queries → Mongoose |
| `server/api/leaderboard-routes.js` | Update | SQLite queries → Mongoose |
| `server/api/auth-routes.js` | Update | SQLite queries → Mongoose |
| `scripts/sync-labs.js` | Update | Use Mongoose + trigger Meilisearch sync |
| `scripts/build-server-data.mjs` | Simplify | Remove SQL migration bundling |
| `.env.example` | Update | Add MONGODB_URI, MEILISEARCH_HOST, MEILISEARCH_API_KEY |

## Environment Variables

```env
# [RED TEAM] Credentials removed from docs - use placeholders only
# MongoDB
MONGODB_URI=mongodb://<MONGO_USER>:<MONGO_PASSWORD>@<VPS_HOST>:27017/<DB_NAME>

# Meilisearch
MEILISEARCH_HOST=http://<VPS_HOST>:7700
MEILISEARCH_API_KEY=<MEILISEARCH_MASTER_KEY>
```

## Trade-offs

### Pros
- Native BSON - no JSON.parse/stringify overhead
- Meilisearch search quality >> FTS5 (typo tolerance, highlighting, relevance)
- MongoDB familiar to user → faster development
- Embedded docs reduce join overhead
- Mongoose validation catches errors early

### Cons
- 2 services to maintain (MongoDB + Meilisearch)
- Sync overhead: MongoDB → Meilisearch
- Connection pool management for both
- Slightly higher memory usage

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data migration loss | Low | Low | Data regenerated from fixtures |
| **[RED TEAM]** User progress loss | High | High | ETL script before cutover |
| Meilisearch out of sync | Medium | Medium | Sync on lab upsert + cleanup stale docs |
| Connection failures | Medium | High | Retry logic, graceful degradation |
| Performance regression | Low | Medium | Index optimization, benchmarking |
| **[RED TEAM]** No rollback | Medium | High | Keep SQLite on branch, staging test |

## Success Criteria

1. All API endpoints functional with MongoDB backend
2. Search returns relevant results with typo tolerance
3. User auth/sessions work correctly
4. Progress tracking preserved
5. Health check reports MongoDB + Meilisearch status
6. No data loss from fixtures → DB flow

## Next Steps

1. Create detailed implementation plan via `/ck:plan`
2. Phase 1: Setup MongoDB connection + models
3. Phase 2: Setup Meilisearch client + index
4. Phase 3: Update API routes
5. Phase 4: Update sync scripts
6. Phase 5: Testing + cleanup
