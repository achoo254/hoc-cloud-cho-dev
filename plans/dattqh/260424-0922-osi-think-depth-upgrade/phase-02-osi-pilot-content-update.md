---
title: "Phase 2 — OSI Pilot Content Update (tcp-ip-packet-journey)"
status: pending
priority: P1
effort: 1.5h
depends_on: [phase-00, phase-01]
---

# Phase 2 — OSI Pilot Content Update

## Context Links

- Content drafts (source of truth): `plans/dattqh/reports/brainstorm-260424-0807-osi-think-depth-upgrade.md`
  - §4.1 — `misconceptions[]` 4 items
  - §4.2 — `tldr[]` 5 rows `why` rewrites
  - §4.3 — `walkthrough[]` 8 steps `why` rewrites
- Lab slug: `tcp-ip-packet-journey`
- Lab model: `server/db/models/lab-model.js`
- MongoDB URI: see `.env.development` (`mongodb://hoc_cloud_cho_dev_db:7335140@103.72.98.65:27017/hoc_cloud_cho_dev_db`)

## Overview

**Priority:** P1 — Pilot validates content pattern, update script template, and
UI rendering before scaling to 7 remaining labs.

Apply all three content upgrades to `tcp-ip-packet-journey`:
1. Insert 4 `misconceptions[]` items (currently `FIELD_MISSING`)
2. Rewrite 5 `tldr[].why` fields
3. Rewrite 8 `walkthrough[].why` fields

## Key Insights

- Post-save hook on `findOneAndUpdate` auto-syncs Meilisearch (fire-and-forget,
  non-blocking). No manual Meilisearch step needed.
- `contentHash` is a stored field, not computed by a pre-save hook. The mongosh
  update script must manually set `contentHash` to a new value (SHA256 of slug +
  timestamp, or simply delete the field — verify current behavior of hash consumer
  before deciding). **Action: check how `contentHash` is read by FE/API** — if
  only used for cache-busting, update to current timestamp string is sufficient.
- `toLabContent()` maps `doc.contentHash → content_hash`. FE `LabFixtureSchema`
  has `content_hash: z.string().min(1)` — field is mandatory. Do not null it.
- HTML format for `why` fields: confirmed by Phase 1. Use `<a href="...">` inline
  links, `<code>` for commands/values, `<strong>` for emphasis.
- Content from brainstorm §4 is in markdown-style fenced blocks — strip fences,
  convert to single string for JSON. Newlines within the string are preserved
  (renderer renders as wrapping paragraph, no `<br>` needed).

## Requirements

**Functional**
- `misconceptions` array: 4 items matching shape `{ wrong, right, why }`
- `tldr[].why`: 5 rows rewritten per §4.2 draft
- `walkthrough[].why`: 8 steps rewritten per §4.3 draft
- `contentHash` updated to reflect content change
- `whyBreaks`, `deploymentUse` on tldr rows: **unchanged** (brainstorm §4.2 note: "giữ nguyên để giảm scope")
- `whyBreaks`, `observeWith` on walkthrough steps: **unchanged**

**Non-functional**
- Zero occurrences of banned phrases (§2 content-guidelines): "số phòng", "tìm đường"
- Every protocol claim in new content has RFC/ISO anchor link
- Zod validation passes after update (check with FE)

## Architecture

### Update approach: mongosh script

Write a single `mongosh` script (`scripts/update-osi-lab-think-depth.js`) that:

```js
// Pseudocode structure
db.labs.findOneAndUpdate(
  { slug: 'tcp-ip-packet-journey' },
  {
    $set: {
      misconceptions: [ /* 4 items from §4.1 */ ],
      // tldr: merge only .why field per row — preserve all other fields
      // walkthrough: merge only .why field per step — preserve all other fields
      contentHash: new Date().toISOString(),
    }
  },
  { returnDocument: 'after' }
)
```

**Tldr merge strategy**: cannot `$set: { tldr: [...] }` (overwrites all fields).
Must read current tldr array, update only `why` on each row by index, then
`$set` the entire mutated array. Do in the script:

```js
var doc = db.labs.findOne({ slug: 'tcp-ip-packet-journey' });
var tldr = doc.tldr;
tldr[0].why = '...new why row 0...';
// ... for each of 5 rows
db.labs.findOneAndUpdate(
  { slug: 'tcp-ip-packet-journey' },
  { $set: { tldr: tldr, walkthrough: walkthrough, misconceptions: [...], contentHash: new Date().toISOString() } }
);
```

Script location: `plans/dattqh/260424-0922-osi-think-depth-upgrade/scripts/update-osi-lab-think-depth.js`
(NOT in `server/` — one-shot migration script, not production code)

## Related Files

**Create:**
- `plans/dattqh/260424-0922-osi-think-depth-upgrade/scripts/update-osi-lab-think-depth.js`

**Read (to extract current array before patch):**
- MongoDB `labs` collection, slug `tcp-ip-packet-journey` (via mongosh)

**No app code changes in this phase** — all changes are data-only.

## Implementation Steps

1. **Read current doc**: `mongosh <URI> --eval "db.labs.findOne({slug:'tcp-ip-packet-journey'}, {tldr:1,walkthrough:1,_id:0})"` — capture full array structure including all fields per row/step.

2. **Write mongosh script** `scripts/update-osi-lab-think-depth.js`:
   - Section A: set `misconceptions` (4 items from brainstorm §4.1, verbatim)
   - Section B: read current `tldr`, patch `why` on each of 5 rows (indices 0–4) per §4.2
   - Section C: read current `walkthrough`, patch `why` on each of 8 steps (indices 0–7) per §4.3
   - Section D: `$set` all three fields + `contentHash: new Date().toISOString()`
   - Section E: print result slug + misconceptions.length + tldr[0].why.substring(0,80) as verification

3. **Content format**: convert brainstorm §4 fenced text blocks to JS template literals.
   Replace markdown-style `[RFC 791 §3.1](url)` with HTML `<a href="url">RFC 791 §3.1</a>`.
   Preserve newlines as `\n` within the string (renderer wraps naturally).

4. **Execute**: `mongosh "mongodb://hoc_cloud_cho_dev_db:7335140@103.72.98.65:27017/hoc_cloud_cho_dev_db" scripts/update-osi-lab-think-depth.js`

5. **Verify DB**: query `misconceptions.length`, `tldr[0].why` first 100 chars, `contentHash`.

6. **Verify API**: `curl http://localhost:8387/api/labs/tcp-ip-packet-journey | jq '.lab.misconceptions | length'` → expect `4`.

7. **Verify Meilisearch sync**: check server logs for `[meili] sync` line or absence of error.

## Todo

- [ ] Read current OSI lab full doc from MongoDB (tldr + walkthrough arrays)
- [ ] Create `scripts/` directory under plan dir
- [ ] Write `scripts/update-osi-lab-think-depth.js` with all content from §4.1–4.3
- [ ] Convert markdown-style links → HTML `<a href>` in all why fields
- [ ] Execute mongosh script against production MongoDB
- [ ] Verify: `misconceptions.length === 4`
- [ ] Verify: `contentHash` changed
- [ ] Verify: API response includes `misconceptions` array
- [ ] Verify: Meilisearch sync triggered (no error in server log)
- [ ] Confirm `whyBreaks` and `deploymentUse` on tldr rows unchanged
- [ ] Confirm `whyBreaks` and `observeWith` on walkthrough steps unchanged

## Success Criteria (from brainstorm §6)

- `misconceptions[]` has 4 items; each has non-empty `wrong`, `right`, `why`
- Zod validation passes (FE renders without throw)
- `contentHash` changed vs pre-update value
- `GET /api/labs/tcp-ip-packet-journey` returns updated content
- HTML inline RFC links well-formed (no broken `<a>` tags)
- 0 occurrences of: "số phòng", "tìm đường", banned phrases from §2

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tldr/walkthrough index mismatch (patch wrong row) | Med | High | Script prints first 80 chars of each patched field as verification; abort if mismatch |
| `contentHash` field mandatory in Zod (`min(1)`) — must not nullify | Low | High | Script sets to `new Date().toISOString()` — always non-empty string |
| Meilisearch sync error (Meili down) | Low | Low | Fire-and-forget hook — Mongo write succeeds regardless; re-sync later via bulk sync script |
| HTML link syntax error in template literal (unclosed tag) | Med | Med | Script prints tldr[0].why; visually verify before accepting |
| Script run against wrong DB | Low | High | Script prints `db.getName()` and `slug` before executing update; abort if unexpected |

## Security Considerations

- Script runs against production MongoDB from developer machine — confirm URI is `.env.development` (not prod if different).
- Script file stored in `plans/` (not committed to server/). Contains no credentials — URI passed via CLI arg.
- One-shot script; no rollback mechanism built in. See Rollback section.

## Rollback

Before executing, capture current state:
```js
// Run first, save output
db.labs.findOne({slug:'tcp-ip-packet-journey'}, {tldr:1,walkthrough:1,misconceptions:1,contentHash:1,_id:0})
```
Save to `scripts/backup-osi-lab-pre-update.json`. If rollback needed:
```js
db.labs.findOneAndUpdate({slug:'tcp-ip-packet-journey'}, {$set: <backup doc>})
```

## Next Steps

- Phase 3 (visual QA): render lab on FE, check TL;DR UI with new content length
- Phase 4 (parallel): audit 7 remaining labs (not blocked on Phase 2 completion)
