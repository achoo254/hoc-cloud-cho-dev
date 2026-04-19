---
phase: 07
title: Progress Backend Multi-Device Sync
status: pending
effort: 1d
depends_on: [02]
---

## Goal

Sync progress (đọc xong / quiz score / flashcard SRS) giữa nhiều device dùng anonymous UUID cookie. Dashboard hiển thị progress từ server (single source of truth), fallback localStorage nếu offline.

## Strategy

- **Anonymous UUID v4** gen 1 lần phía server, set cookie `HttpOnly; SameSite=Lax; Max-Age=2y`
- Client đọc không trực tiếp (HttpOnly) → server luôn là middleman
- Client gọi `GET /api/progress` để lấy state khi load lab/dashboard
- Client gọi `POST /api/progress` khi có thay đổi (đọc xong, quiz submit, flashcard rate)
- LocalStorage vẫn giữ làm fallback + cache — nếu offline, ghi local → sync lên server khi online

## Files to ADD

### `server/lib/anon-uuid-cookie.js`

Middleware: đọc cookie `hcl_uid`, nếu chưa có → gen UUID v4, set cookie, gán `c.var.userUuid`.

### `server/api/progress-routes.js`

```js
// Pseudo
export const progressRoutes = new Hono()
  .use('*', anonUuidMiddleware)
  .get('/api/progress', (c) => {
    const uuid = c.var.userUuid;
    const rows = db.prepare(`
      SELECT lab_slug, opened_at, completed_at, quiz_score, last_updated
      FROM progress WHERE user_uuid = ?
    `).all(uuid);
    return c.json({ uuid, progress: rows });
  })
  .post('/api/progress', async (c) => {
    const uuid = c.var.userUuid;
    const body = await c.req.json();
    // { lab_slug, opened_at?, completed_at?, quiz_score? }
    db.prepare(`
      INSERT INTO progress (user_uuid, lab_slug, opened_at, completed_at, quiz_score, last_updated)
      VALUES (?, ?, ?, ?, ?, strftime('%s','now'))
      ON CONFLICT(user_uuid, lab_slug) DO UPDATE SET
        opened_at = COALESCE(excluded.opened_at, progress.opened_at),
        completed_at = COALESCE(excluded.completed_at, progress.completed_at),
        quiz_score = COALESCE(excluded.quiz_score, progress.quiz_score),
        last_updated = strftime('%s','now')
    `).run(uuid, body.lab_slug, body.opened_at, body.completed_at, body.quiz_score);
    return c.json({ ok: true });
  });
```

Mount trong `server.js`.

### `labs/_shared/progress-sync.js`

Client-side sync layer:
- Khi load lab: `fetch('/api/progress')` → merge với localStorage (server wins nếu conflict — vì `last_updated` mới hơn)
- Khi user hoàn thành lab: `POST /api/progress` với `completed_at: now`
- Khi submit quiz: `POST /api/progress` với `quiz_score: X`
- Debounce 500ms cho batch updates
- Offline detect: nếu fetch fail → queue local, retry khi online (dùng `navigator.onLine` + `online` event)

### `labs/_shared/lab-template.js` (modify)

Import `progress-sync.js`. Hook vào:
- Page load → mark `opened_at`
- Quiz submit → mark `quiz_score`
- Scroll >90% + thời gian ≥2 phút → mark `completed_at` (heuristic "đã đọc xong")

### `labs/index.html` dashboard (modify)

Fetch `/api/progress` → render badge "✅ đã đọc" / "📝 quiz X%" / "🔵 đang đọc" next to mỗi lab trong CATALOG.

## Migration cho user cũ có localStorage

Lần đầu sau deploy:
- Client đọc localStorage `lab:meta:*`, `lab:quiz:*` → gửi batch `POST /api/progress/migrate`
- Server import 1 lần, đánh dấu `migrated: true` trong localStorage để không migrate lại

## Steps

1. Tạo `server/lib/anon-uuid-cookie.js` — gen UUID v4 native `crypto.randomUUID()` (Node 19+, đã có vì engine >=20)
2. Tạo `server/api/progress-routes.js` với GET + POST
3. Mount trong `server.js` (trước static)
4. Test API bằng curl: `curl -b cookie.jar -c cookie.jar /api/progress` → trả UUID + empty list lần đầu
5. POST test: `curl -b cookie.jar -X POST /api/progress -H 'Content-Type: application/json' -d '{"lab_slug":"dns","completed_at":1234567890}'`
6. GET lại → thấy record
7. Tạo `labs/_shared/progress-sync.js`
8. Integrate vào `lab-template.js`:
   - On load: fetch + mark opened
   - Quiz submit callback: post quiz_score
   - Scroll observer: mark completed sau threshold
9. Update dashboard `labs/index.html` fetch + render badge
10. Test end-to-end:
    - Device A (browser thường): mở lab DNS, đọc xong → cookie hcl_uid=X, progress lưu
    - Device B (incognito copy cookie): mở dashboard → thấy DNS đã đọc
11. Test offline: DevTools throttle offline → mark xong lab → online → auto sync

## Acceptance Criteria

- [ ] Cookie `hcl_uid` set lần đầu visit, giữ UUID consistent
- [ ] `GET /api/progress` trả list đúng cho UUID
- [ ] `POST /api/progress` upsert correct (INSERT lần đầu, UPDATE lần sau)
- [ ] Dashboard `/` hiển thị badge progress cho lab đã đọc
- [ ] Mở 2 browser khác nhau (copy cookie) → cùng thấy progress
- [ ] Offline → queue → online → auto sync không mất data
- [ ] Migration localStorage cũ → server chạy 1 lần, không duplicate

## Risks

| Risk | Mitigation |
|------|------------|
| User clear cookie → mất UUID → "tài khoản mới" | Accepted, anonymous by design. Có thể thêm feature "export/import UUID" sau. |
| Conflict localStorage vs server khi mở nhiều tab | `last_updated` timestamp wins, debounce 500ms |
| DB grows vô tội vạ nếu nhiều user ngẫu nhiên | 1 user ~8-80 row, không lo. Cron xóa record cũ hơn 1 năm nếu cần. |
| Cookie không set vì `Secure` flag trên production HTTPS | Test cả HTTP dev + HTTPS prod, set `Secure` conditional |
| CSRF trên POST /api/progress | Not sensitive data + anonymous UUID — threat model thấp. Có thể thêm SameSite=Strict nếu paranoid. |

## Out-of-scope

- User login / claim account
- Export/import progress
- Flashcard SRS server-side (giữ localStorage — SM-2 state chi tiết, phức tạp sync, YAGNI)
- Leaderboard / social features
