# Phase 3: Markdown Render Pipeline

**Priority:** P1 | **Status:** pending | **Effort:** 1.5d

## Goal
Server-side render markdown → HTML với code highlight (Shiki), callouts, anchor headings. Mermaid để client render.

## Requirements
- Render deterministic (cache được)
- Code blocks: Shiki với theme `github-dark` (khớp site)
- Callouts syntax: `> [!INFO] Title` / `> [!WARN]` / `> [!TIP]`
- Mermaid: fence ```mermaid``` → `<div class="mermaid">...</div>`, client-side init
- Heading IDs tự generate (slug) để anchor link + scroll memory

## Implementation Steps

### 1. Install
```bash
npm i markdown-it markdown-it-anchor shiki
```

### 2. `server/content/markdown-renderer.js`
```js
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import { createHighlighter } from 'shiki';

const LANGS = ['bash', 'yaml', 'json', 'javascript', 'typescript', 'python', 'sql', 'dockerfile', 'nginx', 'ini'];
const highlighter = await createHighlighter({ themes: ['github-dark'], langs: LANGS });

export const md = new MarkdownIt({
  html: false, linkify: true, breaks: false,
  highlight: (code, lang) => {
    if (lang === 'mermaid') {
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }
    if (!LANGS.includes(lang)) return ''; // default escape
    return highlighter.codeToHtml(code, { lang, theme: 'github-dark' });
  }
});

md.use(anchor, { slugify: s => s.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') });

// Callout plugin
md.use(calloutPlugin);

export function render(src) { return md.render(src); }
```

### 3. Callout plugin (blockquote transformer)
- Parse blockquote đầu dòng `[!TYPE] Title`
- Output `<div class="callout callout-{type}"><div class="callout-title">...</div>{rest}</div>`
- Types: INFO, WARN, TIP, DANGER

### 4. CSS cho callouts — append vào `labs/_shared/lab-template.css`
```css
.callout { border-left: 3px solid; padding: 12px 16px; margin: 16px 0; border-radius: 4px; }
.callout-info  { border-color: #6bb8ff; background: rgba(107,184,255,0.08); }
.callout-warn  { border-color: #ffb86b; background: rgba(255,184,107,0.08); }
.callout-tip   { border-color: #7fd18a; background: rgba(127,209,138,0.08); }
.callout-danger{ border-color: #ff6b6b; background: rgba(255,107,107,0.08); }
.callout-title { font-weight: 600; margin-bottom: 6px; font-family: var(--mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
```

### 5. Mermaid client init
Add `labs/_shared/mermaid-init.js`:
```js
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'dark' });
```
Include chỉ khi page có `.mermaid`.

### 6. Render cache (optional, small win)
- Key: `section_id + updated_at`
- In-memory Map, max 200 entries, LRU evict
- Invalidate khi section UPDATE/DELETE

### 7. API endpoint `/api/render` cho admin preview
```js
app.post('/admin/api/render', adminGuard, async (c) => {
  const { md: src } = await c.req.json();
  return c.json({ html: render(src) });
});
```

## Tasks
- [ ] Install markdown-it, markdown-it-anchor, shiki
- [ ] Implement markdown-renderer.js
- [ ] Callout plugin
- [ ] Append callout CSS vào lab-template.css
- [ ] Mermaid init script
- [ ] Render cache (optional)
- [ ] `/admin/api/render` endpoint cho preview
- [ ] Smoke test: render sample MD với code + mermaid + callout → HTML đúng

## Acceptance
- Code block Shiki highlight đúng language
- Mermaid diagram render client-side không lỗi
- Callouts hiển thị 4 style (info/warn/tip/danger)
- Heading có id anchor, click `#heading-id` scroll đúng
- `/admin/api/render` trả HTML preview cho editor
