import { Hono } from 'hono';
import { Exercise } from '../db/models/index.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireOwner } from '../auth/require-owner.js';

const SLUG_RE = /^[a-z0-9-]{1,64}$/i;

// Map MongoDB doc → FE ExerciseContent (snake_case, mirror labs-routes toLabContent)
function toExerciseContent(doc) {
  if (!doc) return null;
  return {
    slug: doc.slug,
    title: doc.title,
    topic: doc.topic ?? null,
    tags: doc.tags ?? [],
    source: doc.source ?? null,
    brief: doc.brief ?? '',
    estimated_minutes: doc.estimatedMinutes ?? null,
    content_hash: doc.contentHash,
    updated_at: doc.updatedAt ? Math.floor(new Date(doc.updatedAt).getTime() / 1000) : null,
    guide: doc.guide ?? [],
    demo: doc.demo ?? [],
    references: doc.references ?? [],
  };
}

function toIndexEntry(doc) {
  return {
    slug: doc.slug,
    title: doc.title,
    topic: doc.topic ?? null,
    tags: doc.tags ?? [],
    estimated_minutes: doc.estimatedMinutes ?? null,
    updated_at: doc.updatedAt ? Math.floor(new Date(doc.updatedAt).getTime() / 1000) : null,
  };
}

// Owner-gate áp inline trên TỪNG route (requireAuth → 401, requireOwner → 403).
// Per-route middleware chạy đúng 1 lần và phủ chính xác route đó — không rò sang
// route khác (labs/progress/search) khi mount chung app, không double-exec.
export const exercisesRoutes = new Hono()
  .get('/api/exercises', requireAuth, requireOwner, async (c) => {
    const rows = await Exercise.find({})
      .select('slug title topic tags estimatedMinutes updatedAt')
      .sort({ topic: 1, slug: 1 })
      .lean();
    return c.json({ exercises: rows.map(toIndexEntry) });
  })

  .get('/api/exercises/:slug', requireAuth, requireOwner, async (c) => {
    const slug = c.req.param('slug');
    if (!SLUG_RE.test(slug)) {
      return c.json({ error: 'invalid_slug' }, 400);
    }
    const doc = await Exercise.findOne({ slug }).lean();
    if (!doc) {
      return c.json({ error: 'not_found' }, 404);
    }
    return c.json({ exercise: toExerciseContent(doc) });
  });
