---
phase: 04
title: Refactor Lab DNS — Pilot Schema v2
status: pending
effort: 1d
depends_on: [03]
gate: true
---

## Goal

Refactor `labs/01-networking/08-dns.html` theo schema v2 làm **reference chuẩn** cho 7 lab còn lại. **Gate review**: dừng lại cho user mở browser xem UX trước khi phase 05 quất tiếp.

## Context

- Schema + before/after ở: `plans/dattqh/260419-1048-why-schema-v2/sample-lab-dns-refactored.md`
- Positioning (deploy-ready): `plans/dattqh/260419-1048-why-schema-v2/positioning-deploy-ready.md`
- Chọn DNS vì: có nhiều concept (A/CNAME/MX/TXT/TTL), có deploymentUse rõ (Cloudflare panel), vpsExercise đã có sẵn ý tưởng (dnsmasq + tcpdump)

## Files to MODIFY

### `labs/01-networking/08-dns.html`

Thay block `<script type="application/json" id="lab-data">` với schema v2 đầy đủ:
- Thêm `misconceptions` (3 items)
- Thêm `dependsOn: ["udp", "ip-routing"]` + `enables: ["http-browsing", "email-delivery", "tls-sni"]`
- Thêm `estimatedMinutes: 45`
- Mỗi row TL;DR: thêm `whyBreaks` + `deploymentUse`
- Mỗi walkthrough step: thêm `whyBreaks` + `observeWith: {cmd, lookAt}`
- Mỗi tryAtHome: thêm `observeWith` (text hướng dẫn quan sát)
- Thêm `vpsExercise` với `deployChecklist` (deploy 1 subdomain thật + auto-TLS, xem sample-lab-dns-refactored §5)
- Thêm `cloudEquivalent` cho 2-3 concept (authoritative DNS server, recursive resolver)

Giữ nguyên: Playground (DNS trace interactive), quiz (đã có whyCorrect/whyOthersWrong), flashcards.

## Steps

1. Mở `sample-lab-dns-refactored.md` làm reference
2. Copy block `lab-data` hiện tại, expand từng row TL;DR:
   - 12 row hiện tại → giữ `what` + `why` (rút gọn 1-2 câu), thêm `whyBreaks` + `deploymentUse`
3. Walkthrough (7 step) → mỗi step thêm `whyBreaks` + `observeWith`
4. tryAtHome (4-5 item) → mỗi item thêm `observeWith`
5. Thêm block `misconceptions` + `dependsOn`/`enables` + `estimatedMinutes` ở top
6. Thêm block `vpsExercise` cuối `lab-data` với `deployChecklist` (6 step deploy + 3 câu hỏi deliverable)
7. Thêm `cloudEquivalent` cho "Authoritative DNS server" + "Recursive resolver"
8. Mở browser `http://localhost:8387/labs/01-networking/08-dns.html`:
   - Console: 0 warning `[lab] missing ...`
   - 4 nút toggle WHY/BREAKS/OBSERVE/DEPLOY hoạt động
   - Callout đỏ (whyBreaks), xanh (observeWith), tím (deploymentUse) render đúng
   - Block misconceptions hiển thị ở đầu
   - Badge dependsOn/enables ở hero
   - vpsExercise render ở cuối
9. Re-run `npm run sync-labs` → DB cập nhật lab DNS mới
10. Test search FTS5 preview: `sqlite3 data/app.db "SELECT slug FROM labs_fts WHERE labs_fts MATCH '502 OR bad gateway'"` — chưa có match vì DNS không mention 502, nhưng "cloudflare" hay "TTL" phải trả về DNS

## Acceptance Criteria

- [ ] Lab DNS mở browser, console sạch warn
- [ ] Tất cả 12 TL;DR row có 3 trường: why + whyBreaks + deploymentUse
- [ ] 7 walkthrough step có 3 trường: why + whyBreaks + observeWith
- [ ] vpsExercise có deployChecklist ≥5 step + deliverable ≥3 câu hỏi
- [ ] Toggle 4 nút hoạt động độc lập
- [ ] DB sync: `SELECT title FROM labs WHERE slug='dns'` trả kết quả
- [ ] FTS5 search "DNS TTL" trả lab này
- [ ] Quiz + flashcards + playground DNS trace không bị vỡ

## Gate Review

**Dừng đây, user tự review trước khi phase 05**:
1. Đọc toàn bộ lab DNS refactored trong browser — mất bao lâu? Có quá dài không?
2. Toggle 4 nút có hữu ích, hay 4 là nhiều quá, gộp lại 2 (why / context)?
3. Block `deploymentUse` có đúng hướng "dev chạm ở đâu khi deploy thật"? Hay quá trừu tượng?
4. `vpsExercise.deployChecklist` có thực sự làm được trên 1 VPS không? Thử 1-2 bước.
5. UI callout 3 màu có gây rối mắt, hay ổn?

**Chốt review** → điều chỉnh schema/template (quay lại phase 03 nếu cần) → sang phase 05.

## Risks

| Risk | Mitigation |
|------|------------|
| Refactor DNS tốn >1 ngày | Cắt scope: ưu tiên 8/12 row TL;DR quan trọng nhất, rest để sau |
| UX 4 toggle rối | Gate review cho phép điều chỉnh xuống 2-3 nút |
| vpsExercise dài quá → user lười làm | Tách "core exercise" (30 phút) vs "bonus" (1h), chỉ core bắt buộc |

## Out-of-scope

- 7 lab networking còn lại (phase 05)
- Module 02-08 (lần sau)
