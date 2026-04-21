// GET/POST /api/progress — progress tracking for logged users + anonymous UUID fallback.
import { Hono } from 'hono';
import db from '../db/sqlite-client.js';
import { anonUuidMiddleware } from '../lib/anon-uuid-cookie.js';
import { requireAuth } from '../auth/require-auth.js';

const selectForUser = db.prepare(`
  SELECT lab_slug, opened_at, completed_at, quiz_score, last_updated
  FROM progress WHERE user_uuid = ? ORDER BY last_updated DESC
`);

const upsert = db.prepare(`
  INSERT INTO progress (user_id, user_uuid, lab_slug, opened_at, completed_at, quiz_score, last_updated)
  VALUES (@user_id, @user_uuid, @lab_slug, @opened_at, @completed_at, @quiz_score, strftime('%s','now'))
  ON CONFLICT(user_uuid, lab_slug) DO UPDATE SET
    user_id      = COALESCE(excluded.user_id, progress.user_id),
    opened_at    = COALESCE(excluded.opened_at, progress.opened_at),
    completed_at = COALESCE(excluded.completed_at, progress.completed_at),
    quiz_score   = COALESCE(excluded.quiz_score, progress.quiz_score),
    last_updated = strftime('%s','now')
`);

const selectForUserId = db.prepare(`
  SELECT lab_slug, opened_at, completed_at, quiz_score, last_updated
  FROM progress WHERE user_id = ? ORDER BY last_updated DESC
`);

const SLUG_RE = /^[a-z0-9-]{1,64}$/i;

export const progressRoutes = new Hono()
  .use('/api/progress', anonUuidMiddleware)
  .use('/api/progress/*', anonUuidMiddleware)
  .get('/api/me', (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ user: null });
    }
    return c.json({
      user: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
      },
    });
  })
  .get('/api/progress', (c) => {
    const user = c.get('user');
    if (user) {
      const rows = selectForUserId.all(user.id);
      return c.json({ progress: rows });
    }
    const uuid = c.get('userUuid');
    const rows = selectForUser.all(uuid);
    return c.json({ progress: rows });
  })
  .post('/api/progress', requireAuth, async (c) => {
    const user = c.get('user');
    const uuid = c.get('userUuid');
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }
    if (!body || !SLUG_RE.test(String(body.lab_slug || ''))) {
      return c.json({ error: 'invalid_lab_slug' }, 400);
    }
    upsert.run({
      user_id: user.id,
      user_uuid: uuid,
      lab_slug: body.lab_slug,
      opened_at: Number.isFinite(body.opened_at) ? body.opened_at : null,
      completed_at: Number.isFinite(body.completed_at) ? body.completed_at : null,
      quiz_score: Number.isFinite(body.quiz_score) ? Math.max(0, Math.min(100, body.quiz_score | 0)) : null,
    });
    return c.json({ ok: true });
  })
  .post('/api/progress/migrate', requireAuth, async (c) => {
    const user = c.get('user');
    const uuid = c.get('userUuid');
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }
    if (!Array.isArray(body?.items)) return c.json({ error: 'items_required' }, 400);
    if (body.items.length > 200) return c.json({ error: 'too_many_items' }, 400);
    let imported = 0;
    const tx = db.transaction((items) => {
      for (const it of items) {
        if (!SLUG_RE.test(String(it.lab_slug || ''))) continue;
        upsert.run({
          user_id: user.id,
          user_uuid: uuid,
          lab_slug: it.lab_slug,
          opened_at: Number.isFinite(it.opened_at) ? it.opened_at : null,
          completed_at: Number.isFinite(it.completed_at) ? it.completed_at : null,
          quiz_score: Number.isFinite(it.quiz_score) ? Math.max(0, Math.min(100, it.quiz_score | 0)) : null,
        });
        imported++;
      }
    });
    tx(body.items);
    return c.json({ ok: true, imported });
  });
