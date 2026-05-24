# Phase 2 — Renderer Extension (TRY IT expanded card + image grid + analysis callout)

**Status:** pending | **Priority:** high | **Effort:** 2h | **Depends on:** Phase 1

## Context

`TryAtHomeSection` hiện tại (xem `app/src/components/lab/lab-renderer.tsx:290-312`) render flat list: `cmd` → `why` → `observeWith`. Cần detect `steps[]` → expanded card; `phaseType: 'optional'` → collapsed accordion; `analysis` → 3-row callout.

Backward compat: nếu item không có `steps[]` → render flat như cũ.

## Requirements

- Detect `steps[]` → expanded card (title + sbsSection badge + vmTarget chip + steps list + screenshot grid)
- `phaseType: 'optional'` → `<details>` thu gọn, label "Mở rộng (tuỳ chọn)"
- `analysis` block → callout 3 row (Quan sát / Cơ chế / Bài học) sử dụng Tailwind class hiện có (`.callout-observe` đã có)
- Screenshot: `<img loading="lazy">` + `alt` + caption dưới ảnh; DOMPurify sanitize caption HTML
- Lab cũ (`tryAtHome` 7 lab khác) render KHÔNG đổi

## Files to modify

| File | Action |
|------|--------|
| `app/src/components/lab/lab-renderer.tsx` | Refactor `TryAtHomeSection` + thêm `TryAtHomePhaseCard` + `TryAtHomeAnalysisCallout` |
| `app/src/components/lab/screenshot-figure.tsx` (NEW) | Component riêng cho `<figure>` (image + caption), lazy-load, click-to-zoom optional |

## Implementation outline

### `screenshot-figure.tsx` (NEW)

```tsx
import DOMPurify from 'dompurify'

export function ScreenshotFigure({
  src, alt, caption,
}: { src: string; alt: string; caption: string }) {
  return (
    <figure className="my-2 rounded-md border border-border overflow-hidden">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-auto block bg-muted"
      />
      <figcaption
        className="text-xs text-muted-foreground px-3 py-2 border-t border-border bg-muted/50"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(caption) }}
      />
    </figure>
  )
}
```

### `TryAtHomeSection` refactor

```tsx
function TryAtHomeSection({ items }: { items: TryAtHome[] }) {
  const core = items.filter(i => i.phaseType !== 'optional')
  const optional = items.filter(i => i.phaseType === 'optional')

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold ...">Thực hành tại nhà</h3>
      {core.map((item, idx) => <TryAtHomePhaseCard key={idx} item={item} />)}
      {optional.length > 0 && (
        <details className="rounded-md border border-dashed border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Mở rộng (tuỳ chọn) — {optional.length} phase
          </summary>
          <div className="mt-3 space-y-3">
            {optional.map((item, idx) => <TryAtHomePhaseCard key={idx} item={item} />)}
          </div>
        </details>
      )}
    </div>
  )
}
```

### `TryAtHomePhaseCard`

```tsx
function TryAtHomePhaseCard({ item }: { item: TryAtHome }) {
  // Fallback: nếu không có steps[] → render flat (legacy)
  if (!item.steps || item.steps.length === 0) {
    return <LegacyTryAtHomeItem item={item} />
  }

  return (
    <article className="rounded-lg border border-border p-4 space-y-3">
      {item.title && (
        <header className="flex items-center gap-2 flex-wrap">
          <h4 className="text-base font-semibold">{item.title}</h4>
          {item.sbsSection && <Badge>{item.sbsSection}</Badge>}
          {item.vmTarget && <Chip>VM: {item.vmTarget}</Chip>}
          {item.estimatedMinutes && <Chip>~{item.estimatedMinutes}'</Chip>}
        </header>
      )}
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Tại sao: </span>
        <span dangerouslySetInnerHTML={{ __html: item.why }} />
      </p>
      {item.cmd && <CodeBlock code={item.cmd} lang="bash" />}
      <ol className="space-y-3 list-decimal pl-5">
        {item.steps.map((s) => (
          <li key={s.n} className="space-y-1.5">
            <p className="text-sm font-medium">{s.do}</p>
            <p className="text-xs text-muted-foreground italic">Mong đợi: {s.expect}</p>
            {s.screenshot && (
              <ScreenshotFigure {...s.screenshot} />
            )}
          </li>
        ))}
      </ol>
      {item.analysis && <TryAtHomeAnalysisCallout {...item.analysis} />}
      {item.troubleshooting && item.troubleshooting.length > 0 && (
        <TroubleshootList items={item.troubleshooting} />
      )}
    </article>
  )
}
```

### `TryAtHomeAnalysisCallout`

```tsx
function TryAtHomeAnalysisCallout({ observation, mechanism, lesson }: TryAtHomeAnalysis) {
  return (
    <div className="callout-observe rounded-md p-3 space-y-1.5 text-sm">
      <div><span className="font-semibold">Quan sát: </span>{observation}</div>
      <div><span className="font-semibold">Cơ chế: </span>
        <span dangerouslySetInnerHTML={{ __html: mechanism }} />
      </div>
      <div><span className="font-semibold">Bài học: </span>{lesson}</div>
    </div>
  )
}
```

## Verification

- `pnpm --dir app run typecheck` pass
- Manual smoke test:
  - Lab DHCP với draft data có `steps[]` → expanded card render
  - Lab DHCP set `phaseType: 'optional'` ở 1 item → collapsed
  - Lab DNS/OSI/TCPDump → render flat như cũ (no regression)

## Risks

- Mixed array (core + optional) hiện đang dùng `filter()` → mất thứ tự nếu user đặt optional xen kẽ. Có thể document: thứ tự core giữ nguyên thứ tự array, optional luôn cuối.
- DOMPurify đã import từ chỗ khác trong codebase — verify package version đồng nhất

## Deliverable

- `screenshot-figure.tsx` mới
- `lab-renderer.tsx` updated với `TryAtHomePhaseCard`, `TryAtHomeAnalysisCallout`, `TroubleshootList`
- Typecheck + manual smoke pass
