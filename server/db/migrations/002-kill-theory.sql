-- Phase 02: drop theory CMS tables, add labs/labs_fts/progress
-- Idempotent — safe to re-run.

DROP TRIGGER IF EXISTS sections_ai;
DROP TRIGGER IF EXISTS sections_ad;
DROP TRIGGER IF EXISTS sections_au;
DROP TABLE IF EXISTS sections_fts;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS lab_links;
DROP TABLE IF EXISTS admin_sessions;

-- Labs metadata mirrored from lab-data JSON in each HTML file.
CREATE TABLE IF NOT EXISTS labs (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  tldr_json TEXT NOT NULL DEFAULT '[]',
  walkthrough_json TEXT NOT NULL DEFAULT '[]',
  quiz_json TEXT NOT NULL DEFAULT '[]',
  flashcards_json TEXT NOT NULL DEFAULT '[]',
  try_at_home_json TEXT NOT NULL DEFAULT '[]',
  estimated_minutes INTEGER,
  content_hash TEXT,
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- FTS5 virtual table with columns matching labs.* exactly so external-content
-- lookups resolve. MATCH queries search all indexed columns by default.
CREATE VIRTUAL TABLE IF NOT EXISTS labs_fts USING fts5(
  title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json,
  content='labs', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS labs_ai AFTER INSERT ON labs BEGIN
  INSERT INTO labs_fts(rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES (new.id, new.title, new.tldr_json, new.walkthrough_json, new.quiz_json, new.flashcards_json, new.try_at_home_json);
END;
CREATE TRIGGER IF NOT EXISTS labs_ad AFTER DELETE ON labs BEGIN
  INSERT INTO labs_fts(labs_fts, rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES('delete', old.id, old.title, old.tldr_json, old.walkthrough_json, old.quiz_json, old.flashcards_json, old.try_at_home_json);
END;
CREATE TRIGGER IF NOT EXISTS labs_au AFTER UPDATE ON labs BEGIN
  INSERT INTO labs_fts(labs_fts, rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES('delete', old.id, old.title, old.tldr_json, old.walkthrough_json, old.quiz_json, old.flashcards_json, old.try_at_home_json);
  INSERT INTO labs_fts(rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES (new.id, new.title, new.tldr_json, new.walkthrough_json, new.quiz_json, new.flashcards_json, new.try_at_home_json);
END;

-- Progress tracking (anonymous UUID, multi-device).
CREATE TABLE IF NOT EXISTS progress (
  user_uuid TEXT NOT NULL,
  lab_slug TEXT NOT NULL,
  opened_at INTEGER,
  completed_at INTEGER,
  quiz_score INTEGER,
  last_updated INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_uuid, lab_slug)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_uuid, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_labs_module ON labs(module, slug);
