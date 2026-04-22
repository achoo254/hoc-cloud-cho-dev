import { Hono } from 'hono';
import { getMeiliClient } from '../db/meilisearch-client.js';

// Control-char delimiters — collision-free with content, safe through JSON.
// Client parses these back into <mark> React elements.
const HL_START = '';
const HL_END = '';

// Preview preference order: tldr is the canonical summary, walkthrough/quiz/etc. follow.
const PREVIEW_FIELDS = ['tldrText', 'walkthroughText', 'quizText', 'flashcardText', 'tryAtHomeText'];

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
        attributesToHighlight: ['title', ...PREVIEW_FIELDS],
        attributesToCrop: PREVIEW_FIELDS,
        cropLength: 40,
        highlightPreTag: HL_START,
        highlightPostTag: HL_END,
      });

      // Prefer the first field that actually contains a highlight; fall back to first non-empty.
      // Meili returns `_formatted` for every requested attribute, so a simple `||` chain picks
      // the first non-empty string even when the match lives in a later field.
      const pickPreview = (f) => {
        if (!f) return '';
        for (const k of PREVIEW_FIELDS) {
          if (typeof f[k] === 'string' && f[k].includes(HL_START)) return f[k];
        }
        for (const k of PREVIEW_FIELDS) {
          if (typeof f[k] === 'string' && f[k]) return f[k];
        }
        return '';
      };

      const results = searchResult.hits.map(hit => ({
        slug: hit.slug,
        module: hit.module,
        title: hit._formatted?.title || hit.title,
        preview: pickPreview(hit._formatted).slice(0, 300),
      }));

      return c.json({ results });
    } catch (err) {
      console.error('[search] Meilisearch error:', err.message);
      return c.json({ error: 'search_failed', results: [] }, 500);
    }
  });
