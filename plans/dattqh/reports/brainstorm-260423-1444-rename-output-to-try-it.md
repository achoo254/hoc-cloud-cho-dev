---
type: brainstorm
date: 2026-04-23 14:44 (Asia/Saigon)
slug: rename-output-to-try-it
status: implemented
---

# Brainstorm: rename `SHIP`/`OUTPUT` → `TRY IT`

> **Update post-implement (2026-04-23):** scan code thực tế không tìm thấy field `ship` trong Zod schema / Mongoose model. Schema dùng các field top-level `quiz`, `flashcards`, `try_at_home` / `tryAtHome` — "SHIP" chỉ xuất hiện ở comment và tên phase UI. Vì vậy **migration DB bị bỏ** (không cần), "Migration DB" section bên dưới chỉ còn giá trị tham khảo.

## Problem

Triết lý học hiện đặt tên lẫn lộn ở 3 tầng:

- Schema/DB: field `ship`
- UI tab: hiển thị `OUTPUT`
- Sub-heading trong tab: `SHIP: Try-at-home`

Người dùng muốn thống nhất thành **THINK / SEE / TRY IT** để khớp với bản chất hoạt động của tab (trả lời quiz, lật flashcard, làm bài tập tại nhà).

## Quyết định naming (chốt)

| Tầng | Cũ | Mới | Ghi chú |
|---|---|---|---|
| Schema field (JSON key) | `ship` | `tryIt` | camelCase — `try` reserved keyword JS, kebab `try-it` không hợp key JS |
| Tab label UI | `OUTPUT` | `TRY IT` | English, giữ nhất quán với các tab hiện tại |
| Phase badge const | `'SHIP' \| 'OUTPUT'` | `'TRY_IT'` | |
| Tab value / data attr / URL slug | `"output"` | `"try-it"` | kebab cho data-attr + URL |
| Sub-heading "SHIP: Try-at-home" | có | **bỏ** | tab đã mang nghĩa, heading thừa |
| Màu badge | amber | amber | giữ nguyên |

## Phạm vi thay đổi

### Code

- `app/src/lib/schema-lab.ts` — rename SHIP section comment + key `ship` → `tryIt`
- `app/src/components/lab/lab-renderer.tsx` — rename `TabValue`, `outputContent`/`OutputBlock` → `tryItContent`/`TryItBlock`, xoá sub-heading "SHIP: Try-at-home", đổi badge + tab label
- `app/src/components/lab/diagrams/shared/playground-shell.tsx` — sửa slot/prop nếu có ref tới `output`/`ship`
- `server/db/models/lab-model.js` — đổi key Mongoose schema
- `server/db/sync-search-index.js` — field mapping sang Meilisearch nếu đụng

### Docs sync

- `CLAUDE.md` — cập nhật phase pattern THINK/SEE/TRY IT
- `docs/lab-schema-v3.md` — schema reference
- `docs/content-guidelines.md` — guideline
- `docs/codebase-summary.md`, `docs/system-architecture.md` — references

### KHÔNG đụng

- `plans/**` cũ + `docs/journals/**` — lịch sử bất biến
- Fixtures (đã bỏ theo commit `8f99760`)

## Migration DB — KHÔNG CẦN

Khi scan code trước khi implement phát hiện schema **không có field `ship`**. Lab content dùng top-level fields: `tldr`, `walkthrough`, `quiz`, `flashcards`, `tryAtHome` (Mongoose) / `try_at_home` (Zod input). "SHIP" chỉ là tên phase UI + comment divider trong source. Do đó:

- Không có migration script
- Không re-index Meilisearch (field mapping không đổi)
- Không drop collection

## Các approach đã cân nhắc

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Chỉ đổi UI label | Zero risk, 1 file | Docs/schema lệch nhau, debt tích luỹ | Loại |
| UI + docs, giữ schema `ship` | Không migration | Vẫn tồn tại 2 tên (internal vs external) | Loại |
| **Đổi cả schema + DB** (chọn) | Thống nhất mọi tầng, sạch | Cần migration + re-index | **Chọn** |

## Validation

- [x] `pnpm --dir app run typecheck` pass
- [x] `pnpm --dir app run build` pass
- [x] `pnpm run build:server` pass
- [x] Tab "TRY IT" render Quiz + Flashcards + Try-at-home, sub-heading cũ đã bỏ
- [x] Grep code active không còn ref `SHIP`/`OUTPUT`/`'output'` (trừ 1 comment "ship items" không liên quan)
- [x] `lab-toc.tsx` `TocPhase` + `PHASE_DOT_COLORS` + `PHASE_TO_TAB` đã đổi

## Rủi ro & mitigation

| Rủi ro | Mitigation |
|---|---|
| User progress collection có lưu phase name `'SHIP'`/`'OUTPUT'` | Scout `/api/progress` + model progress, migrate nếu có |
| Meilisearch cache field cũ | Drop index + re-sync sau khi migrate |
| Sót reference trong code | Grep dry-run trước khi sửa |

## Success metrics

- 1 lần thống nhất tên ở mọi tầng
- DB + UI + docs dùng cùng 1 tên `tryIt` / `TRY IT`
- Không hồi quy render/search sau migration

## Unresolved questions

- User progress collection có lưu phase name không? (scan khi implement)
- Có cần giữ alias đọc `ship` trong Mongoose schema 1 thời gian để backward-compat không? → Mặc định: **không** (solo project, big bang).
