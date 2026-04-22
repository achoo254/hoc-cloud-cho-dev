# Phase 5: Migration — Seed + Remove JSON Fixtures

## Context Links

- [Brainstorm report](../reports/brainstorm-260422-0955-user-generated-labs.md)
- Depends on: Phase 1-4 (full pipeline working)

## Overview

- **Priority:** P1
- **Effort:** 3 days
- **Status:** pending

One-time migration: seed 8 existing labs từ JSON fixtures vào MongoDB với `authorId = system user`. Remove fixture pipeline + generated files. FE fetch từ API thay cho bundled JSON.

## Key Insights

- Existing `sync-labs-to-db.js` đã đọc JSON → insert MongoDB. Cần enhance để set `authorId` = system user.
- Existing `gen:content` pipeline tạo `app/src/generated/labs-index.json` + `search-index.json` consumed bởi FE.
- Meilisearch đã có sync job, không cần thay đổi ở phase này.

## Requirements

### Functional
- Seed script chạy idempotent — chạy lại không duplicate
- 8 labs xuất hiện trong MongoDB với status=published, authorId=system
- FE chuyển sang gọi `/api/labs` thay bundled JSON
- Remove `fixtures/labs/*.json`
- Remove `app/src/generated/`
- Remove `npm run gen:content` script
- Remove `scripts/build-server-data.mjs` nếu không dùng
- Validate: `grep fixtures/labs` và `grep src/generated` không có match

### Non-functional
- Seed chạy <10s cho 8 labs
- FE first paint không tệ hơn sau migration (<+500ms)

## Architecture

```
Before:
fixtures/labs/*.json
    ├─ npm run gen:content → app/src/generated/*.json (bundled)
    └─ npm run sync-labs → MongoDB

After:
MongoDB (single source)
    ├─ Meilisearch (search)
    └─ /api/labs (FE reads here)

One-time seed script
    ├─ Read fixtures/labs/*.json
    ├─ Ensure system User exists
    ├─ Upsert each lab với authorId=system, status=published
    └─ Trigger Meilisearch sync
```

## Related Code Files

**Create:**
- `scripts/seed-labs-from-fixtures.js` — one-time migration (runs once, then delete)
- `scripts/ensure-system-user.js` — helper to create/fetch system user

**Modify:**
- `app/src/routes/index.tsx` (or equivalent) — fetch labs from API instead of import bundled JSON
- `app/src/routes/lab-detail.tsx` — fetch single lab from API
- `package.json` — remove `gen:content` script, keep `sync-labs` as fallback or remove

**Delete:**
- `fixtures/labs/arp.json`, `dhcp.json`, `dns.json`, `http.json`, `icmp-ping.json`, `tcp-udp.json`, `subnet-cidr.json`, `tcp-ip-packet-journey.json`
- `app/src/generated/labs-index.json`
- `app/src/generated/search-index.json`
- `app/src/fixtures/dns.json` (if unused after dev-playground updated)
- `scripts/build-server-data.mjs` (nếu không còn reference)

## Implementation Steps

1. Create `ensure-system-user.js` — upsert User với email `system@hoccloud.local`, displayName "HocCloud System".
2. Create `seed-labs-from-fixtures.js`:
   - Read all fixtures JSON
   - Ensure system user
   - Upsert mỗi lab bằng slug: set authorId=system, status=published, visibility=public
   - Sync to Meilisearch
   - Log summary
3. Run seed locally + verify: `db.labs.find({status:'published'}).count()` = 8
4. Update FE to fetch `/api/labs` on home page load (add loading state).
5. Update lab detail page to fetch `/api/labs/:slug`.
6. Remove `gen:content` script from `package.json`.
7. Delete fixture files + generated files.
8. Update `dev-playground.tsx` nếu còn reference `app/src/fixtures/dns.json`.
9. Update docs: `docs/codebase-summary.md`, `docs/system-architecture.md` reflect new data flow.
10. Run validation greps → confirm 0 matches.
11. Smoke test: home page load → lab list → click lab → render correctly.

## Todo List

- [ ] ensure-system-user.js
- [ ] seed-labs-from-fixtures.js
- [ ] Run seed + verify DB count
- [ ] Update FE home page to fetch API
- [ ] Update lab detail page to fetch API
- [ ] Remove gen:content script
- [ ] Delete fixture files
- [ ] Delete generated files
- [ ] Update dev-playground if needed
- [ ] Update docs (codebase-summary, system-architecture)
- [ ] Grep validation
- [ ] Snapshot compare 8 labs before/after

## Success Criteria

- `grep -r "fixtures/labs" app/ server/` → 0 results (exclude plan/docs)
- `grep -r "src/generated" app/ server/` → 0 results
- 8 labs render identically pre/post migration (snapshot visual)
- Home page load time acceptable (<2s)
- Meilisearch index has 8 entries
- No broken imports sau cleanup

## Risk Assessment

- **FE bundle chưa handle loading state → white flash** → Fix: skeleton loader
- **Delete fixtures trước khi seed chạy → lost content** → Fix: seed first + verify, then delete
- **Meilisearch partial sync** → Fix: seed script trigger full re-sync at end
- **8 labs có content hash khác sau migration** → Không vấn đề, hash chỉ dùng cho sync dedup

## Security Considerations

- System user không có password/firebase auth → không thể login
- Labs của system user không cho user khác edit (ownership check vẫn enforce)
- Seed script chạy offline, không expose endpoint

## Next Steps

- Unblocks Phase 6 (testing cần migration hoàn tất)
