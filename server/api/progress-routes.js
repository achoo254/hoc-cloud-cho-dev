import { Hono } from 'hono';
import { Progress } from '../db/models/index.js';
import { anonUuidMiddleware } from '../lib/anon-uuid-cookie.js';
import { requireAuth } from '../auth/require-auth.js';

const SLUG_RE = /^[a-z0-9-]{1,64}$/i;

export const progressRoutes = new Hono()
  .use('/api/progress', anonUuidMiddleware)
  .use('/api/progress/*', anonUuidMiddleware)

  .get('/api/me', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ user: null });
    return c.json({
      user: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
      },
    });
  })

  .get('/api/progress', async (c) => {
    const user = c.get('user');
    const query = user ? { userId: user._id } : { userUuid: c.get('userUuid') };

    const rows = await Progress.find(query)
      .select('labSlug openedAt completedAt quizScore lastUpdated')
      .sort({ lastUpdated: -1 })
      .lean();

    const progress = rows.map(r => ({
      lab_slug: r.labSlug,
      opened_at: r.openedAt ? Math.floor(r.openedAt.getTime() / 1000) : null,
      completed_at: r.completedAt ? Math.floor(r.completedAt.getTime() / 1000) : null,
      quiz_score: r.quizScore,
      last_updated: r.lastUpdated ? Math.floor(r.lastUpdated.getTime() / 1000) : null,
    }));

    return c.json({ progress });
  })

  .post('/api/progress', requireAuth, async (c) => {
    const user = c.get('user');

    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }

    if (!body || !SLUG_RE.test(String(body.lab_slug || ''))) {
      return c.json({ error: 'invalid_lab_slug' }, 400);
    }

    const update = {
      ...(body.opened_at != null && Number.isFinite(body.opened_at) && body.opened_at > 0
          ? { openedAt: new Date(body.opened_at * 1000) } : {}),
      ...(body.completed_at != null && Number.isFinite(body.completed_at) && body.completed_at > 0
          ? { completedAt: new Date(body.completed_at * 1000) } : {}),
      ...(body.quiz_score != null && Number.isFinite(body.quiz_score)
          ? { quizScore: Math.max(0, Math.min(100, Math.floor(body.quiz_score))) } : {}),
    };

    await Progress.findOneAndUpdate(
      { userId: user._id, labSlug: body.lab_slug },
      { $set: update, $setOnInsert: { userId: user._id, labSlug: body.lab_slug } },
      { upsert: true }
    );

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
    const bulkOps = [];

    for (const it of body.items) {
      if (!SLUG_RE.test(String(it.lab_slug || ''))) continue;

      bulkOps.push({
        updateOne: {
          filter: { userUuid: uuid, labSlug: it.lab_slug },
          update: {
            $set: {
              userId: user._id,
              ...(Number.isFinite(it.opened_at) && { openedAt: new Date(it.opened_at * 1000) }),
              ...(Number.isFinite(it.completed_at) && { completedAt: new Date(it.completed_at * 1000) }),
              ...(Number.isFinite(it.quiz_score) && { quizScore: Math.max(0, Math.min(100, it.quiz_score | 0)) }),
            },
            $setOnInsert: { userUuid: uuid, labSlug: it.lab_slug },
          },
          upsert: true,
        },
      });
      imported++;
    }

    if (bulkOps.length > 0) {
      await Progress.bulkWrite(bulkOps);
    }

    return c.json({ ok: true, imported });
  });
