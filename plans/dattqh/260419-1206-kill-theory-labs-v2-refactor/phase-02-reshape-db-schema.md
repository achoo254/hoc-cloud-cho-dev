---
phase: 02
title: Reshape DB Schema — Labs FTS + Progress
status: pending
effort: 0.5d
depends_on: [01]
---

## Goal

DROP các bảng theory cũ. ADD bảng `labs` + `labs_fts` (search) + `progress` (tracking multi-device). Script `sync-labs-to-db.js` đọc lab-data JSON trong HTML → insert vào DB.

## DB Schema mới

### Migration `002-kill-theory.sql`

```sql
-- Drop theory tables
DROP TRIGGER IF EXISTS sections_ai;
DROP TRIGGER IF EXISTS sections_ad;
DROP TRIGGER IF EXISTS sections_au;
DROP TABLE IF EXISTS sections_fts;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS lab_links;
DROP TABLE IF EXISTS admin_sessions;

-- Labs metadata (mirror từ lab-data JSON trong HTML)
CREATE TABLE labs (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- 'dns', 'tcp-ip-packet-journey'
  module TEXT NOT NULL,                -- '01-networking'
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,             -- 'labs/01-networking/08-dns.html'
  tldr_json TEXT NOT NULL DEFAULT '[]',        -- JSON array của TL;DR
  walkthrough_json TEXT NOT NULL DEFAULT '[]',
  quiz_json TEXT NOT NULL DEFAULT '[]',
  flashcards_json TEXT NOT NULL DEFAULT '[]',
  try_at_home_json TEXT NOT NULL DEFAULT '[]',
  estimated_minutes INTEGER,
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Full-text search over labs content
CREATE VIRTUAL TABLE labs_fts USING fts5(
  title, tldr, walkthrough, quiz, flashcards, try_at_home,
  content='labs', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- FTS triggers sync (content = concat of *_json flattened)
CREATE TRIGGER labs_ai AFTER INSERT ON labs BEGIN
  INSERT INTO labs_fts(rowid, title, tldr, walkthrough, quiz, flashcards, try_at_home)
  VALUES (new.id, new.title, new.tldr_json, new.walkthrough_json, new.quiz_json, new.flashcards_json, new.try_at_home_json);
END;
CREATE TRIGGER labs_ad AFTER DELETE ON labs BEGIN
  INSERT INTO labs_fts(labs_fts, rowid, title, tldr, walkthrough, quiz, flashcards, try_at_home)
  VALUES('delete', old.id, old.title, old.tldr_json, old.walkthrough_json, old.quiz_json, old.flashcards_json, old.try_at_home_json);
END;
CREATE TRIGGER labs_au AFTER UPDATE ON labs BEGIN
  INSERT INTO labs_fts(labs_fts, rowid, title, tldr, walkthrough, quiz, flashcards, try_at_home)
  VALUES('delete', old.id, old.title, old.tldr_json, old.walkthrough_json, old.quiz_json, old.flashcards_json, old.try_at_home_json);
  INSERT INTO labs_fts(rowid, title, tldr, walkthrough, quiz, flashcards, try_at_home)
  VALUES (new.id, new.title, new.tldr_json, new.walkthrough_json, new.quiz_json, new.flashcards_json, new.try_at_home_json);
END;

-- Progress tracking (anonymous UUID, multi-device)
CREATE TABLE progress (
  user_uuid TEXT NOT NULL,             -- v4 UUID từ cookie
  lab_slug TEXT NOT NULL,
  opened_at INTEGER,
  completed_at INTEGER,                -- NULL = chưa xong
  quiz_score INTEGER,                  -- % điểm quiz
  last_updated INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_uuid, lab_slug)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_uuid, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_labs_module ON labs(module, slug);
```

## Files to ADD

### `server/scripts/sync-labs-to-db.js`
- Walk `labs/**/*.html`, extract `<script type="application/json" id="lab-data">{...}</script>`
- Parse JSON, upsert vào bảng `labs` (ON CONFLICT DO UPDATE)
- Triggered: (a) manual `npm run sync-labs`, (b) dev mode watch labs/ → debounce 500ms → sync file thay đổi, (c) production on boot
- Idempotent: so sánh hash content, skip nếu không đổi

### `server/db/migrate.js` (update)
Chạy migration 001 + 002 tuần tự, track version trong bảng `_migrations`.

## Steps

1. Tạo `server/db/migrations/002-kill-theory.sql` với SQL trên
2. Update `server/db/migrate.js` để chạy cả 2 migration theo order
3. Tạo `server/scripts/sync-labs-to-db.js`:
   - Đọc glob `labs/**/*.html` (exclude `_shared/`, `index.html`)
   - Parse tag `<script type="application/json" id="lab-data">`
   - Insert/update vào `labs`
4. Thêm script vào `package.json`: `"sync-labs": "node server/scripts/sync-labs-to-db.js"`
5. Gọi `sync-labs` trong `server.js` boot (sau migrate, trước listen)
6. Dev mode: watch labs/ change → debounce → gọi lại sync file đó
7. Test: `npm run sync-labs` → kiểm tra `sqlite3 data/app.db "SELECT slug, title FROM labs"`
8. Test FTS5: `SELECT slug FROM labs_fts WHERE labs_fts MATCH 'dns'` → trả 08-dns

## Acceptance Criteria

- [ ] Migration 002 chạy thành công, bảng theory DROP hết
- [ ] Bảng mới `labs`, `labs_fts`, `progress` tồn tại
- [ ] `npm run sync-labs` đọc đúng 8 lab trong `01-networking/` + các lab khác → insert DB
- [ ] `SELECT COUNT(*) FROM labs` ≥ 8
- [ ] FTS5 search keyword "dns", "tcp", "subnet" trả đúng lab tương ứng
- [ ] Dev mode: sửa `labs/01-networking/08-dns.html` → DB auto sync trong <1s
- [ ] `EXPLAIN QUERY PLAN SELECT * FROM labs_fts WHERE labs_fts MATCH 'dns'` dùng FTS5 index

## Risks

| Risk | Mitigation |
|------|------------|
| Lab HTML không có block `<script id="lab-data">` | Script skip + warn (không crash); log list file skip |
| JSON parse fail vì HTML có `</script>` trong string | Dùng regex đủ chặt, test với lab phức tạp |
| FTS5 index quá to | Check `SELECT SUM(pgsize) FROM dbstat WHERE name='labs_fts'` — nếu >10MB mới lo |
| Sync trùng khi watch + boot cùng lúc | Dùng mutex đơn giản (flag `syncing`) |

## Out-of-scope

- UI search (phase 06)
- Progress endpoint (phase 07)
- Multi-version lab history (YAGNI)
