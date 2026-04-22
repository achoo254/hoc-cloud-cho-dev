import { Hono } from 'hono';
import { Progress, MigrationBatch } from '../db/models/index.js';
import { anonUuidMiddleware } from '../lib/anon-uuid-cookie.js';
import { requireAuth } from '../auth/require-auth.js';

const SLUG_RE = /^[a-z0-9-]{1,64}$/i;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  /**
   * POST /api/progress/migrate
   *
   * Merges guest progress (keyed by userUuid cookie) into the authed user's
   * bucket (keyed by userId). Body: { batchId }.
   *
   * Two-phase pattern guards against mid-run crashes without transactions:
   *   pending → bulkWrite → completed. Replay of the same batchId is safe
   *   because the bulkWrite itself is idempotent (`$setOnInsert` + `$min`).
   */
  .post('/api/progress/migrate', requireAuth, async (c) => {
    const user = c.get('user');
    const uuid = c.get('userUuid');

    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }

    const batchId = String(body?.batchId || '');
    if (!UUID_V4_RE.test(batchId)) {
      return c.json({ error: 'invalid_batch_id' }, 400);
    }
    if (!uuid) {
      // No guest cookie → nothing to migrate; treat as a no-op success.
      return c.json({ ok: true, imported: 0, batchId, status: 'completed' });
    }

    // Phase 1 — claim the batch. Duplicate key means a prior attempt exists.
    let batchDoc;
    try {
      batchDoc = await MigrationBatch.create({
        userId: user._id,
        batchId,
        status: 'pending',
      });
    } catch (err) {
      if (err?.code !== 11000) throw err;
      const existing = await MigrationBatch.findOne({ userId: user._id, batchId }).lean();
      if (existing?.status === 'completed') {
        return c.json({
          ok: true,
          imported: existing.imported ?? 0,
          batchId,
          status: 'already_applied',
        });
      }
      // Still pending → caller should retry later; another worker may be
      // finishing the bulkWrite, or a prior attempt crashed mid-run.
      return c.json({ ok: true, batchId, status: 'in_progress' }, 202);
    }

    // Read guest bucket from server-side (FE does not ship items to avoid
    // racing the cookie swap after login).
    const guestRows = await Progress.find({ userUuid: uuid }).lean();

    const bulkOps = guestRows
      .filter((row) => SLUG_RE.test(String(row.labSlug || '')))
      .map((row) => {
        const setOps = {};
        if (Number.isFinite(row.quizScore)) {
          setOps.quizScore = Math.max(0, Math.min(100, row.quizScore | 0));
        }
        if (row.lastOpenedAt) setOps.lastOpenedAt = row.lastOpenedAt;

        const minOps = {};
        if (row.openedAt) minOps.openedAt = row.openedAt;
        if (row.completedAt) minOps.completedAt = row.completedAt;

        return {
          updateOne: {
            filter: { userId: user._id, labSlug: row.labSlug },
            update: {
              $setOnInsert: { userId: user._id, labSlug: row.labSlug },
              ...(Object.keys(setOps).length ? { $set: setOps } : {}),
              ...(Object.keys(minOps).length ? { $min: minOps } : {}),
            },
            upsert: true,
          },
        };
      });

    // Unordered: one bad row should not halt the rest. Re-running after a
    // partial failure is safe (idempotent ops).
    let imported = 0;
    if (bulkOps.length > 0) {
      const result = await Progress.bulkWrite(bulkOps, { ordered: false });
      imported = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
    }

    // Phase 2 — mark completed.
    batchDoc.status = 'completed';
    batchDoc.completedAt = new Date();
    batchDoc.itemCount = guestRows.length;
    batchDoc.imported = imported;
    await batchDoc.save();

    return c.json({ ok: true, imported, batchId, status: 'completed' });
  });
