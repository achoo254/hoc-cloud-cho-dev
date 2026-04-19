import { Hono } from 'hono';
import {
  listTopics,
  getTopicBySlug,
  listSectionsByTopic,
  getSectionBySlug,
  searchSections,
} from '../content/section-service.js';
import { render, extractHeadings, stripMarkdown } from '../content/markdown-renderer.js';

export const theoryRoutes = new Hono();

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseHead({ title, description, canonical }) {
  const desc = esc(description || '');
  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${desc}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="/_shared/lab-template.css">
<style>
  body { display:flex; min-height:100vh; margin:0; }
  .theory-sidebar {
    width: 260px; border-right:1px solid var(--border,#333);
    padding:20px 16px; overflow-y:auto; max-height:100vh; position:sticky; top:0;
    background: var(--bg-elev,#1a1a1a); flex-shrink:0;
  }
  .theory-sidebar h3 { font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-dim,#888); margin:16px 0 6px; }
  .theory-sidebar a { display:block; padding:6px 10px; border-radius:4px; color:inherit; text-decoration:none; font-size:13px; }
  .theory-sidebar a:hover { background: rgba(255,255,255,0.05); }
  .theory-sidebar a.active { background: rgba(74,158,255,0.15); color: var(--accent,#4a9eff); }
  main.theory-main { flex:1; padding:32px 40px; max-width:840px; }
  main.theory-main h1:first-child { margin-top:0; }
  .theory-toc {
    position:sticky; top:20px; width:220px; padding:20px 16px; align-self:flex-start;
    font-size:13px; max-height:calc(100vh - 40px); overflow-y:auto;
  }
  .theory-toc h4 { font-size:11px; color:var(--text-dim,#888); text-transform:uppercase; margin:0 0 8px; }
  .theory-toc a { display:block; padding:3px 0; color:var(--text-dim,#888); text-decoration:none; font-size:12px; }
  .theory-toc a:hover, .theory-toc a.active { color: var(--accent,#4a9eff); }
  .theory-toc .toc-h3 { padding-left: 12px; }
  @media (max-width: 900px) {
    body { flex-direction:column; }
    .theory-sidebar { position:static; width:auto; max-height:none; }
    main.theory-main { padding: 20px; }
    .theory-toc { display:none; }
  }
</style>
</head>`;
}

function renderSidebar(topics, activeTopicSlug, activeSectionSlug) {
  const items = topics
    .map((t) => {
      const sections = listSectionsByTopic(t.id);
      const isActive = t.slug === activeTopicSlug;
      const secList = sections
        .map(
          (s) =>
            `<a href="/theory/${esc(t.slug)}/${esc(s.slug)}" class="${
              isActive && s.slug === activeSectionSlug ? 'active' : ''
            }">${esc(s.title)}</a>`
        )
        .join('');
      return `
        <h3><a href="/theory/${esc(t.slug)}" style="padding:0">${esc(t.title)}</a></h3>
        <div>${secList}</div>`;
    })
    .join('');
  return `<aside class="theory-sidebar">
    <a href="/theory" style="font-weight:600; padding:0 0 12px">📚 Theory</a>
    ${items}
  </aside>`;
}

function renderToc(headings) {
  if (!headings.length) return '';
  const items = headings
    .map(
      (h) =>
        `<a href="#${esc(h.id)}" class="toc-h${h.level}">${esc(h.text)}</a>`
    )
    .join('');
  return `<aside class="theory-toc"><h4>On this page</h4>${items}</aside>`;
}

theoryRoutes.get('/theory', (c) => {
  const topics = listTopics();
  const cards = topics
    .map((t) => {
      const secs = listSectionsByTopic(t.id);
      return `<article class="lab-section" style="margin-bottom:16px">
        <h2><a href="/theory/${esc(t.slug)}">${esc(t.title)}</a></h2>
        <ul style="list-style:none; padding:0; margin:8px 0">${secs
          .map(
            (s) =>
              `<li><a href="/theory/${esc(t.slug)}/${esc(s.slug)}">${esc(s.title)}</a></li>`
          )
          .join('')}</ul>
      </article>`;
    })
    .join('');
  return c.html(
    baseHead({ title: 'Theory — hoc-cloud', description: 'Lý thuyết thực chiến cho dev học cloud/devops.' }) +
      `<body><main class="theory-main lab-container">
        <h1>📚 Theory</h1>
        <p>Các module lý thuyết thực chiến. Chọn topic để bắt đầu.</p>
        ${cards || '<p style="color:var(--text-dim,#888)">Chưa có topic nào.</p>'}
      </main></body></html>`
  );
});

theoryRoutes.get('/theory/:topic', (c) => {
  const topic = getTopicBySlug(c.req.param('topic'));
  if (!topic) return c.notFound();
  const sections = listSectionsByTopic(topic.id);
  const topics = listTopics();
  return c.html(
    baseHead({
      title: `${topic.title} — Theory`,
      description: `Sections trong topic ${topic.title}`,
    }) +
      `<body>
        ${renderSidebar(topics, topic.slug, null)}
        <main class="theory-main lab-container">
          <h1>${esc(topic.title)}</h1>
          <ul>${sections
            .map(
              (s) =>
                `<li><a href="/theory/${esc(topic.slug)}/${esc(s.slug)}">${esc(s.title)}</a></li>`
            )
            .join('')}</ul>
        </main>
        <script src="/_shared/theory-reader.js" type="module"></script>
      </body></html>`
  );
});

theoryRoutes.get('/theory/:topic/:section', (c) => {
  const topic = getTopicBySlug(c.req.param('topic'));
  if (!topic) return c.notFound();
  const section = getSectionBySlug(topic.id, c.req.param('section'));
  if (!section) return c.notFound();

  const html = render(section.body_md, `section:${section.id}:${section.updated_at}`);
  const headings = extractHeadings(html);
  const description = stripMarkdown(section.body_md);
  const topics = listTopics();
  const base = process.env.PUBLIC_BASE_URL || '';
  const canonical = base ? `${base}/theory/${topic.slug}/${section.slug}` : '';

  return c.html(
    baseHead({
      title: `${section.title} — ${topic.title} | hoc-cloud`,
      description,
      canonical,
    }) +
      `<body data-section-id="${section.id}">
        ${renderSidebar(topics, topic.slug, section.slug)}
        <main class="theory-main lab-container">
          <nav style="color:var(--text-dim,#888); font-size:13px; margin-bottom:12px">
            <a href="/theory">Theory</a> / <a href="/theory/${esc(topic.slug)}">${esc(topic.title)}</a>
          </nav>
          <article>${html}</article>
        </main>
        ${renderToc(headings)}
        <script src="/_shared/mermaid-init.js" type="module"></script>
        <script src="/_shared/theory-reader.js" type="module"></script>
      </body></html>`
  );
});

theoryRoutes.get('/api/search', (c) => {
  const q = c.req.query('q') || '';
  return c.json({ results: searchSections(q, 15) });
});
