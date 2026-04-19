---
type: brainstorm
date: 2026-04-19
slug: theory-cms-lms
status: design-approved
---

# Theory CMS + LMS-lite — Design Summary

## 1. Problem Statement

Site `hoc-cloud.inetdev.io.vn` hiện chỉ có Labs (HTML tĩnh). Cần bổ sung:
- Phần **lý thuyết thực chiến** (ngắn, súc tích, không dài dòng)
- Linh hoạt sửa nội dung từng section ngay
- Menu động, search toàn site, ghi nhớ vị trí scroll
- Dashboard chuyên nghiệp hơn

Mục tiêu cuối: **LMS-lite cá nhân** cho cloud/devops learning, public SEO-friendly.

## 2. Requirements

| Loại | Yêu cầu |
|---|---|
| Functional | Theory CRUD qua admin UI, search full-text, scroll memory, cross-ref Theory↔Lab, quiz SRS, dashboard widget, i18n **KHÔNG** cần (VI only) |
| Non-functional | Public SEO, server-side render, backup DB, live-reload content khi save |
| Auth | GitHub OAuth whitelist cho `/admin` |
| Rich content | Markdown + code highlight (Shiki) + Mermaid + callouts + inline quiz + image upload + cross-ref labs |
| Audience | Public — ai cũng đọc được |
| Scope | Full LMS-lite, chia 6 phase |

## 3. Evaluated Approaches (Storage + Search)

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| MongoDB-only + `$text` | Reuse Mongo có sẵn, 1 store | Search yếu (không fuzzy, diacritics kém) | ❌ |
| MongoDB + SQLite FTS5 hybrid | Search mạnh + Mongo cho meta | 2 source of truth, sync bugs, backup đôi | ❌ Anti-pattern |
| MongoDB + Meilisearch | Search cực mạnh | Thêm 1 service PM2, sync layer | Phase sau nếu cần |
| **SQLite-only + FTS5** ⭐ | 1 file, atomic tx, FTS5 built-in, better-sqlite3 nhanh, backup = copy file | Bỏ Mongo cho project này | ✅ **Chosen** |

## 4. Final Architecture

### Stack (giữ tối thiểu)
```
Hono (có sẵn)
 ├─ better-sqlite3            main store + FTS5
 ├─ @hono/oauth-providers     GitHub OAuth
 ├─ markdown-it + Shiki       render MD server-side (SEO)
 ├─ alpinejs                  admin UI (không framework nặng)
 └─ mermaid                   client-side diagram
```

### Data Model (SQLite)

```sql
topics(id, slug, title, order_idx, created_at)
sections(id, topic_id, slug, title, body_md, order_idx, updated_at)
sections_fts(title, body_md, content='sections', content_rowid='id')  -- FTS5 virtual
-- triggers insert/update/delete keep FTS5 in sync

lab_links(section_id, lab_slug, direction)  -- bidirectional cross-ref
media(id, filename, mime, size, uploaded_at)  -- file metadata (file ở disk)
progress(visitor_id, section_id, scroll_pct, heading_id, last_seen)  -- anonymous cookie
quiz_cards(id, section_id, question_md, answer_md, tags)
quiz_reviews(card_id, visitor_id, ease, interval, due_at, last_reviewed)  -- SM-2
admin_sessions(token_hash, github_user, expires_at)
```

### Routing

```
/                       dashboard mới (4 widget)
/theory                 topic index
/theory/:topic          section list + outline
/theory/:topic/:section reader view
/labs/...               giữ nguyên, dần migrate sang markdown
/search?q=              Ctrl+K palette endpoint
/admin                  CMS (OAuth gated)
/admin/editor/:id       markdown editor
/api/*                  JSON endpoints
/auth/github            OAuth start
/auth/github/callback   OAuth callback
/uploads/YYYY/MM/xxx    static media
/sitemap.xml            auto-gen SEO
/rss.xml                updates feed
```

### Admin UI (KISS)

- Single HTML + Alpine.js, không build tool
- Split view: Markdown textarea | live preview (`/api/render` endpoint)
- Slash commands: `/code`, `/mermaid`, `/callout`, `/quiz`, `/image`
- Drag-drop image → upload → paste markdown
- Auto-save draft mỗi 5s vào localStorage, commit khi nhấn Save
- List sections với filter theo topic, drag-reorder `order_idx`

### Dashboard (4 widget)

1. **Continue reading** — bookmark hiện tại (refine UI có sẵn)
2. **Today's focus** — 1 theory section + 1 lab gợi ý theo lộ trình
3. **Progress map** — heatmap 8 phases × [theory coverage | lab coverage]
4. **Recent updates** — section nào vừa sửa (hữu dụng khi content đổi thường xuyên)

### Scroll Memory (nâng cấp)

- `IntersectionObserver` trên mọi `<h2>`, `<h3>`
- Lưu `{section_id, heading_id, scroll_pct}` vào localStorage + POST `/api/progress` (cookie anonymous visitor ID)
- Reload → auto-scroll + highlight heading đang đọc
- Dashboard Continue widget đọc từ đây

### Search UX (Ctrl+K palette)

- Client: Alpine component, hotkey `⌘K / Ctrl+K`
- Server: FTS5 `MATCH` + `bm25()` ranking + `snippet()` highlight
- Unified results: Theory sections, Labs, Quiz questions, Code blocks
- Filter chips: [All] [Theory] [Lab] [Quiz]
- Instant search (debounce 120ms)

### Security

- OAuth state param + httpOnly secure cookie session (SameSite=Lax)
- `GITHUB_ADMIN_WHITELIST` env var (comma-separated usernames)
- CSRF token cho POST/PUT/DELETE từ admin
- Image upload: validate magic bytes, ≤2MB, random filename, không trust extension
- Rate limit `/api/*` (in-memory token bucket: 60 req/min/IP)
- Public render KHÔNG đòi cookie (SEO crawl OK)

### Backup

- Cron daily 02:00: `sqlite3 hoccloud.db ".backup /backup/hoccloud-$(date).db"`
- Giữ 7 bản gần nhất
- Uploads: rsync weekly sang backup dir

## 5. Phase Breakdown

| Phase | Scope | Thời gian | Priority |
|---|---|---|---|
| **P1 — Theory core** | SQLite setup + FTS5 + GitHub OAuth + CMS CRUD + public render + code/mermaid/callout + migrate labs → MD | 1.5 tuần | 🔴 |
| **P2 — Search + cross-ref** | Ctrl+K palette, bidirectional lab_links, snippet highlight | 4 ngày | 🔴 |
| **P3 — Dashboard refresh** | 4 widgets, scroll memory server-side, progress map, anonymous visitor ID | 5 ngày | 🟡 |
| **P4 — Quiz SRS** | Merge plan `daily-random-quiz-srs`, inline quiz trong theory, review page | 1 tuần | 🟡 |
| **P5 — Analytics + SEO** | sitemap.xml, OG tags, RSS, reading streak, time-on-page | 3 ngày | 🟢 |
| **P6 — Image upload + polish** | Admin drag-drop upload, image gallery, certificate (optional) | 4 ngày | 🟢 |

**Total:** ~6 tuần part-time. Làm P1+P2 trước đã thấy rõ giá trị.

## 6. Migration Strategy (Labs HTML → Markdown)

- Script `server/scripts/migrate-labs-to-md.js` chạy 1 lần:
  - Parse `labs/**/*.html` bằng cheerio
  - Extract `.lab-section` blocks → markdown via turndown
  - Insert vào SQLite với topic_id mapping theo folder
- Backup `labs/` gốc vào `labs/_archive/` phòng rollback
- Sau migrate: route `/labs/*` render từ DB, file HTML deprecate dần

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| FTS5 không có trong sqlite3 build mặc định | Search fail | better-sqlite3 built with FTS5 default; verify `PRAGMA compile_options` |
| Mermaid render chậm khi nhiều diagram | UX lag | Lazy render: chỉ init khi scroll tới |
| Admin bị lộ nếu whitelist miss | Security | Whitelist require exact GitHub username match + log mọi admin action |
| Live-reload fs.watch không work với DB content | Editor UX | SSE từ admin save endpoint, không dùng fs.watch cho content mới |
| DB file lock khi concurrent write + backup | Downtime ngắn | Dùng SQLite `.backup` API (online backup, không block) |
| Migration labs HTML mất format đặc biệt | Content quality | Script dry-run trước, diff preview, giữ `_archive/` |

## 8. Success Metrics

- P1 done: có thể viết 1 theory section qua admin, public render với code highlight, search trả kết quả
- P2 done: Ctrl+K tìm thấy cả theory lẫn lab, mở section hiện "Related labs"
- P3 done: dashboard hiện bookmark, reload về đúng vị trí, progress map hiển thị coverage
- P4 done: quiz hàng ngày, SM-2 interval đúng, streak counter
- P5 done: `site:hoc-cloud...` trên Google index được theory pages
- P6 done: upload ảnh drag-drop OK, gallery reusable

## 9. Open Questions

1. **SEO cache strategy:** Cần CDN/edge cache (Cloudflare) hay server-side cache là đủ cho traffic hiện tại?
2. **Quiz SRS:** Plan `260419-0932-daily-random-quiz-srs` đang pending — merge vào đây hay vẫn giữ plan riêng rồi link?
3. **Domain admin:** Xác nhận `/admin` chung domain, không cần `admin.hoc-cloud...` subdomain?
4. **Analytics provider:** Tự built-in đếm page view, hay tích hợp Plausible/Umami self-hosted?
5. **Certificate feature:** Có thực sự cần "certificate of completion" không? (optional trong P6)

## 10. Next Steps

1. Approve design → tạo plan chi tiết cho **Phase 1** trước (`/ck:plan`)
2. Phase 1 gồm sub-tasks: setup SQLite schema, OAuth flow, admin skeleton, markdown pipeline, migration script
3. Phase 2 trở đi plan sau khi P1 done để adjust theo thực tế
