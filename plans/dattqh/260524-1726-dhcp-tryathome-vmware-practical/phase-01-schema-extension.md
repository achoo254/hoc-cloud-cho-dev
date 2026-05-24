# Phase 1 — Schema Extension (Zod + TS + docs)

**Status:** pending | **Priority:** high | **Effort:** 1h | **Depends on:** none

## Context

`tryAtHome[]` hiện chỉ có `{cmd, why, observeWith?}` (xem `app/src/lib/schema-lab.ts:104-110`). Schema dùng `.passthrough()` → extra field đã được giữ qua Mongo nhưng chưa có TS type → renderer không biết về `steps[]`/`analysis`.

Mục tiêu: bổ sung field optional vào Zod + xuất TS type để renderer (Phase 2) consume an toàn.

## Requirements

- Backward compatible — 7 lab cũ render không đổi
- Tất cả field mới `.optional()`
- TS type infer chính xác (không `any`)
- Validator cho `vmTarget` enum + `phaseType` enum

## Files to modify

| File | Action |
|------|--------|
| `app/src/lib/schema-lab.ts` | Extend `TryAtHomeSchema` |
| `docs/lab-schema-v3.md` | Cập nhật bảng `tryAtHome[]` |

## Implementation

### `app/src/lib/schema-lab.ts`

Thay block `TryAtHomeSchema`:

```ts
export const TryAtHomeStepSchema = z
  .object({
    n: z.number().int().positive(),
    do: z.string().min(1),
    expect: z.string().min(1),
    screenshot: z
      .object({
        src: z.string().min(1),
        alt: z.string().min(1),
        caption: z.string().min(1),
      })
      .optional(),
  })
  .passthrough()

export const TryAtHomeAnalysisSchema = z
  .object({
    observation: z.string().min(1),
    mechanism: z.string().min(1),
    lesson: z.string().min(1),
  })
  .passthrough()

export const TryAtHomeTroubleshootSchema = z
  .object({
    symptom: z.string().min(1),
    fix: z.string().min(1),
  })
  .passthrough()

export const TryAtHomeSchema = z
  .object({
    // existing
    cmd: z.string(),
    why: z.string(),
    observeWith: z.string().optional(),

    // NEW (all optional)
    title: z.string().optional(),
    sbsSection: z.string().optional(),
    vmTarget: z.enum(['host', 'server', 'client1', 'client2']).optional(),
    estimatedMinutes: z.number().int().positive().optional(),
    phaseType: z.enum(['core', 'optional']).optional(),
    steps: z.array(TryAtHomeStepSchema).optional(),
    analysis: TryAtHomeAnalysisSchema.optional(),
    troubleshooting: z.array(TryAtHomeTroubleshootSchema).optional(),
  })
  .passthrough()

// type exports
export type TryAtHomeStep = z.infer<typeof TryAtHomeStepSchema>
export type TryAtHomeAnalysis = z.infer<typeof TryAtHomeAnalysisSchema>
export type TryAtHomeTroubleshoot = z.infer<typeof TryAtHomeTroubleshootSchema>
export type TryAtHome = z.infer<typeof TryAtHomeSchema>
```

Thêm 3 sub-schema vào `LabSchemas` namespace (§149-157).

### `docs/lab-schema-v3.md`

Mở rộng bảng `tryAtHome[]` — thêm hàng cho field mới, ví dụ shape `steps[]`, `analysis`. Note rõ "Optional — render expanded card khi có `steps[]`. VMware Workstation Pro 25H2 baseline".

## Verification

```bash
pnpm --dir app run typecheck     # no new errors
```

Smoke test: chạy `pnpm run dev:server` + `pnpm --dir app run dev` → mở 1 lab cũ (dns/osi/tcpdump) → render không đổi.

## Risks

- Zod `.passthrough()` không strict — extra field không định nghĩa vẫn pass. OK cho migration nhưng cần ý thức.
- Enum `vmTarget` hardcode 4 giá trị — nếu sau này thêm `client3` phải đổi schema.

## Deliverable

- Updated `schema-lab.ts` với 3 sub-schema + extended `TryAtHomeSchema`
- Updated `docs/lab-schema-v3.md`
- Typecheck pass
