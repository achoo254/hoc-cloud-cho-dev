# Phase 00 — Spike + Fixtures (Fail-Fast Gate)

**Status:** pending · **Effort:** 0.5d · **Priority:** P0 (BLOCKER) · **Depends on:** none

## Goal

**Before committing to full rewrite**, spike 1 lab + dashboard slice trong Vite+React+shadcn để verify:
1. Schema v3 Zod parse được tất cả lab hiện có (fixture-driven)
2. Bundle size baseline chấp nhận được
3. DX không regression nghiêm trọng
4. Animation/UI polish thực sự đáng effort

Kết thúc phase này phải có **go/no-go decision**. Nếu no-go → abort plan, fall back vanilla refactor.

## Steps

### Fixture dump

1. Viết script `scripts/dump-lab-fixtures.ts`:
   - Query `data/hoccloud.db` labs table
   - Pick 5 labs đại diện: 1 simple (no quiz), 1 với quiz, 1 với flashcard SM-2, 1 với mermaid, 1 phức tạp nhất (tính theo LOC inline schema)
   - Dump raw JSON ra `fixtures/labs/*.json`
2. Đếm schema fields xuất hiện trong toàn bộ 50+ labs (coverage analysis) → liệt kê required/optional/variant

### Zod schema — fixture first

3. Viết `schema-lab.ts` **dựa trên fixtures**, không đoán từ lab-template.js
4. Chạy Zod `.parse()` lên **tất cả** labs trong DB (không chỉ 5 fixture) — bằng script, không build UI
5. **Gate 1:** ≥ 95% labs parse OK. < 95% → schema có edge case, refine đến khi đạt. Không bypass bằng `.passthrough()`

### Minimal spike UI

6. Vite+React+TS+Tailwind+shadcn scaffold (chỉ đủ chạy, bỏ qua proxy/routing/RQ)
7. Dùng 1 fixture lab → render qua prototype `<LabRenderer>` minimal (title + 1 section + quiz nếu có)
8. Dùng 1 dashboard section (`<StatsSection>` fake data) để test heatmap + animation
9. Dùng shadcn Card + Framer Motion stagger

### Measurements

10. `npm run build` → đo bundle size gzip
11. Lighthouse trên spike
12. Đo HMR speed sửa 1 prop

## Go/No-go gates

| Gate | Threshold | Fail action |
|---|---|---|
| Schema parse coverage | ≥ 95% labs | Refine schema, không bypass |
| Main bundle gzip | ≤ 100KB (trước khi add content) | Cân nhắc: bỏ Framer Motion / dùng Motion One / reconsider stack |
| HMR p95 | ≤ 500ms | Check Vite config |
| Dashboard spike "feels" better vs vanilla | Subjective yes | Nếu không thấy hơn → **ABORT plan, fall back vanilla refactor** |

## Files tạo

- `scripts/dump-lab-fixtures.ts`
- `fixtures/labs/*.json` (5 files)
- `spike/` (sẽ xoá sau decision) — scaffold tạm
- `app/src/lib/schema-lab.ts` (giữ lại nếu go)

## Success criteria (Go decision)

- All 4 gates pass
- Schema v3 Zod types finalized và stable (không còn guessing)
- Confident về bundle budget, effort estimate sát thực tế hơn

## Abort criteria (No-go)

- Schema có > 5% labs không parse được → edge case quá nhiều, rewrite không tiết kiệm
- Bundle > 150KB gzip trước content → stack quá nặng cho personal workspace
- Spike UI không thấy tốt hơn vanilla đáng kể → 3 pain points giải được bằng refactor rẻ hơn

## Next

- **Go:** Continue Phase 01 với fixtures đã có, schema đã pin
- **No-go:** Viết `plans/.../reports/abort-260419-spike.md`, đề xuất plan alternative (vanilla refactor + Alpine.js)
