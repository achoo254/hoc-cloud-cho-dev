# Phase 03 — Docs Update + Smoke + Supersede v2

**Status:** completed | **Effort:** 2h | **Actual:** 1h | **Priority:** P1 | **Depends:** Phase 02

## Goal

Update content-guidelines, mark v2 superseded, full smoke test 8 labs.

## Files

- `docs/content-guidelines.md` — §8 mapping v3, §11 mandatory rule update
- `plans/dattqh/260419-1048-why-schema-v2/plan.md` — mark `status: superseded`
- `README.md` — update reference v2 → v3 (nếu có mention)

## Steps

### 1. Update `docs/content-guidelines.md`

**§8 — rewrite mapping table:**

```markdown
## 8. Áp dụng cho schema v3 (labs)

Mapping guidelines với 12 sections của schema v3:

| Group | Section | Key | Mandatory? | Yêu cầu nguồn |
|-------|---------|-----|------------|---------------|
| THINK | Misconceptions | `misconceptions[]` | ✅ | Bắt buộc cite nếu myth có nguồn lan truyền |
| THINK | WHY | `why` | ✅ | Không bắt buộc |
| THINK | BREAKS | `whyBreaks` | ✅ | Bắt buộc nếu cite error code/log |
| SEE | OBSERVE | `observeWith` | ✅ | Bắt buộc cite man page |
| SEE | FAIL | `failModes[]` | ⚪ | Bắt buộc cite log/error reference |
| SEE | FIX | `fixSteps[]` | ⚪ | Bắt buộc cite man page cho command |
| SHIP | AUTOMATE | `automateScript` | ⚪ | Cite vendor docs nếu dùng API/lib |
| SHIP | DEPLOY | `deploymentUse` | ✅ | Bắt buộc cite vendor docs nếu cấu hình cụ thể |
| OUTPUT | TL;DR | `tldr[]` | ✅ | Inherit cite từ row |
| OUTPUT | Quiz | `quiz[]` | ✅ | Cite trong `explanation` |
| OUTPUT | Flashcards | `flashcards[]` | ✅ | Cite ngắn inline |
| OUTPUT | Try at home | `tryAtHome[]` | ✅ | Bắt buộc cite man page nếu flag lạ |

Spec đầy đủ: [`lab-schema-v3.md`](./lab-schema-v3.md).
```

**§11 — update Schema v2 mandatory rule (đã có sau plan 1724) → đổi v3:**

```markdown
- **Schema v3 mandatory**: Mọi lab mới BẮT BUỘC đủ 9 mandatory sections (Misconceptions, WHY, BREAKS, OBSERVE, DEPLOY, TL;DR, Quiz, Flashcards, Try at home). Optional: FAIL, FIX, AUTOMATE — chỉ thêm khi tự nhiên có, không gượng ép.
```

### 2. Mark v2 plan superseded

`plans/dattqh/260419-1048-why-schema-v2/plan.md` frontmatter:

```yaml
status: superseded
supersededBy: 260419-1737-schema-v3-think-see-ship
```

### 3. Full smoke test

```bash
npm run dev
```

Mở từng lab `01-08`, check:
- [ ] Misconceptions block render top
- [ ] Mandatory callouts (BREAKS/OBSERVE/DEPLOY) đầy đủ
- [ ] Optional callouts (FAIL/FIX/AUTOMATE) — hiển thị khi có data, ẩn khi không
- [ ] Console: chỉ warn cho thiếu mandatory (none expected)
- [ ] Style consistent across 8 labs

### 4. Grep sanity

```bash
# Đảm bảo không sót v2-only field name
grep -r "schema v2" docs/ README.md  # chỉ acceptable trong context "supersedes v2"

# Đảm bảo lab-data có misconceptions
for f in labs/01-networking/*.html; do
  grep -q '"misconceptions"' "$f" || echo "MISSING: $f"
done
```

## Acceptance

- [x] `docs/content-guidelines.md` §8 = bảng v3 đủ 12 sections
- [x] `docs/content-guidelines.md` §11 đề cập "Schema v3 mandatory"
- [x] `260419-1048-why-schema-v2/plan.md` status = `superseded`
- [ ] 8 labs pass smoke (manual checklist) *(pending manual verification)*
- [ ] `for` loop grep không output MISSING *(pending shell execution)*
