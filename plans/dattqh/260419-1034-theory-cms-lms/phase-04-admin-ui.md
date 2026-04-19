# Phase 4: Admin CMS UI (Alpine.js)

**Priority:** P1 | **Status:** pending | **Effort:** 2.5d

## Goal
Admin UI tại `/admin`: list topics/sections, editor split-view (markdown | preview), CRUD, slash commands, auto-save draft. Không dùng framework build-tool.

## Requirements
- Single HTML + Alpine.js (CDN), dùng lab-template.css làm base
- Editor split 50/50: textarea trái, preview HTML phải
- Slash commands: `/code`, `/mermaid`, `/callout`, `/quiz` insert snippet
- Auto-save draft vào localStorage mỗi 5s
- Manual Save → POST `/admin/api/sections/:id` commit vào DB
- List view: drag-reorder topics + sections (update `order_idx`)

## Implementation Steps

### 1. Routes (`server/admin/routes.js`)
```
GET  /admin              → dashboard (list topics + sections)
GET  /admin/login        → login page
GET  /admin/new-section  → editor blank
GET  /admin/edit/:id     → editor với data section
POST /admin/api/topics          → create topic
PUT  /admin/api/topics/:id      → update
DELETE /admin/api/topics/:id
POST /admin/api/sections        → create section
PUT  /admin/api/sections/:id    → update (body_md, title, order_idx)
DELETE /admin/api/sections/:id
POST /admin/api/reorder         → batch update order_idx
POST /admin/api/render          → markdown preview (from Phase 3)
```

Tất cả `/admin/*` (trừ `/admin/login`) gated by `adminGuard`.

### 2. Dashboard view (`server/admin/views/dashboard.html`)
- Server render initial state (list topics + sections grouped)
- Alpine cho drag-drop reorder, delete confirm, quick rename

### 3. Editor view (`server/admin/views/editor.html`)
Alpine component:
```html
<div x-data="editor()" x-init="init()">
  <header>
    <input x-model="title" placeholder="Title">
    <select x-model="topicId"><!-- topics --></select>
    <button @click="save()">Save</button>
    <span x-text="dirty ? '● unsaved' : '✓ saved'"></span>
  </header>
  <main class="split">
    <textarea x-model="body" @input.debounce.300ms="preview()"
              @keydown.slash="maybeSlash($event)"></textarea>
    <div class="preview" x-html="html"></div>
  </main>
</div>
```

### 4. Slash commands
- Khi gõ `/` ở đầu dòng → popup menu (Alpine)
- `/code` → insert `\`\`\`bash\n\n\`\`\``, cursor giữa
- `/mermaid` → `\`\`\`mermaid\nflowchart LR\n  A --> B\n\`\`\``
- `/callout` → `> [!INFO] Title\n> body`
- `/quiz` → `\`\`\`quiz\nQ: ...\nA: ...\n\`\`\`` (reserved, render Phase 4 main project)

### 5. Auto-save draft
```js
// Mỗi 5s nếu dirty → localStorage.setItem(`draft-${id}`, JSON.stringify({title, body, savedAt: Date.now()}))
// Khi init editor → check draft newer than DB → prompt "Restore unsaved draft from X minutes ago?"
// Manual Save thành công → xóa draft
```

### 6. Manual save flow
```js
async save() {
  const res = await fetch(`/admin/api/sections/${this.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': this.csrf },
    body: JSON.stringify({ title: this.title, body_md: this.body, topic_id: this.topicId })
  });
  if (res.ok) {
    this.dirty = false;
    localStorage.removeItem(`draft-${this.id}`);
  }
}
```

### 7. Service layer (`server/content/section-service.js`)
CRUD functions pure SQL:
```js
export const createSection = ({ topic_id, slug, title, body_md }) => {
  return db.prepare(`INSERT INTO sections (topic_id, slug, title, body_md) VALUES (?,?,?,?)`)
           .run(topic_id, slug, title, body_md);
};
export const updateSection = (id, patch) => { /* ... */ };
export const deleteSection = (id) => { /* ... */ };
export const listByTopic = (topic_id) => { /* ... */ };
export const getById = (id) => { /* ... */ };
export const reorder = (items) => { /* transaction */ };
```

## Tasks
- [ ] Admin routes skeleton
- [ ] Dashboard view (list + drag reorder)
- [ ] Editor view (split markdown | preview)
- [ ] Slash commands popup
- [ ] Auto-save draft → localStorage
- [ ] Manual save → API
- [ ] section-service.js CRUD
- [ ] Keyboard shortcut: Cmd/Ctrl+S → save
- [ ] Unsaved-changes warning on navigate away (`beforeunload`)
- [ ] Smoke test: create topic → create section → edit → save → refresh → data persist

## Acceptance
- Login admin → thấy dashboard với list topics/sections
- Tạo section mới qua editor, type markdown thấy preview live
- Slash commands insert đúng snippet
- Auto-save draft recovery hoạt động (close tab → mở lại → offer restore)
- Drag reorder topic/section, refresh vẫn đúng thứ tự
- Delete section có confirm, FTS5 trigger xóa index đồng bộ
