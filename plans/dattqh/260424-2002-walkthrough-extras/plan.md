# Walkthrough extras: render whyBreaks / failModes / fixSteps

**Branch:** master | **Status:** in-progress

## Problem

`WalkthroughStep` trong Mongo có sẵn 3 field chưa được FE render:
- `whyBreaks` (string, 100% steps có)
- `failModes` (array `{symptom, evidence}`, 1-2/lab)
- `fixSteps` (array `{step, command}`, 1-2/lab)

8/8 labs đều có data → content bị giấu.

## Decision

Render inline trong `WalkthroughSection` (app/src/components/lab/lab-renderer.tsx), theo pattern TLDR `Why / Breaks when / Deploy`:
- `whyBreaks` → line `Breaks when:` màu destructive, `dangerouslySetInnerHTML`
- `failModes` → block nhỏ sau code: mỗi item 1 card nhỏ (`symptom` + evidence monospace)
- `fixSteps` → numbered list với `command` inline code

Giữ KISS: KHÔNG collapsible/accordion. Inline đơn giản, match visual ngân sách hiện tại.

## Files

- `app/src/components/lab/lab-renderer.tsx` — sửa `WalkthroughSection` (lines 185-218)

## Steps

1. Edit `WalkthroughSection`: thêm 3 block conditional
2. Typecheck pnpm `--dir app run typecheck`
3. Manual verify trong browser 1-2 labs

## Risks

- `failModes`/`fixSteps` có thể là dạng string thuần (schema union). Cần type guard.
- `whyBreaks` có thể chứa HTML → phải `dangerouslySetInnerHTML`.

## Out of scope

- Editor UI cho các field này
- Migration/data validation
