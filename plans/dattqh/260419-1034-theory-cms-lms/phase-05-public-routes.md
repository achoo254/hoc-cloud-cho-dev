# Phase 5: Public Theory Routes + Live-Reload

**Priority:** P1 | **Status:** pending | **Effort:** 1d

## Goal
Render theory pages công khai, SEO-friendly, live-reload khi admin save.

## Requirements
- `/theory` → index topic list
- `/theory/:topic` → section list + outline sidebar
- `/theory/:topic/:section` → reader view
- Server render HTML (SEO), không đòi cookie
- Live-reload SSE push khi admin save section → client đang mở section đó reload

## Implementation Steps

### 1. `server/public/theory-routes.js`
```js
import { render } from '../content/markdown-renderer.js';
import { getTopicBySlug, getSectionBySlug, listTopics, listSectionsByTopic } from '../content/section-service.js';

export function registerTheoryRoutes(app) {
  app.get('/theory', (c) => {
    const topics = listTopics();
    return c.html(renderTopicIndex(topics));
  });
  app.get('/theory/:topic', (c) => {
    const topic = getTopicBySlug(c.req.param('topic'));
    if (!topic) return c.notFound();
    const sections = listSectionsByTopic(topic.id);
    return c.html(renderTopicPage(topic, sections));
  });
  app.get('/theory/:topic/:section', (c) => {
    const topic = getTopicBySlug(c.req.param('topic'));
    const section = getSectionBySlug(topic?.id, c.req.param('section'));
    if (!section) return c.notFound();
    const html = render(section.body_md);
    return c.html(renderReaderPage(topic, section, html));
  });
}
```

### 2. Reader layout (reuse lab-template.css)
- Sidebar trái: topic outline (section list)
- Main: rendered markdown
- Right rail (optional): TOC của headings trong section (generate từ `markdown-it-anchor` output)
- Footer: "Related labs" nếu có lab_links

### 3. SEO
- `<title>{section.title} — {topic.title} | hoc-cloud</title>`
- `<meta name="description">` = first 160 chars từ `body_md` stripped markdown
- `<link rel="canonical">`
- OG tags (placeholder, Phase 5 main)

### 4. Live-reload SSE (extend existing `server/server.js`)
Hiện `fs.watch` chỉ watch `labs/`. Extend:
```js
// server/lib/sse-reload.js (new or extend existing)
export function broadcastSectionUpdate(sectionId) {
  for (const send of sseClients) {
    try { send(`event: section-update\ndata: ${sectionId}\n\n`); } catch {}
  }
}
```
Admin save endpoint gọi `broadcastSectionUpdate(id)` sau khi commit.

### 5. Client SSE handler (update `labs/_shared/lab-template.js`)
```js
const es = new EventSource('/sse/reload');
es.addEventListener('section-update', (e) => {
  const currentId = document.body.dataset.sectionId;
  if (String(e.data) === currentId) location.reload();
});
es.addEventListener('reload', () => location.reload()); // existing
```

### 6. Scroll memory (refine existing)
- Đã có localStorage bookmark
- Thêm: IntersectionObserver trên `<h2>, <h3>` → cập nhật "current heading" vào bookmark
- Reload → scroll tới heading thay vì raw pixel (chính xác hơn khi content đổi)

## Tasks
- [ ] theory-routes.js với 3 routes
- [ ] Reader layout (sidebar + main + TOC)
- [ ] Topic index page
- [ ] SEO meta tags
- [ ] Extend SSE broadcast cho section-update event
- [ ] Client SSE handler nhận section-update
- [ ] IntersectionObserver cho heading-aware bookmark
- [ ] 404 page nếu topic/section không tồn tại

## Acceptance
- Public user truy cập `/theory/networking/tcp-udp` render OK không cần login
- View source thấy HTML đầy đủ (SEO crawl OK)
- Admin save section → tab public đang mở auto reload trong <1s
- Scroll xuống giữa section → reload → về đúng heading
- Sidebar outline hiển thị section list, active link highlight
