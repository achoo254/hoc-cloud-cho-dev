---
type: brainstorm
date: 2026-04-19
status: approved
---

# Personal Workspace Refactor — Design Summary

## Problem
Repo hiện tại viết theo tone "sản phẩm cho người khác" (hero pitch, target audience, CTA, features cards). Thực tế là workspace tự học cá nhân. Cần lột marketing layer, tập trung UI vào hành động hằng ngày: ôn flashcard due + resume lab.

## Approved Design

### 1. README.md — rewrite ≤80 dòng
Giữ:
- Cấu trúc thư mục (bảng map labs/server/docs/plans)
- Convention viết lab mới (Schema v2: WHY/BREAKS/OBSERVE/DEPLOY) + lệnh sync DB
- Cheat-sheet lệnh: dev/prod start, reset localStorage, deploy, sync labs→DB

Bỏ: "dành cho ai", lộ trình kể chuyện, "đóng góp", "chúc học vui", section pitch.

### 2. labs/index.html — dashboard-first
Loại 3 sections: hero pitch, CÁCH HỌC 01-04, TÍNH NĂNG 4 cards.

Layout mới:
```
[Toolbar: search · theme · reset]
[DUE TODAY ── block lớn nhất, SM-2 queue]
[Resume: lab dang dở gần nhất + % progress]
[Roadmap grid 8 modules]
[Stats footer: labs done / total cards / streak]
```

File chạm:
- `labs/_shared/index-sections.js` — bỏ orchestrate hero/howto/features
- `labs/_shared/index-sections-hero.js` — xoá hoặc thay
- Thêm: `index-sections-due.js`, `index-sections-resume.js`
- Giữ nguyên: roadmap, stats, toolbar, footer generators

### 3. Rules — bổ sung `docs/content-guidelines.md`
- Tone: cấm marketing copy ("dành cho", CTA, slogan)
- Schema v2 bắt buộc cho lab mới
- Content tiếng Việt, code/identifier English
- Không tạo .md ngoài `plans/dattqh/` và `docs/`

### 4. docs/project-overview-pdr.md
**XOÁ** — README đủ rồi, không cần product spec cho personal repo.

## Out of Scope
- Không đụng SM-2 logic, lab runtime, server API, DB schema
- Không refactor lab content cũ
- Không đổi build/deploy pipeline

## Risk
Thấp — thuần content + UI rearrange. Rollback dễ qua git.

## Success Criteria
- Mở `labs/index.html` → thấy ngay due cards (above the fold)
- README ≤80 dòng, zero marketing copy
- `docs/content-guidelines.md` có rule tone + schema v2
- `docs/project-overview-pdr.md` đã xoá

## Next
Invoke `/ck:plan` để sinh phase plan chi tiết.
