# Brainstorm — Mục "Bài Tập" (Exercises) owner-gated

Ngày: 2026-06-02 · Branch: master · Trạng thái: ĐÃ CHỐT, sẵn sàng plan

## Problem statement

Hiện "bài tập/thực hành" nhúng trong lab doc (`quiz`, `tryAtHome`, `walkthrough`) → mỗi lần làm bài tập phải sửa trực tiếp trong lab. Cần **mục riêng "Bài Tập"** để tạo bài tập độc lập, không đụng labs.

## Bản chất (user xác nhận)

- Bài tập = **yêu cầu giảng viên giao** cho user thực hành (code để tự làm).
- **Dành riêng cá nhân user** — KHÔNG phải public learning content như labs.
- Độc lập theo **chủ đề** (không gắn lab cụ thể).
- Gồm **2 phần**: (1) hướng dẫn thực hiện, (2) demo thực tế cách thực hiện (output thật).
- **Riêng tư**: owner-gated (chỉ tài khoản Google của user thấy).
- **Không** cần search (Meili).

## Giải pháp chốt (mirror lab pattern, tách hẳn + tối giản)

### Storage — collection `exercises` riêng
`server/db/models/exercise-model.js` (mirror `lab-model.js`: Mixed subdocs; KHÔNG post-save Meili hook). Shape camelCase:

```js
{
  slug,            // unique, vd 'linux-syslog-relay-setup'
  title,
  topic,           // 'linux' | 'networking' | 'docker' ... (thay cho module)
  tags: [],        // optional
  source,          // optional: ai giao (vd "Giảng viên X / môn Y")
  brief,           // ĐỀ BÀI / yêu cầu (HTML-capable)
  estimatedMinutes,// optional
  guide: [ { step, instruction, command?, note? } ],          // PHẦN 1 hướng dẫn
  demo:  [ { step, what, command?, output, note?, screenshot? } ], // PHẦN 2 demo thật
  references: [ { label, url } ],   // optional
  createdAt, updatedAt
}
```

### API — `server/api/exercises-routes.js` (mirror `labs-routes.js`)
- `GET /api/exercises` (catalog: slug/title/topic/tags/estimated_minutes/updated_at)
- `GET /api/exercises/:slug` (detail, map camelCase→snake_case)
- **Owner-gated**: thêm middleware `requireOwner` (mới, `server/auth/require-owner.js`) — so `c.get('user').email` với env `OWNER_EMAIL` (allowlist, vd `dattqh@inet.vn`). 403 nếu không phải owner; 401 nếu chưa đăng nhập. Mount sau `sessionMiddleware`.

### FE — nav + 2 route + renderer nhẹ
- Nav "Bài Tập" trong `site-header.tsx` — **chỉ hiện khi owner** (so `auth-context` user.email với `import.meta.env.VITE_OWNER_EMAIL`).
- Route `/exercises` (catalog grid, mirror nhẹ `lab-catalog-grid`) + `/exercise/:slug` (renderer riêng tối giản: **Đề bài → Hướng dẫn → Demo**, KHÔNG dùng THINK/SEE/TRY tabs, KHÔNG tái dùng `lab-renderer`).
- Non-owner truy cập trực tiếp URL: FE hiện "không có quyền" + API trả 403 (defense-in-depth).

### Authoring workflow (cách dùng sau này)
User giao đề → AI làm thật (SSH VM/local, như đã làm với lab tryAtHome) → capture output thật → insert qua `server/scripts/seed-exercise.js` (hoặc 1 script/đề). KHÔNG đụng lab nào.

### Owner identity
- Server: env `OWNER_EMAIL` (comma-separated allowlist) trong `.env*`.
- Client: env `VITE_OWNER_EMAIL` (build-time) để ẩn/hiện nav. Bảo mật thật do API enforce; FE chỉ ẩn UI.

## Đánh giá approach (đã loại)

| Approach | Lý do loại |
|----------|-----------|
| Dùng chung collection `labs` + field `type:'exercise'` | Bài tập bị ràng schema lab (THINK/SEE/TRY, misconceptions...) — kém hợp, content nhẹ hơn nhiều. |
| Gắn exercise vào lab doc (sub-array) | Ngược ý "không sửa trong Labs". |
| Public như labs | User chốt riêng tư cá nhân. |

## OUT of scope (KISS)

Không: quiz/flashcards/misconceptions, progress/heatmap/leaderboard, SM-2, Meili search, gắn labSlug, tái dùng lab-renderer, multi-user (chỉ 1 owner).

## Implementation considerations / risks

- **Auth gate là điểm bảo mật chính** — phải enforce ở API (không chỉ ẩn nav FE). `requireOwner` + `OWNER_EMAIL` env phải set đúng ở cả dev lẫn prod (VPS) trước khi deploy, nếu không owner cũng bị 403.
- `VITE_OWNER_EMAIL` lộ trong bundle FE (build-time) — chấp nhận được (chỉ là email, không phải secret); bảo mật do session cookie + API.
- Cần thêm route auth wiring: hiện `/api/progress` đã dùng session; mount `exercises-routes` sau `sessionMiddleware` + `requireAuth` + `requireOwner`.
- Deploy: thêm env `OWNER_EMAIL` (server) + `VITE_OWNER_EMAIL` (build) vào pipeline/VPS — nếu quên, mục Bài Tập 403/ẩn.

## Success criteria

- Owner đăng nhập → thấy nav "Bài Tập" → `/exercises` liệt kê bài tập → `/exercise/:slug` hiện Đề bài + Hướng dẫn + Demo.
- Khách / user khác → KHÔNG thấy nav; gọi `/api/exercises*` → 401/403.
- Tạo bài tập mới qua seed script, không sửa lab nào.
- `app typecheck` pass; không đụng 11 lab hiện có.

## Next steps

`/ck:plan` để chia phase (model → API+auth → FE route+nav+renderer → seed script → env/deploy → verify).

## Unresolved questions

1. `OWNER_EMAIL` chốt là `dattqh@inet.vn`? (suy từ context — xác nhận khi plan).
2. Có cần 1 bài tập mẫu (seed demo) ngay trong plan đầu tiên để kiểm thử end-to-end không, hay để trống chờ đề thật?
3. Topic taxonomy: tự do text hay enum cố định (`linux`/`networking`/`docker`/...)? (đề xuất: free text + tags, nhẹ).
