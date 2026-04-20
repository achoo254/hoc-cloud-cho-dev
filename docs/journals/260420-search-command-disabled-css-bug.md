# Bug: Search command (Ctrl+K) bị mờ và không click được

**Date**: 2026-04-20 20:52
**Severity**: High
**Component**: `components/ui/command.tsx`, `components/search/search-command.tsx`
**Status**: Resolved

## What Happened

Search command Ctrl+K hiển thị kết quả nhưng opacity 50% và click không hoạt động. User bấm vào item thì không navigate được.

## The Brutal Truth

Mất thời gian debug vì lỗi quá ngầm — cmdk set `data-disabled="false"` (string) thay vì bỏ attribute. Tailwind `data-[disabled]` match bất kỳ element nào CÓ attribute đó, kể cả khi value là `"false"`. Kết quả: toàn bộ item bị coi là disabled.

## Technical Details

```
Before: opacity=0.5, pointerEvents=none, navigated=false
After:  opacity=1, pointerEvents=auto, navigated=true
```

Selector sai: `data-[disabled]:opacity-50` → fix: `data-[disabled=true]:opacity-50`

Files: `command.tsx:146`, `select.tsx:119`, `search-command.tsx` (thêm onClick backup).

## Root Cause

Giả định sai: `data-[disabled]` chỉ match khi disabled. Thực tế CSS attribute selector `[attr]` match khi attribute **tồn tại**, không quan tâm value.

## Lessons Learned

Khi dùng third-party library đặt attribute dạng boolean-string (`"true"`/`"false"`), **luôn dùng** `data-[attr=true]` thay vì `data-[attr]`. Kiểm tra DOM thực tế trước khi viết selector.

## Next Steps

- Audit toàn bộ `data-[disabled]` pattern trong codebase — có thể có chỗ khác mắc lỗi tương tự.
