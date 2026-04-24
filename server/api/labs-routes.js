import { Hono } from 'hono';
import { Lab } from '../db/models/index.js';

const SLUG_RE = /^[a-z0-9-]{1,64}$/i;

// Map MongoDB doc → FE LabContent (snake_case fields expected by Zod schema v3)
function toLabContent(doc) {
  if (!doc) return null;
  return {
    slug: doc.slug,
    module: doc.module,
    title: doc.title,
    estimated_minutes: doc.estimatedMinutes ?? null,
    content_hash: doc.contentHash,
    updated_at: doc.updatedAt ? Math.floor(new Date(doc.updatedAt).getTime() / 1000) : null,
    tldr: doc.tldr ?? [],
    walkthrough: doc.walkthrough ?? [],
    quiz: doc.quiz ?? [],
    flashcards: doc.flashcards ?? [],
    try_at_home: doc.tryAtHome ?? [],
    misconceptions: doc.misconceptions ?? [],
    diagram: doc.diagram ?? undefined,
  };
}

function toIndexEntry(doc) {
  return {
    slug: doc.slug,
    title: doc.title,
    module: doc.module,
    estimated_minutes: doc.estimatedMinutes ?? null,
    updated_at: doc.updatedAt ? Math.floor(new Date(doc.updatedAt).getTime() / 1000) : null,
    // tags derived from module until schema adds a tags field
    tags: [doc.module].filter(Boolean),
  };
}

export const labsRoutes = new Hono()
  .get('/api/labs', async (c) => {
    const rows = await Lab.find({})
      .select('slug title module estimatedMinutes updatedAt')
      .sort({ module: 1, slug: 1 })
      .lean();
    return c.json({ labs: rows.map(toIndexEntry) });
  })

  .get('/api/labs/:slug', async (c) => {
    const slug = c.req.param('slug');
    if (!SLUG_RE.test(slug)) {
      return c.json({ error: 'invalid_slug' }, 400);
    }

    const doc = await Lab.findOne({ slug }).lean();
    if (!doc) {
      return c.json({ error: 'not_found' }, 404);
    }

    return c.json({ lab: toLabContent(doc) });
  });
