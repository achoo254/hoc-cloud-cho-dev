---
type: brainstorm
date: 2026-04-19
status: approved
---

# Schema v3 — THINK · SEE · SHIP

## Problem
Schema v2 (4 chân: WHY/BREAKS/OBSERVE/DEPLOY) thiếu chiều "failure evidence" và "automation bridge". Khi gặp bug thật, học viên không có template tra cứu: triệu chứng (FAIL), cách sửa (FIX), cách script hoá (AUTOMATE). Cần nâng cấp lên v3 với mnemonic 3 trụ dễ nhớ.

## Approved Design

### Cấu trúc (12 sections, 4 nhóm)

```
THINK   → Misconceptions* · WHY* · BREAKS*
SEE     → OBSERVE* · FAIL° · FIX°
SHIP    → AUTOMATE° · DEPLOY*
OUTPUT  → TL;DR* · Quiz* · Flashcards* · Try at home*
```

`*` = mandatory (9 sections) · `°` = optional (3 sections — ẩn hẳn nếu không có)

### Định nghĩa ranh giới

| Section | Câu hỏi | Phân biệt |
|---------|---------|-----------|
| Misconceptions | Hiểu sai gì cần unlearn? | Trước WHY |
| WHY | Tại sao concept tồn tại? | Lý do thiết kế |
| BREAKS | Thiếu hiểu thì vỡ ở đâu? | **Hậu quả lý luận** |
| OBSERVE | Lệnh gì để thấy? | Tool/flag |
| FAIL | Triệu chứng thật khi hỏng? | **Bằng chứng** (log/exit/error) |
| FIX | Sửa thế nào? | Action sau FAIL |
| AUTOMATE | Script hoá local? | Bash/Python/Ansible |
| DEPLOY | Prod checklist? | VPS apply |

### Migration strategy

- **Phase A** (pilot): Spec + runtime + CSS + 1 lab pilot (ICMP) — verify UX
- **Phase B** (rollout): Migrate 7 labs còn lại
- **Phase C** (docs): Update guidelines + smoke

### Decisions

1. Optional sections **ẩn hẳn** khi không có data (KISS, không render placeholder)
2. Thứ tự THINK→SEE→SHIP→OUTPUT giữ nguyên
3. Tạo plan riêng `260419-1737-schema-v3-think-see-ship` (scope tách bạch với plan UI hiện tại)

## Files in scope

- `labs/_shared/lab-template.js` — 4 renderer mới
- `labs/_shared/lab-template.css` — 4 callout style
- `docs/lab-schema-v3.md` — spec mới
- `docs/content-guidelines.md` — §8 mapping v3, §11 mandatory rule
- `labs/01-networking/*.html` × 8 — content cho 4 sections mới

## Out of Scope

- Server, DB, SM-2 algorithm, index.html UI (đã có plan riêng)
- Labs 02+ (chưa tồn tại)

## Risk

- **Cost:** 12-15h (15h worst case nếu 8 labs × 1.5h content)
- **Pain:** Networking concepts ko tự nhiên có AUTOMATE/FIX → cho optional giảm gượng ép
- **Coexistence:** v2 → v3 hard cutover (không cohabit, vì migrate hết 8 labs)
- Rollback: git revert toàn bộ commit migration

## Success Criteria

- 8 labs render đúng 9 mandatory + variable optional sections
- Optional section thiếu → KHÔNG có DOM trống / callout rỗng
- DevTools console warn nếu lab thiếu mandatory field
- `docs/lab-schema-v3.md` tồn tại + cite từ guidelines §8
- Pilot ICMP lab review pass trước khi rollout 7 labs còn lại

## Next

Invoke `/ck:plan` để sinh phase plan.
