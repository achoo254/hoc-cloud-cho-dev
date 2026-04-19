# Plan — WHY Schema v2 (WHY + WHEN-IT-BREAKS + SEE-IT-ON-VPS + DEPLOY-READY)

> Reframe triết lý WHY-first cho **dev deploy-ready**: hiểu đủ sâu về hệ thống để *triển khai và vận hành cơ bản* dịch vụ trên cloud — không phải thay thế sysadmin/devops. Có **1 VPS thật** làm sân tập.

## Status

- [x] Brainstorm định hướng (trao đổi trực tiếp trong session)
- [x] Thiết kế schema v2 — xem `schema-v2-design.md`
- [x] Lab mẫu refactor (DNS) — xem `sample-lab-dns-refactored.md`
- [ ] Quyết định: chốt schema → migrate 8 lab networking → cập nhật `lab-template.js` warn
- [ ] Viết `vps-exercise.md` cuối mỗi module (tận dụng single-VPS + netns/docker)
- [ ] Cập nhật `labs/README.md` với convention mới

## Quyết định đã chốt

1. **Target**: **dev deploy-ready** — hiểu đủ sâu để triển khai + vận hành cơ bản dịch vụ trên cloud, làm việc được với sysadmin/devops bằng cùng vocabulary. Không phải chuyển nghề ops fulltime.
2. **VPS**: 1 máy duy nhất → mọi bài tập multi-host phải giả lập bằng `ip netns` hoặc Docker network, không yêu cầu VPS #2.
3. **`whyBreaks` + `observeWith` là bắt buộc** — template warn trong console nếu thiếu, giống `why` hiện tại.
4. **Positioning shift** (mới) → xem `positioning-deploy-ready.md`: thêm chiều "triển khai thực tế" vào schema, scope lại `whyBreaks` cho lỗi deploy-level (không phải kernel-level).

## Bốn chân kiềng (cập nhật)

| Tầng | Câu hỏi trả lời | Trường JSON | Bắt buộc |
|------|-----------------|-------------|----------|
| WHY | Tại sao concept tồn tại? | `why` | ✅ |
| WHEN-IT-BREAKS | Deploy xong hỏng thì triệu chứng gì, nhầm với cái gì? | `whyBreaks` | ✅ |
| SEE-IT-ON-VPS | Quan sát/verify bằng lệnh nào, nhìn vào đâu? | `observeWith` | ✅ (walkthrough + tryAtHome) |
| **DEPLOY-READY** (mới) | Khi triển khai thật, dev chạm concept này ở đâu? | `deploymentUse` + `cloudEquivalent` | ✅ ở TL;DR, ⭕ optional ở step |

Bổ trợ (optional):
- `misconceptions` — 2-3 hiểu lầm phổ biến ở đầu lab
- `dependsOn` / `enables` — neo concept vào stack
- `vpsExercise` — chỉ 1 bài/module, tổng hợp + đi đến deployable outcome

## Files trong plan

- `plan.md` — file bạn đang đọc
- `positioning-deploy-ready.md` — **[ĐỌC TRƯỚC]** giải thích shift positioning + trường mới
- `schema-v2-design.md` — định nghĩa schema (cần đọc kèm addendum trên)
- `sample-lab-dns-refactored.md` — lab DNS viết lại theo v2 (chưa phản ánh DEPLOY-READY, sẽ cập nhật nếu user chốt)

## Next step đề xuất

Đọc `schema-v2-design.md` → đọc `sample-lab-dns-refactored.md` → quyết định:
- Chốt schema như đang đề xuất, hay chỉnh thêm?
- Migrate dần từng lab, hay viết mới 1 lab v2 rồi so sánh UX trước khi commit?
