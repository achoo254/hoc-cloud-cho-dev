-- Phase 1 initial schema: topics, sections (+ FTS5), lab_links, admin_sessions

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  order_idx INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  order_idx INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(topic_id, slug)
);

CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
  title, body_md,
  content='sections', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
  INSERT INTO sections_fts(rowid, title, body_md) VALUES (new.id, new.title, new.body_md);
END;

CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, title, body_md) VALUES('delete', old.id, old.title, old.body_md);
END;

CREATE TRIGGER IF NOT EXISTS sections_au AFTER UPDATE ON sections BEGIN
  INSERT INTO sections_fts(sections_fts, rowid, title, body_md) VALUES('delete', old.id, old.title, old.body_md);
  INSERT INTO sections_fts(rowid, title, body_md) VALUES (new.id, new.title, new.body_md);
END;

CREATE TABLE IF NOT EXISTS lab_links (
  section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
  lab_slug TEXT NOT NULL,
  PRIMARY KEY (section_id, lab_slug)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  github_user TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sections_topic ON sections(topic_id, order_idx);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_exp ON admin_sessions(expires_at);
