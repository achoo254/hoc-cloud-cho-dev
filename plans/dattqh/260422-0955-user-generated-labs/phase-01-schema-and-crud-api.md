# Phase 1: Schema Extensions + CRUD API

## Context Links

- [Brainstorm report](../reports/brainstorm-260422-0955-user-generated-labs.md)
- Related: `server/db/models/lab-model.js`, `server/api/search-routes.js`, `server/auth/session-middleware.js`

## Overview

- **Priority:** P1 (blocker cho các phases sau)
- **Effort:** 5 days
- **Status:** pending

Extend Lab mongoose schema với author/ownership/status, tạo full CRUD API routes với auth + rate limit + Meilisearch sync trigger.

## Key Insights

- Lab schema hiện tại assume content quản lý qua sync script → cần thêm authorId, status, visibility
- Meilisearch sync hiện chạy batch qua `sync-search-index.js` → cần trigger per-document khi lab mutate
- Existing auth middleware (`session-middleware.js`) đã support logged-in user context

## Requirements

### Functional
- CRUD endpoints cho labs với ownership enforcement
- Rate limit 10 labs/day/user on POST
- Publish flow tách biệt draft → published
- Meilisearch sync trigger on create/update/publish/delete
- Slug collision fallback `-2`, `-3`
- Content length validators

### Non-functional
- All mutations auth-required
- Response <200ms cho list queries
- Indexes: `{authorId, status}`, `{module, status}`, `{status, updatedAt}`

## Architecture

```
POST /api/labs ──┐
PUT /api/labs/:slug ─┼─► validate → auth check → ownership check
DELETE ──┘          │  → save to MongoDB
                     └─► Meilisearch sync (async)
```

## Related Code Files

**Modify:**
- `server/db/models/lab-model.js` — add authorId, status, visibility, viewCount, diagramRefs
- `server/server.js` — mount labs routes
- `server/db/sync-search-index.js` — export single-doc sync helper

**Create:**
- `server/api/labs-routes.js` — CRUD + publish endpoints
- `server/api/middleware/rate-limit-labs.js` — per-user daily limit
- `server/api/validators/lab-validator.js` — Zod schema cho lab input

## Implementation Steps

1. Extend `labSchema` với fields mới (authorId, status, visibility, viewCount, diagramRefs). Add indexes.
2. Tạo Zod validator `lab-validator.js` cho POST/PUT body (mirror Mongoose schema nhưng stricter).
3. Tạo `labs-routes.js` với 6 endpoints: list, create, get, update, delete, publish. Use Hono router pattern như `search-routes.js`.
4. Implement ownership middleware: load lab by slug, compare `lab.authorId.toString() === ctx.session.userId.toString()`.
5. Implement rate limit middleware: count labs với authorId trong 24h gần nhất via `Lab.countDocuments`.
6. Slug generation utility: slugify title, check collision, auto-suffix.
7. Meilisearch sync helper: `syncOneLabToSearch(lab)` và `removeLabFromSearch(slug)`. Call sau mỗi mutation.
8. Mount router in `server.js`: `app.route('/api/labs', labsRouter)`.
9. Test endpoints với curl/Postman script.

## Todo List

- [ ] Extend lab-model schema + indexes
- [ ] Create lab-validator.js (Zod)
- [ ] Create labs-routes.js (6 endpoints)
- [ ] Implement ownership middleware
- [ ] Implement rate-limit-labs.js
- [ ] Slug generation + collision fallback
- [ ] Single-doc Meilisearch sync helpers
- [ ] Mount in server.js
- [ ] Smoke test all endpoints
- [ ] Verify indexes created

## Success Criteria

- POST/PUT/DELETE require auth → return 401 if no session
- Non-owner PUT/DELETE → 403
- Rate limit hits 11th create in 24h → 429
- Slug collision resolved automatically
- Meilisearch index updated within 2s sau mutation
- All endpoints return proper HTTP codes và consistent JSON shape

## Risk Assessment

- **Meilisearch sync failure làm fail mutation** → Fix: async fire-and-forget + logged failure, schedule retry
- **Slug suffix loop infinite nếu bug** → Fix: max 100 retries then 500 error
- **Rate limit bypass qua clock skew** → Fix: server-side timestamp only

## Security Considerations

- Session middleware required on mutation routes
- Ownership check phải dùng ObjectId comparison (not string contains)
- Zod validator reject unknown fields (strict mode)
- Content length caps enforced ở validator layer

## Next Steps

- Unblocks Phase 2 (editor needs API to save)
