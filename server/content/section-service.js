import db from '../db/sqlite-client.js';
import { invalidateCache } from './markdown-renderer.js';

const now = () => Math.floor(Date.now() / 1000);

export function listTopics() {
  return db
    .prepare('SELECT * FROM topics ORDER BY order_idx, id')
    .all();
}

export function getTopicBySlug(slug) {
  return db.prepare('SELECT * FROM topics WHERE slug = ?').get(slug);
}

export function getTopicById(id) {
  return db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
}

export function createTopic({ slug, title, order_idx = null }) {
  if (order_idx === null) order_idx = nextTopicOrder();
  const info = db
    .prepare('INSERT INTO topics (slug, title, order_idx) VALUES (?,?,?)')
    .run(slug, title, order_idx);
  return info.lastInsertRowid;
}

export function updateTopic(id, { slug, title, order_idx }) {
  const cur = getTopicById(id);
  if (!cur) return 0;
  return db
    .prepare('UPDATE topics SET slug=?, title=?, order_idx=? WHERE id=?')
    .run(slug ?? cur.slug, title ?? cur.title, order_idx ?? cur.order_idx, id).changes;
}

export function deleteTopic(id) {
  return db.prepare('DELETE FROM topics WHERE id=?').run(id).changes;
}

export function nextTopicOrder() {
  const row = db.prepare('SELECT COALESCE(MAX(order_idx),-1)+1 AS n FROM topics').get();
  return row?.n ?? 0;
}

export function listSectionsByTopic(topic_id) {
  return db
    .prepare(
      'SELECT id, topic_id, slug, title, order_idx, updated_at FROM sections WHERE topic_id=? ORDER BY order_idx, id'
    )
    .all(topic_id);
}

export function listAllSections() {
  return db
    .prepare(
      `SELECT s.id, s.topic_id, s.slug, s.title, s.order_idx, s.updated_at,
              t.slug AS topic_slug, t.title AS topic_title
       FROM sections s JOIN topics t ON s.topic_id = t.id
       ORDER BY t.order_idx, t.id, s.order_idx, s.id`
    )
    .all();
}

export function getSectionById(id) {
  return db.prepare('SELECT * FROM sections WHERE id=?').get(id);
}

export function getSectionBySlug(topic_id, slug) {
  return db.prepare('SELECT * FROM sections WHERE topic_id=? AND slug=?').get(topic_id, slug);
}

export function createSection({ topic_id, slug, title, body_md = '', order_idx = null }) {
  if (order_idx === null) order_idx = nextSectionOrder(topic_id);
  const info = db
    .prepare(
      'INSERT INTO sections (topic_id, slug, title, body_md, order_idx, updated_at) VALUES (?,?,?,?,?,?)'
    )
    .run(topic_id, slug, title, body_md, order_idx, now());
  return info.lastInsertRowid;
}

export function updateSection(id, patch) {
  const cur = getSectionById(id);
  if (!cur) return 0;
  const next = {
    topic_id: patch.topic_id ?? cur.topic_id,
    slug: patch.slug ?? cur.slug,
    title: patch.title ?? cur.title,
    body_md: patch.body_md ?? cur.body_md,
    order_idx: patch.order_idx ?? cur.order_idx,
  };
  const changes = db
    .prepare(
      'UPDATE sections SET topic_id=?, slug=?, title=?, body_md=?, order_idx=?, updated_at=? WHERE id=?'
    )
    .run(next.topic_id, next.slug, next.title, next.body_md, next.order_idx, now(), id).changes;
  invalidateCache(`section:${id}`);
  return changes;
}

export function deleteSection(id) {
  const changes = db.prepare('DELETE FROM sections WHERE id=?').run(id).changes;
  invalidateCache(`section:${id}`);
  return changes;
}

export function nextSectionOrder(topic_id) {
  const row = db
    .prepare('SELECT COALESCE(MAX(order_idx),-1)+1 AS n FROM sections WHERE topic_id=?')
    .get(topic_id);
  return row?.n ?? 0;
}

export const reorderItems = db.transaction((items) => {
  const upd = db.prepare('UPDATE sections SET order_idx=?, topic_id=? WHERE id=?');
  for (const it of items) upd.run(it.order_idx, it.topic_id, it.id);
});

export const reorderTopics = db.transaction((items) => {
  const upd = db.prepare('UPDATE topics SET order_idx=? WHERE id=?');
  for (const it of items) upd.run(it.order_idx, it.id);
});

export function searchSections(query, limit = 20) {
  if (!query?.trim()) return [];
  const q = query.trim().replace(/"/g, '""');
  try {
    return db
      .prepare(
        `SELECT s.id, s.slug, s.title, t.slug AS topic_slug, t.title AS topic_title,
                snippet(sections_fts, 1, '<mark>', '</mark>', '…', 16) AS snippet
         FROM sections_fts
         JOIN sections s ON s.id = sections_fts.rowid
         JOIN topics t ON s.topic_id = t.id
         WHERE sections_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(`"${q}"*`, limit);
  } catch {
    return [];
  }
}
