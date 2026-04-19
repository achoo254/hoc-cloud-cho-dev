# Phase 01 — Docs Cleanup

**Status:** completed | **Effort:** 1h | **Priority:** P1

## Files to modify

- `README.md` (rewrite)
- `docs/project-overview-pdr.md` (delete)
- `docs/content-guidelines.md` (extend §11)

## Steps

### 1. Rewrite `README.md` (≤80 dòng)

Structure mới:
```
# hoc-cloud-cho-dev

Personal workspace để tự học Cloud/DevOps. Lab HTML tự chứa + SM-2 flashcard.

## Cấu trúc
[bảng: labs/, server/, docs/, plans/, deploy/, data/]

## Chạy local
- npm install && npm run dev    # Node ≥20, http://localhost:3000
- python -m http.server 8000   # fallback từ thư mục labs/

## Convention viết lab mới
- Schema v2 (4 chân kiềng): WHY · BREAKS · OBSERVE · DEPLOY
- Copy 1 lab existing → sửa <title> + block <script id="lab-data">
- Thêm entry vào CATALOG trong labs/index.html
- Sync DB: node server/scripts/sync-labs-to-db.js
- Tuân content-guidelines.md (tone, ngôi xưng, cite nguồn)

## Cheat-sheet
- Reset progress: DevTools → Local Storage → xoá key `lab:*`
- Sync labs → DB: node server/scripts/sync-labs-to-db.js
- Migrate DB: node server/db/migrate.js
- Deploy: bash deploy/remote-deploy.sh

## API (server)
[bảng nhỏ: GET /healthz, /api/search, /api/progress, POST /api/progress]
```

Bỏ hết: §1 "dành cho ai", §2 lộ trình kể chuyện, §4 "triết lý", §7 "gợi ý cách học", §8 "đóng góp", §9 "tài liệu thêm", câu kết "chúc học vui".

### 2. Xoá `docs/project-overview-pdr.md`

```bash
git rm docs/project-overview-pdr.md
```

### 3. Extend `docs/content-guidelines.md` — thêm §11

```markdown
## 11. Repo scope rules

Repo này là personal learning workspace, không phải product/course.

- **Tone**: Cấm marketing copy. Cấm: "dành cho ai", "tại sao chọn repo này", CTA ("bắt đầu ngay"), feature pitch ("tính năng nổi bật"), slogan ("chúc học vui"). Chỉ note kỹ thuật.
- **Schema v2 mandatory**: Mọi lab mới BẮT BUỘC đủ 4 chân kiềng (`why`, `whyBreaks`, `observeWith`, `deploymentUse`). Không có ngoại lệ.
- **Ngôn ngữ**: Content/comment dùng tiếng Việt. Code identifier (function, variable, file name) dùng English.
- **Markdown location**: Không tạo `.md` ngoài `plans/dattqh/` và `docs/` trừ khi user yêu cầu.
```

## Acceptance

- [ ] `wc -l README.md` ≤ 80
- [ ] `ls docs/project-overview-pdr.md` → No such file
- [ ] `grep -c "^## 11" docs/content-guidelines.md` = 1
- [ ] `grep -iE "dành cho ai|chúc học|tại sao chọn|bắt đầu ngay" README.md` → empty
