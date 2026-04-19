import { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminGuard } from '../auth/admin-guard.js';
import { csrfGuard, issueCsrfToken } from '../auth/csrf.js';
import { render } from '../content/markdown-renderer.js';
import {
  listTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  listAllSections,
  listSectionsByTopic,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  reorderItems,
  reorderTopics,
} from '../content/section-service.js';
import { broadcastSectionUpdate } from '../lib/sse-reload.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const viewsDir = resolve(__dirname, 'views');
const readView = (name) => readFileSync(resolve(viewsDir, name), 'utf8');

export const adminRoutes = new Hono();

adminRoutes.get('/admin/login', (c) => c.html(readView('login.html')));

// All routes below require admin.
adminRoutes.use('/admin', adminGuard);
adminRoutes.use('/admin/*', adminGuard);
adminRoutes.use('/admin/api/*', csrfGuard);

function injectCsrf(html, token, user) {
  return html
    .replace(/\{\{CSRF\}\}/g, token)
    .replace(/\{\{USER\}\}/g, user?.github || '');
}

adminRoutes.get('/admin', (c) => {
  const token = issueCsrfToken(c);
  const user = c.get('user');
  return c.html(injectCsrf(readView('dashboard.html'), token, user));
});

adminRoutes.get('/admin/new-section', (c) => {
  const token = issueCsrfToken(c);
  const user = c.get('user');
  const html = readView('editor.html')
    .replace(/\{\{SECTION_ID\}\}/g, 'null')
    .replace(/\{\{SECTION_JSON\}\}/g, 'null');
  return c.html(injectCsrf(html, token, user));
});

adminRoutes.get('/admin/edit/:id', (c) => {
  const id = Number(c.req.param('id'));
  const section = getSectionById(id);
  if (!section) return c.text('Not found', 404);
  const token = issueCsrfToken(c);
  const user = c.get('user');
  const html = readView('editor.html')
    .replace(/\{\{SECTION_ID\}\}/g, String(id))
    .replace(/\{\{SECTION_JSON\}\}/g, JSON.stringify(section).replace(/</g, '\\u003c'));
  return c.html(injectCsrf(html, token, user));
});

// ---------- JSON API ----------

adminRoutes.get('/admin/api/topics', (c) => c.json({ topics: listTopics() }));

adminRoutes.get('/admin/api/overview', (c) => {
  return c.json({ topics: listTopics(), sections: listAllSections() });
});

adminRoutes.post('/admin/api/topics', async (c) => {
  const { slug, title } = await c.req.json();
  if (!slug || !title) return c.json({ error: 'slug+title required' }, 400);
  try {
    const id = createTopic({ slug, title });
    return c.json({ id });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

adminRoutes.put('/admin/api/topics/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const patch = await c.req.json();
  updateTopic(id, patch);
  return c.json({ ok: true });
});

adminRoutes.delete('/admin/api/topics/:id', (c) => {
  deleteTopic(Number(c.req.param('id')));
  return c.json({ ok: true });
});

adminRoutes.get('/admin/api/sections', (c) => {
  const topicId = c.req.query('topic_id');
  if (topicId) return c.json({ sections: listSectionsByTopic(Number(topicId)) });
  return c.json({ sections: listAllSections() });
});

adminRoutes.get('/admin/api/sections/:id', (c) => {
  const s = getSectionById(Number(c.req.param('id')));
  if (!s) return c.json({ error: 'not_found' }, 404);
  return c.json(s);
});

adminRoutes.post('/admin/api/sections', async (c) => {
  const { topic_id, slug, title, body_md } = await c.req.json();
  if (!topic_id || !slug || !title) return c.json({ error: 'topic_id+slug+title required' }, 400);
  try {
    const id = createSection({ topic_id, slug, title, body_md });
    broadcastSectionUpdate(id);
    return c.json({ id });
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});

adminRoutes.put('/admin/api/sections/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const patch = await c.req.json();
  const changed = updateSection(id, patch);
  if (!changed) return c.json({ error: 'not_found' }, 404);
  broadcastSectionUpdate(id);
  return c.json({ ok: true });
});

adminRoutes.delete('/admin/api/sections/:id', (c) => {
  const id = Number(c.req.param('id'));
  deleteSection(id);
  broadcastSectionUpdate(id);
  return c.json({ ok: true });
});

adminRoutes.post('/admin/api/reorder-sections', async (c) => {
  const { items } = await c.req.json();
  if (!Array.isArray(items)) return c.json({ error: 'items required' }, 400);
  reorderItems(items);
  return c.json({ ok: true });
});

adminRoutes.post('/admin/api/reorder-topics', async (c) => {
  const { items } = await c.req.json();
  if (!Array.isArray(items)) return c.json({ error: 'items required' }, 400);
  reorderTopics(items);
  return c.json({ ok: true });
});

adminRoutes.post('/admin/api/render', async (c) => {
  const { md } = await c.req.json();
  return c.json({ html: render(md || '') });
});
