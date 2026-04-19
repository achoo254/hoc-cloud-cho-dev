# Phase 03 — Smoke Test

**Status:** completed | **Effort:** 30m | **Priority:** P1

## Goal

Verify refactor không break existing functionality + content tuân guidelines.

## Steps

### 1. Build / lint check

```bash
node -c labs/_shared/index-sections.js
node -c labs/_shared/index-sections-due.js
```

### 2. Manual smoke (`npm run dev`)

Checklist:
- [ ] `/` load không error console
- [ ] DUE TODAY block hiển thị, số liệu hợp lý
- [ ] Click "Ôn ngay" → navigate đúng lab có due
- [ ] Resume block: hiển thị lab gần nhất hoặc empty state
- [ ] Roadmap grid 8 modules vẫn render
- [ ] Catalog toolbar (search/filter/sort) vẫn work
- [ ] Lab card menu (⋯) reset functions vẫn work
- [ ] Mở 1 lab bất kỳ → flashcard SM-2 vẫn hoạt động
- [ ] Theme toggle vẫn work
- [ ] Mobile (DevTools 375px): không overflow horizontal

### 3. Content guidelines self-check

```bash
# Kiểm marketing copy còn sót
grep -iE "dành cho ai|chúc học|tại sao chọn|bắt đầu ngay|tính năng nổi bật" \
  README.md docs/*.md labs/index.html labs/_shared/*.js

# Phải empty
```

### 4. Git status sanity

```bash
git status --short
# Expected:
#  M README.md
#  M docs/content-guidelines.md
#  D docs/project-overview-pdr.md
#  M labs/index.html
#  M labs/_shared/index-sections.js
#  M labs/_shared/index-sections-stats.js  (nếu sửa renderResume empty state)
#  M labs/_shared/index-page.css
#  D labs/_shared/index-sections-hero.js
# ?? labs/_shared/index-sections-due.js
```

## Acceptance

- [ ] Tất cả checklist §2 pass
- [ ] §3 grep empty
- [ ] `git diff --stat` chỉ chạm files trong scope (không touch SM-2/server/DB)
