# Phase 6: Labs HTML → Markdown Migration

**Priority:** P1 | **Status:** pending | **Effort:** 1d

## Goal
Migrate 8 phases labs (HTML) sang Markdown trong SQLite. Giữ nguyên format quan trọng (code blocks, sections, quiz data). Giữ file HTML gốc làm archive.

## Requirements
- 1-time script `server/scripts/migrate-labs-to-md.js`
- Dry-run mode (`--dry-run`): print diff, không ghi DB
- Preserve: headings, code blocks, lists, links, images
- Extract quiz data inline `data.quiz` → lưu vào reserved markdown fence hoặc bỏ lại cho Phase 4
- Archive: move `labs/phase-XX/*.html` sang `labs/_archive/phase-XX/`
- Route `/labs/*` sau migration render từ DB

## Implementation Steps

### 1. Install
```bash
npm i cheerio turndown
```

### 2. Analyze existing HTML structure
Labs dùng template chung `_shared/lab-template.js`. Cấu trúc mỗi file:
```html
<section class="lab-section">
  <h2>...</h2>
  <!-- content -->
</section>
```
Quiz data inline trong `<script>data.quiz = [...]</script>`.

### 3. Script skeleton (`server/scripts/migrate-labs-to-md.js`)
```js
import { readdirSync, readFileSync, renameSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import db from '../db/sqlite-client.js';

const DRY = process.argv.includes('--dry-run');
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

// Custom rules cho pre/code preserve language class
turndown.addRule('fencedCode', {
  filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
  replacement: (content, node) => {
    const code = node.firstChild;
    const lang = (code.getAttribute('class') || '').match(/language-(\w+)/)?.[1] || '';
    return `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n`;
  }
});

const PHASES = [
  { dir: '01-networking', slug: 'networking', title: 'Networking' },
  { dir: '02-linux', slug: 'linux', title: 'Linux' },
  { dir: '03-docker', slug: 'docker', title: 'Docker' },
  // ... 8 total
];

for (const phase of PHASES) {
  const topicId = upsertTopic(phase);
  const files = readdirSync(`./labs/${phase.dir}`).filter(f => f.endsWith('.html'));
  for (const file of files) {
    const html = readFileSync(`./labs/${phase.dir}/${file}`, 'utf8');
    const $ = cheerio.load(html);
    const title = $('h1').first().text() || basename(file, '.html');
    const slug = basename(file, '.html').replace(/^\d+-/, '');
    const bodyHtml = $('.lab-section, main, article').html() || $('body').html();
    const bodyMd = turndown.turndown(bodyHtml);

    if (DRY) {
      console.log(`--- ${phase.slug}/${slug} ---`);
      console.log(bodyMd.slice(0, 500));
      continue;
    }
    upsertSection({ topic_id: topicId, slug, title, body_md: bodyMd });
    console.log(`✓ ${phase.slug}/${slug}`);
  }
}

if (!DRY) {
  // Archive
  mkdirSync('./labs/_archive', { recursive: true });
  for (const phase of PHASES) {
    renameSync(`./labs/${phase.dir}`, `./labs/_archive/${phase.dir}`);
  }
  console.log('✓ Labs archived to labs/_archive/');
}
```

### 4. Helpers
```js
function upsertTopic({ slug, title }) {
  const existing = db.prepare('SELECT id FROM topics WHERE slug=?').get(slug);
  if (existing) return existing.id;
  return db.prepare('INSERT INTO topics (slug, title, order_idx) VALUES (?,?,?)')
           .run(slug, title, getNextOrder()).lastInsertRowid;
}
function upsertSection({ topic_id, slug, title, body_md }) {
  const existing = db.prepare('SELECT id FROM sections WHERE topic_id=? AND slug=?').get(topic_id, slug);
  if (existing) {
    db.prepare('UPDATE sections SET title=?, body_md=?, updated_at=? WHERE id=?')
      .run(title, body_md, Date.now(), existing.id);
    return existing.id;
  }
  return db.prepare('INSERT INTO sections (topic_id, slug, title, body_md, order_idx) VALUES (?,?,?,?,?)')
           .run(topic_id, slug, title, body_md, getNextOrderInTopic(topic_id)).lastInsertRowid;
}
```

### 5. Post-migration: route `/labs/*`
Redirect `/labs/:phase/:slug.html` → `/theory/:topic/:section` (phase.slug → topic.slug).

Hoặc simpler: giữ path `/labs/*` nhưng render từ DB theo mapping. Chọn **redirect** cho cleaner URL.

### 6. Verify script
```js
// server/scripts/verify-migration.js
const sections = db.prepare('SELECT topic_id, slug, length(body_md) as len FROM sections').all();
console.log(`Total sections: ${sections.length}`);
console.log(`Empty (< 100 chars): ${sections.filter(s => s.len < 100).length}`);
```

## Tasks
- [ ] Install cheerio + turndown
- [ ] Draft script với dry-run
- [ ] Review dry-run output → adjust selectors/rules
- [ ] Run migration on dev DB
- [ ] Verify script: count sections, spot-check 5 random sections
- [ ] Archive HTML files → `labs/_archive/`
- [ ] Setup redirect `/labs/*` → `/theory/*`
- [ ] Update `labs/index.html` → redirect to `/` (dashboard) hoặc deprecate

## Risks
- **Quiz data mất:** inline `<script>data.quiz = [...]</script>` không extract được sang MD. Lưu riêng vào table `quiz_cards` trong Phase 4. **Phase 1: extract quiz JSON vào file `data/quiz-backup-{topic}-{slug}.json` trước khi archive.**
- **Custom HTML (diagrams, interactive widgets) mất:** review dry-run kỹ, marker lại bằng `<!-- TODO: re-author X -->` comment trong MD.
- **Frontmatter metadata labs (priority, status) mất:** parse từ lab-template.js config nếu có, lưu vào cột mới hoặc bỏ qua nếu không cần Phase 1.

## Acceptance
- Dry-run output show markdown clean, code blocks đúng language
- DB sau migrate có đủ 8 topics + tổng số sections khớp số HTML files
- `/theory/networking/tcp-udp` render ra nội dung tương đương `/labs/01-networking/03-tcp-udp.html`
- `labs/_archive/` giữ đủ HTML gốc
- Quiz JSON backed up riêng
