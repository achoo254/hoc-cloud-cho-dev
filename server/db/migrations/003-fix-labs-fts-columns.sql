-- Rebuild labs_fts with column names matching labs.* so external-content
-- lookups (MATCH, highlight, snippet) resolve properly.

DROP TRIGGER IF EXISTS labs_ai;
DROP TRIGGER IF EXISTS labs_ad;
DROP TRIGGER IF EXISTS labs_au;
DROP TABLE IF EXISTS labs_fts;

CREATE VIRTUAL TABLE labs_fts USING fts5(
  title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json,
  content='labs', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER labs_ai AFTER INSERT ON labs BEGIN
  INSERT INTO labs_fts(rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES (new.id, new.title, new.tldr_json, new.walkthrough_json, new.quiz_json, new.flashcards_json, new.try_at_home_json);
END;
CREATE TRIGGER labs_ad AFTER DELETE ON labs BEGIN
  INSERT INTO labs_fts(labs_fts, rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES('delete', old.id, old.title, old.tldr_json, old.walkthrough_json, old.quiz_json, old.flashcards_json, old.try_at_home_json);
END;
CREATE TRIGGER labs_au AFTER UPDATE ON labs BEGIN
  INSERT INTO labs_fts(labs_fts, rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES('delete', old.id, old.title, old.tldr_json, old.walkthrough_json, old.quiz_json, old.flashcards_json, old.try_at_home_json);
  INSERT INTO labs_fts(rowid, title, tldr_json, walkthrough_json, quiz_json, flashcards_json, try_at_home_json)
  VALUES (new.id, new.title, new.tldr_json, new.walkthrough_json, new.quiz_json, new.flashcards_json, new.try_at_home_json);
END;

-- Rebuild index from existing labs rows.
INSERT INTO labs_fts(labs_fts) VALUES('rebuild');
