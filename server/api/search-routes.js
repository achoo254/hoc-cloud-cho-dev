// GET /api/search?q=... — FTS5 full-text search over labs_fts.
import { Hono } from 'hono';
import db from '../db/sqlite-client.js';

// FTS5 query sanitizer: strip chars that break MATCH grammar, split into tokens,
// wrap each with prefix-star for incremental search, join with AND (space).
function toFtsQuery(raw) {
  const tokens = String(raw || '')
    .replace(/["()*:^]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
    .slice(0, 8);
  if (!tokens.length) return null;
  return tokens.map(t => `"${t}"*`).join(' ');
}

const searchStmt = db.prepare(`
  SELECT l.slug, l.module, l.title, l.file_path,
         snippet(labs_fts, -1, '<mark>', '</mark>', '…', 20) AS preview,
         bm25(labs_fts) AS rank
  FROM labs_fts
  JOIN labs l ON l.id = labs_fts.rowid
  WHERE labs_fts MATCH ?
  ORDER BY rank
  LIMIT 10
`);

export const searchRoutes = new Hono()
  .get('/api/search', (c) => {
    const raw = c.req.query('q');
    const q = toFtsQuery(raw);
    if (!q) return c.json({ results: [] });
    try {
      const rows = searchStmt.all(q);
      return c.json({ results: rows });
    } catch (err) {
      return c.json({ error: 'search_failed', message: err.message, results: [] }, 500);
    }
  });
