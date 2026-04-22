# Phase 6: Testing + Security Hardening

## Context Links

- [Brainstorm report](../reports/brainstorm-260422-0955-user-generated-labs.md)
- Depends on: Phase 1-5

## Overview

- **Priority:** P1
- **Effort:** 3 days
- **Status:** pending

Comprehensive testing (unit, integration, E2E smoke) + security audit (XSS, auth, rate limit). Validate all success criteria từ plan.md.

## Key Insights

- UGC platform cần đặc biệt chú ý XSS/injection
- Tiptap output được render qua React — safer mặc định nhưng vẫn có risk từ `href`, HTML passthrough
- Rate limit cần test với time-freeze để tránh flaky

## Requirements

### Functional (Testing)
- Unit tests cho adapters (tiptap ↔ lab)
- Integration tests cho 6 API endpoints
- E2E smoke: sign up → create lab → publish → other user views → search works
- Snapshot test cho 8 migrated labs render

### Security
- XSS test: inject `<script>`, `javascript:` href, `<img onerror>` trong mọi field
- Auth test: expired session, wrong user, missing session
- Rate limit test: 11th create trong 24h trả 429
- Ownership test: user A không edit được lab của user B
- Slug enumeration test: GET draft của user khác → 404 (not 403 để không leak existence)

### Non-functional
- Test suite chạy <2 phút
- No flaky tests

## Architecture

```
Tests
├─ Unit (Vitest)
│  ├─ tiptap-to-lab-adapter.test.ts
│  ├─ lab-to-tiptap-adapter.test.ts
│  └─ slug-generator.test.ts
├─ Integration (Vitest + supertest)
│  ├─ labs-routes.test.js (CRUD)
│  ├─ rate-limit.test.js
│  └─ ownership.test.js
└─ E2E (Playwright smoke)
    └─ user-creates-lab.spec.ts

Security
├─ XSS fuzz test script
├─ DOMPurify config audit
└─ Rate limit verification
```

## Related Code Files

**Create:**
- `server/api/__tests__/labs-routes.test.js`
- `server/api/__tests__/rate-limit.test.js`
- `app/src/lib/__tests__/tiptap-to-lab-adapter.test.ts`
- `app/src/lib/__tests__/lab-to-tiptap-adapter.test.ts`
- `e2e/user-creates-lab.spec.ts`
- `server/scripts/xss-fuzz-test.js`

**Modify (hardening):**
- `app/src/components/lab/lab-renderer.tsx` — wrap user content với DOMPurify
- `server/api/validators/lab-validator.js` — tighten strings to reject `javascript:` URLs
- `server/api/labs-routes.js` — ensure 404 (not 403) cho unauthorized access to drafts

## Implementation Steps

1. Write adapter round-trip tests: lab → tiptap → lab with all field combos.
2. Write API integration tests với mongodb-memory-server.
3. Write ownership + rate-limit tests.
4. Write E2E smoke với Playwright: login → create → edit → publish → search → delete.
5. Snapshot test 8 migrated labs visual diff pre/post.
6. DOMPurify audit: verify allowlist, ensure strip `on*` handlers và `javascript:` schemes.
7. Write XSS fuzz script — payloads list, test qua API create, verify DOMPurify strip.
8. Response info leak audit: ensure 404 (not 403) cho drafts của user khác.
9. Rate limit race test: concurrent creates trong cùng 1 second không bypass limit.
10. Run full test suite, fix flakes, document any trade-offs.

## Todo List

- [ ] Adapter round-trip unit tests
- [ ] API integration tests (CRUD)
- [ ] Rate limit test
- [ ] Ownership test
- [ ] E2E smoke test (Playwright)
- [ ] Snapshot test 8 migrated labs
- [ ] DOMPurify audit + hardening
- [ ] XSS fuzz test script
- [ ] Info leak audit (draft 404 vs 403)
- [ ] Rate limit race condition test
- [ ] Full suite run + fix flakes
- [ ] Document security findings

## Success Criteria

- All tests pass in CI
- 0 XSS vector qua fuzz test
- Rate limit works under concurrent load
- Draft của user khác → 404 (not leak existence)
- DOMPurify strips all known vectors
- Snapshot diff cho 8 labs = 0 visual changes
- Test suite <2min total runtime
- Zero console errors during E2E

## Risk Assessment

- **Flaky E2E tests** → Fix: explicit waits on API response, not arbitrary timeouts
- **Fuzz test miss novel vectors** → Fix: use OWASP XSS cheat sheet as baseline
- **DOMPurify config quá strict làm mất content hợp lệ** → Fix: curate allowlist từ Tiptap output types
- **Rate limit bypass via multi-account** → Not in scope (future: IP rate limit)

## Security Considerations

- Final security checklist:
  - [ ] Auth required on mutations
  - [ ] Ownership check on every mutation
  - [ ] DOMPurify on render
  - [ ] Rate limit enforced
  - [ ] No info leak (draft = 404)
  - [ ] Zod strict validation
  - [ ] Content length caps
  - [ ] Slug format validated

## Next Steps

- Merge feature branch → master
- Deploy to staging
- Monitor MongoDB + Meilisearch health
- User feedback round, iterate moderation if abuse detected
