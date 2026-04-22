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
      .select('labSlug openedAt lastOpenedAt completedAt quizScore lastUpdated')
      .sort({ lastUpdated: -1 })
      .lean();

    const progress = rows.map(r => ({
      lab_slug: r.labSlug,
      opened_at: r.openedAt ? Math.floor(r.openedAt.getTime() / 1000) : null,
      last_opened_at: r.lastOpenedAt ? Math.floor(r.lastOpenedAt.getTime() / 1000) : null,
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

    // Conditional $set (quizScore only — completedAt goes through $min below so
    // earliest completion wins across quiz/flashcard races)
    const setOps = {
      ...(body.quiz_score != null && Number.isFinite(body.quiz_score)
          ? { quizScore: Math.max(0, Math.min(100, Math.floor(body.quiz_score))) } : {}),
    };

    const completedAt =
      body.completed_at != null && Number.isFinite(body.completed_at) && body.completed_at > 0
        ? new Date(body.completed_at * 1000)
        : null;

    // lastOpenedAt bumps on every write — quiz/flashcard activity also counts
    // as "latest touch" for recent-activity sorting, even when /touch was not
    // fired in the same session (e.g. SPA resume from cached route).
    const updateDoc = {
      $setOnInsert: { userId: user._id, labSlug: body.lab_slug, openedAt: new Date() },
      $set: { ...setOps, lastOpenedAt: new Date() },
      ...(completedAt ? { $min: { completedAt } } : {}),
    };

    await Progress.findOneAndUpdate(
      { userId: user._id, labSlug: body.lab_slug },
      updateDoc,
      { upsert: true }
    );

    return c.json({ ok: true });
  })

  // Touch-only endpoint — called on every lab mount.
  // Sets openedAt once ($setOnInsert) + always bumps lastOpenedAt ($set).
  // Separated from POST /api/progress to keep upsert payload clean.
  .post('/api/progress/touch', requireAuth, async (c) => {
    const user = c.get('user');

    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }

    if (!body || !SLUG_RE.test(String(body.lab_slug || ''))) {
      return c.json({ error: 'invalid_lab_slug' }, 400);
    }

    const now = new Date();
    await Progress.findOneAndUpdate(
      { userId: user._id, labSlug: body.lab_slug },
      {
        $setOnInsert: { userId: user._id, labSlug: body.lab_slug, openedAt: now },
        $set: { lastOpenedAt: now },
      },
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

      const openedAt = Number.isFinite(it.opened_at) ? new Date(it.opened_at * 1000) : null;
      const completedAt = Number.isFinite(it.completed_at) ? new Date(it.completed_at * 1000) : null;

      const updateDoc = {
        $set: {
          userId: user._id,
          ...(Number.isFinite(it.quiz_score)
            ? { quizScore: Math.max(0, Math.min(100, it.quiz_score | 0)) }
            : {}),
        },
        $setOnInsert: { userUuid: uuid, labSlug: it.lab_slug },
        // $min preserves earliest timestamps across merges
        ...(openedAt || completedAt
          ? {
              $min: {
                ...(openedAt ? { openedAt } : {}),
                ...(completedAt ? { completedAt } : {}),
              },
            }
          : {}),
      };

      bulkOps.push({
        updateOne: {
          filter: { userUuid: uuid, labSlug: it.lab_slug },
          update: updateDoc,
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
