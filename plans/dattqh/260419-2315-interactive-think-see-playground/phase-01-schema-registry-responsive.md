# Phase 01 — Schema extension + component registry + responsive switch

**Priority:** P1 (foundation) | **Effort:** 0.5d | **Status:** ✅ complete

## Goal
Scaffold optional `diagram` field trong fixture schema, component registry mapping slug/component-name → React component, responsive switch trong `LabRenderer`.

## Related files
- `app/src/lib/schema-lab.ts` — add `DiagramSchema` optional field
- `app/src/components/lab/lab-renderer.tsx` — responsive switch
- `app/src/components/lab/diagrams/registry.ts` — NEW, map name → lazy component
- `app/src/lib/hooks/use-media-query.ts` — NEW hook
- `fixtures/labs/tcp-ip-packet-journey.json` — add `diagram: { type: 'custom', component: 'TcpIpJourneyPlayground' }`
- `scripts/validate-lab-fixtures.js` — tolerate new field (schema passthrough đã cover)

## Implementation steps
1. Add to `schema-lab.ts`:
   ```ts
   export const DiagramSchema = z.discriminatedUnion('type', [
     z.object({ type: z.literal('custom'), component: z.string().min(1) }),
     z.object({ type: z.literal('layer-stack'), config: z.record(z.unknown()) }),
     z.object({ type: z.literal('sequence'),    config: z.record(z.unknown()) }),
     z.object({ type: z.literal('bit-mask'),    config: z.record(z.unknown()) }),
   ])
   // In LabFixtureSchema: diagram: DiagramSchema.optional(),
   ```
2. Create `use-media-query.ts` hook (SSR-safe, default false).
3. Create `registry.ts`:
   ```ts
   import { lazy } from 'react'
   export const diagramRegistry = {
     TcpIpJourneyPlayground: lazy(() =>
       import('./tcp-ip-journey-playground').then(m => ({ default: m.TcpIpJourneyPlayground }))
     ),
   } as const
   ```
4. In `lab-renderer.tsx`: if `desktop && lab.diagram?.type === 'custom'` → render `<Suspense><Component lab={lab}/></Suspense>` instead of THINK + SEE sections. Keep SHIP (quiz/flashcards/commands) untouched.
5. Add placeholder `tcp-ip-journey-playground.tsx` exporting component with "Coming soon" text — unblocks lazy import.
6. Update `tcp-ip-packet-journey.json` fixture with `diagram` field; regen content modules via `npm run gen:content`.
7. Verify 7 other labs vẫn render text (no regression).

## Acceptance criteria
- TS compile clean.
- Desktop on `tcp-ip-packet-journey` shows placeholder component (THINK + SEE replaced).
- Mobile vẫn thấy text TLDR + walkthrough.
- 7 labs khác không đổi.
- `node scripts/validate-lab-fixtures.js` pass.

## Risks
- Lazy import breaking HMR → test Vite dev server.
- Registry key drift vs fixture string → enforce via `z.enum(Object.keys(diagramRegistry))` (xem [RED TEAM #6]).

## [RED TEAM] Required changes

### #6 — Schema giảm còn 1 variant (premature abstraction)
Thay step 1 schema bằng:
```ts
const registryKeys = Object.keys(diagramRegistry) as [string, ...string[]]
export const DiagramSchema = z.object({
  type: z.literal('custom'),
  component: z.enum(registryKeys),
})
// In LabFixtureSchema: diagram: DiagramSchema.optional(),
```
Khi thực sự cần primitive thứ 2 → extend thành discriminatedUnion lúc đó.

### #9 — ErrorBoundary quanh Suspense (chunk load fail)
Step 4 wrap:
```tsx
<ErrorBoundary fallback={<LabRendererText lab={lab} />}>
  <Suspense fallback={<PlaygroundSkeleton />}>
    <Component lab={lab} />
  </Suspense>
</ErrorBoundary>
```
ErrorBoundary catch `ChunkLoadError` → fallback text renderer + optional reload-on-retry.

### #13 — Automated regression test (blocker cho acceptance)
Thêm `app/src/components/lab/__tests__/lab-renderer.test.tsx`:
- Render mỗi lab fixture với `window.matchMedia` stub (desktop + mobile).
- Assert `tcp-ip-packet-journey` desktop → calls lazy playground.
- Assert 7 labs khác → render `<WalkthroughSection>` text.
Fail CI nếu snapshot diff.

### #14 — Desktop-only không dùng media-query hook
**Option A (recommend):** Bỏ `use-media-query.ts`. Dùng CSS-only:
```tsx
<>
  <div className="hidden md:block"><Playground /></div>
  <div className="md:hidden"><TextRenderer /></div>
</>
```
Single render path, không unmount khi resize, không SSR guard cần thiết (Vite SPA).
**Option B:** Đọc `window.innerWidth < 768` sync tại module init + hysteresis 300ms.
Bỏ note "SSR-safe" (cargo-cult — app là SPA).

### #12 — Feature flag
Check `import.meta.env.VITE_ENABLE_DIAGRAM_PLAYGROUND !== 'false'` ở đầu branch playground. `?textMode=1` query override cho user tự bypass.
