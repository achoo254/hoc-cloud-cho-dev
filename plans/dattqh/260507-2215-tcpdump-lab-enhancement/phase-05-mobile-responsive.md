---
phase: 5
status: completed
priority: medium
estimated_hours: 1
depends_on: [3, 4]
---

# Phase 05 — Mobile Responsive

## Goal

Layout 3-panel desktop → stack vertical < `md` (768px). Hex view collapse mặc định mobile.

## Files Modified

- `app/src/components/lab/diagrams/shared/packet-decoder.tsx`
- `app/src/components/lab/diagrams/shared/packet-summary-list.tsx`
- `app/src/components/lab/diagrams/shared/packet-hex-view.tsx`

## Layout Mobile (< md)

```
┌────────────────────────┐
│ Tabs (Sample/Upload)   │
├────────────────────────┤
│ Summary List           │  scrollable, max-h-48
├────────────────────────┤
│ Layer Tree             │  full width
├────────────────────────┤
│ ▸ Hex View (click open)│  collapsed by default
└────────────────────────┘
```

## CSS Changes

`packet-decoder.tsx`:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="md:col-span-1"> <PacketSummaryList .../> </div>
  <div className="md:col-span-2 flex flex-col gap-4">
    <PacketLayerTree .../>
    <details className="md:open"> {/* mobile collapsed */}
      <summary>Hex View</summary>
      <PacketHexView .../>
    </details>
  </div>
</div>
```

(Note: `md:open` không phải Tailwind built-in — workaround: dùng state + class toggle, hoặc render `<details>` không có `open` mobile, set `open` JS khi `window.matchMedia('(min-width: 768px)').matches`. KISS: dùng `<details open={isDesktop}>` qua hook `useMediaQuery`.)

## Hooks

Tạo hoặc reuse `app/src/lib/use-media-query.ts` (check nếu chưa có thì tạo):

```ts
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}
```

Trước khi tạo: grep codebase xem có hook media query sẵn chưa (`grep -ri "matchMedia" app/src/lib/`).

## Hex View Mobile

- Dòng 16 byte có thể tràn → font nhỏ hơn (`text-[10px]`) hoặc giảm xuống 8 byte/dòng < md
- Horizontal scroll chấp nhận được nếu đã giảm font

## Summary List Mobile

- Không hiển thị summary đầy đủ (quá dài) → truncate `text-ellipsis whitespace-nowrap overflow-hidden`
- Click expand 1 packet → tree show

## Implementation Steps

1. Grep `useMediaQuery|matchMedia` trong `app/src/`
2. Tạo hook nếu chưa có
3. Update `packet-decoder.tsx` layout grid
4. Update hex view font + responsive byte/row
5. Test trên Chrome DevTools responsive (375px, 768px, 1280px)

## Success Criteria

- [ ] 375px: stack vertical, không scroll horizontal layout (chỉ hex view chấp nhận)
- [ ] 768px: 3-panel grid hiển thị đầy đủ
- [ ] Hex view mobile readable (font ≥ 10px)
- [ ] `<details>` toggle hex view smooth, không flash

## Risks

- `useMediaQuery` SSR mismatch → set initial state `false`, không matter trong Vite SPA
- `<details>` styling reset cần CSS — đã có Tailwind preflight
