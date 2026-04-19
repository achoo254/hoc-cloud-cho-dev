---
type: brainstorm
date: 2026-04-19
topic: Kill Theory CMS + Refactor Labs theo WHY Schema v2 (Deploy-Ready)
status: decided, pending plan
related_plans:
  - plans/dattqh/260419-1034-theory-cms-lms  # sẽ bị deprecate
  - plans/dattqh/260419-1048-why-schema-v2   # sẽ được implement
---

# Brainstorm Summary — Kill Theory + All-in Labs v2

## Problem

Dev tự học cloud/network. Vừa xây theory CMS (SQLite+FTS5 + OAuth + markdown pipeline + admin UI, ~1.5 tuần). Tự nhận: **không muốn đọc lý thuyết dài dòng, muốn học qua labs tương tác**. Positioning đã chốt = **deploy-ready dev** (hiểu đủ để triển khai cloud, không phải chuyển nghề devops).

Theory CMS hiện tại mâu thuẫn với learning style + positioning → quyết định cắt.

## Decision

### Chốt ngày 2026-04-19

| Câu hỏi | Quyết định |
|---------|------------|
| Theory CMS đi hay ở? | **KILL hẳn** (Option A) |
| Code theory | **Xóa `git rm`**, không archive |
| DB SQLite | **GIỮ** — repurpose cho: search labs (FTS5) + progress tracking |
| Labs v2 schema | **Refactor luôn** cùng đợt, không tách |

### Triết lý thống nhất

**4 chân kiềng Deploy-Ready** (từ plan 260419-1048-why-schema-v2 + positioning-deploy-ready):

| Chân | Câu hỏi | Trường JSON | Bắt buộc |
|------|---------|-------------|----------|
| WHY | Tại sao concept tồn tại? | `why` | ✅ |
| WHEN-IT-BREAKS | Deploy hỏng thì triệu chứng gì? | `whyBreaks` | ✅ |
| SEE-IT-ON-VPS | Verify/quan sát bằng gì, nhìn vào đâu? | `observeWith` | ✅ (walkthrough + tryAtHome) |
| DEPLOY-READY | Khi triển khai thật chạm ở đâu? | `deploymentUse` | ✅ ở TL;DR |

## Options Evaluated

| Option | Mô tả | Verdict |
|--------|-------|---------|
| A — Kill theory, all-in labs | Xóa CMS, primer inline vào lab | ✅ **Chosen** |
| B — CMS backend cho primer inline | Giữ CMS + admin, public render inline vào lab | ❌ Nửa nạc nửa mỡ, complexity thừa |
| C — Giữ nguyên, reframe thành reference | Theory = cheat-sheet tra cứu | ❌ Chính user nói không muốn đọc |

**Rationale chọn A**:
1. Positioning + learning style + labs sẵn có = 1 vector thống nhất
2. YAGNI/KISS: solo learner + solo dev, không cần CMS
3. Labs v2 với 4 chân kiềng đã đủ pedagogy
4. 1.5 tuần sunk < 6 tháng chạy sai hướng

## Scope chốt

### IN-scope (phase plan chi tiết sẽ ra sau)

1. **Cleanup theory**: xóa `server/admin/`, `server/content/`, `server/public/theory-routes.js`, `server/auth/`, views, scripts migrate, CSP bớt directive thừa, bỏ legacy URL redirect `/theory/*`
2. **Reshape DB**:
   - DROP: `topics`, `sections`, `sections_fts` (+ triggers), `lab_links`, `admin_sessions`
   - ADD: `labs` (mirror metadata từ lab-data JSON — id/slug/title/module/updated_at), `labs_fts` (FTS5 index title+content), `progress` (user local identifier + lab_id + status), optional `flashcard_srs` (nếu muốn sync từ localStorage lên server sau này)
3. **Lab template v2**:
   - `_shared/lab-template.js`: warn rules mới cho `whyBreaks`, `observeWith`, `deploymentUse` + render 3 callout type (breaks/observe/deploy) + nút toggle 3 lớp WHY độc lập
   - `_shared/lab-template.css`: style callout mới (⚠️ breaks đỏ nhạt, 👁️ observe xanh, 🚀 deploy tím)
4. **Refactor 8 network labs** theo schema v2 (DNS trước làm reference, rồi 7 cái còn lại)
5. **Search labs**: route `/api/search?q=`, UI search box ở `labs/index.html`, dùng `labs_fts`
6. **Progress backend sync** (optional, có thể phase sau): endpoint POST progress, fallback localStorage nếu offline
7. **Docs**: cập nhật `labs/README.md` + top-level `README.md` (bỏ mục theory, thêm 4 chân kiềng)

### OUT-of-scope (lần này)

- Module 02-08 refactor theo schema v2 (chỉ module 01 networking lần này — làm pilot)
- `vpsExercise` toàn bộ 8 module (chỉ viết cho networking)
- Migrate sang cloud database (SQLite đủ forever cho use case này)
- Multi-user/role (1 dev học → không cần)
- Test suite đầy đủ (chỉ smoke test cho search + schema warn)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Xóa theory code → mất tính năng đã quen | User confirm xóa hẳn; git history giữ nguyên nếu cần revert |
| Schema v2 warn quá strict → viết lab mệt | Default warn ở console, không block; có flag `SKIP_WHY_WARN=1` dev mode |
| Refactor 8 lab cùng lúc → quá sức | Làm DNS trước (pilot), review UX, rồi mới nhân rộng — tách 2 phase |
| DB schema đổi → migration cần downtime | Single user = OK; script migrate chạy 1 lần khi deploy, dữ liệu cũ dump backup trước |
| localStorage progress cũ (lab:*) mất khi thay format | Giữ schema localStorage hiện tại (`lab:meta`, `lab:quiz`, `lab:srs`), backend sync chỉ là lớp phụ |

## Success Criteria

- [ ] `git grep -i "theory\|admin\|oauth"` trong `server/` trả về 0 match (ngoại trừ comment lịch sử)
- [ ] `npm run dev` start không lỗi, `/healthz` trả OK
- [ ] Lab DNS refactored mở trong browser không có console warn `[lab] missing ...`
- [ ] Search "dns" trả về lab networking DNS qua route `/api/search`
- [ ] `labs/index.html` dashboard vẫn hiển thị progress + SRS due (localStorage)
- [ ] README top-level không còn nhắc theory, có 4 chân kiềng

## Metrics

- **LOC delta**: dự kiến **net decrease** ~800-1200 LOC (xóa admin/auth/content/theory > thêm labs_fts + search route)
- **Dev effort**: ~5-7 ngày toàn bộ scope IN (chia phase)
- **User-facing**: 0 route bị 404 sau migration (redirect cũ bỏ → legacy labs HTML path giữ nguyên)

## Next Steps

1. **User duyệt report này** (xong — implicit qua chat trước đó)
2. **Run `/ck:plan`** với context report này để generate detailed plan với:
   - `plan.md` (YAML frontmatter, overview)
   - `phase-01-cleanup-theory.md`
   - `phase-02-reshape-db-schema.md`
   - `phase-03-labs-template-v2.md`
   - `phase-04-refactor-dns-pilot.md`
   - `phase-05-refactor-remaining-networking.md`
   - `phase-06-search-ui.md`
   - `phase-07-progress-backend.md` (optional)
   - `phase-08-docs-readme.md`
3. **Implement tuần tự**, pilot lab DNS xong **dừng review UX** trước khi phase 05.

## Open Questions

1. **Progress backend có cần không?** localStorage đã đủ cho solo learner. Nếu chỉ 1 device dùng → phase 07 skip, tiết kiệm 2 ngày. Chỉ cần khi muốn dùng trên nhiều device. → **Đề xuất**: skip phase 07 lần này, YAGNI.
2. **Search UI**: search bar global ở header hay chỉ ở dashboard? → Đề xuất chỉ dashboard để KISS.
3. **Authentication cho progress sync**: nếu có phase 07, dùng anonymous UUID localStorage hay bắt đăng nhập? → Đề xuất UUID (không cần auth, privacy-first).
4. **Legacy URL `/theory/*`**: có user nào đã bookmark chưa? → Nếu không thì xóa redirect luôn, else giữ 301 về `/` cho lịch sự.
