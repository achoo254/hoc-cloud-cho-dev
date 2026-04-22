import { Hono } from 'hono';
import { getMeiliClient } from '../db/meilisearch-client.js';

export const searchRoutes = new Hono()
  .get('/api/search', async (c) => {
    const raw = c.req.query('q');
    const q = String(raw || '').trim();

    if (q.length < 2) {
      return c.json({ results: [] });
    }

    try {
      const meili = getMeiliClient();
      const index = meili.index('labs');

      const searchResult = await index.search(q, {
        limit: 10,
        attributesToHighlight: ['title', 'tldrTerms', 'tldrDefinitions'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      });

      const results = searchResult.hits.map(hit => ({
        slug: hit.slug,
        module: hit.module,
        title: hit.title,
        preview: hit._formatted?.tldrDefinitions?.slice(0, 200) || '',
      }));

      return c.json({ results });
    } catch (err) {
      console.error('[search] Meilisearch error:', err.message);
      return c.json({ error: 'search_failed', results: [] }, 500);
    }
  });
