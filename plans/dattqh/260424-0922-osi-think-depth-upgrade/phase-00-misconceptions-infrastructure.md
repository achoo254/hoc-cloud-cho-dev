---
title: "Phase 0 — Misconceptions Full-Stack Infrastructure"
status: pending
priority: P1
effort: 2h
depends_on: []
---

# Phase 0 — Misconceptions Full-Stack Infrastructure

## Context Links

- Brainstorm: `plans/dattqh/reports/brainstorm-260424-0807-osi-think-depth-upgrade.md` §4.1
- Schema spec: `docs/lab-schema-v3.md` §7 (mandatory ≥2), §8 (rationale)
- Zod schema: `app/src/lib/schema-lab.ts`
- API mapping: `server/api/labs-routes.js` → `toLabContent()`
- Renderer: `app/src/components/lab/lab-renderer.tsx` → `TldrSection`

## Overview

**Priority:** P1 — Blocker for all other phases

`misconceptions` exists in schema spec and content-guidelines but is absent from the entire implementation stack. No content upgrade has any value until this field is wired end-to-end.

## Data Flow

```
MongoDB doc.misconceptions[]
  → labs-routes.js toLabContent() [add mapping]
  → /api/labs/:slug JSON response
  → schema-lab.ts LabFixtureSchema [add MisconceptionSchema]
  → LabContent type
  → lab-renderer.tsx MisconceptionsSection component [new]
  → THINK tab (rendered above TldrSection)
```

## Requirements

**Functional**
- `misconceptions` field stored in MongoDB as `[{ wrong, right, why }]`
- API maps field through `toLabContent()` — same snake_case convention
- Zod validates shape; FE type inferred from schema
- Rendered in THINK tab above TL;DR table as `callout-misconception` cards

**Non-functional**
- Adding field as `optional()` in Zod first (non-breaking — 8 labs currently have no data)
- `wrong` and `right` render as plain text; `why` renders via `dangerouslySetInnerHTML` (HTML inline links allowed, per existing `walkthrough.why` pattern)
- Zero DOM renders if `misconceptions` absent or empty (no empty card grid)

## Architecture

### New Zod shape (schema-lab.ts)

```ts
export const MisconceptionSchema = z.object({
  wrong: z.string(),
  right: z.string(),
  why: z.string(),
}).passthrough()
```

Add to `LabFixtureSchema`:
```ts
misconceptions: z.array(MisconceptionSchema).optional(),
```

### API mapping (labs-routes.js toLabContent)

```js
misconceptions: doc.misconceptions ?? [],
```

### Renderer component (lab-renderer.tsx)

New `MisconceptionsSection` component, inserted before `TldrSection` in THINK tab:

```tsx
function MisconceptionsSection({ items }: { items: Misconception[] }) {
  if (!items || items.length === 0) return null
  return (
    <section className="space-y-4">
      <SectionHeading phase="THINK" title="Hiểu lầm thường gặp" />
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2">
            <p className="text-sm font-semibold text-destructive">
              ❌ {item.wrong}
            </p>
            <p className="text-sm text-foreground">
              ✅ {item.right}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed"
               dangerouslySetInnerHTML={{ __html: item.why }} />
          </div>
        ))}
      </div>
    </section>
  )
}
```

### Playground integration

OSI lab uses `tcp-ip-journey-playground.tsx` which renders THINK tab via `LayerStackEncap`. After Phase 0, `MisconceptionsSection` must also appear in the playground's THINK tab. Check `tcp-ip-journey-playground.tsx` THINK tab slot and inject `<MisconceptionsSection items={lab.misconceptions ?? []} />` above `<LayerStackEncap>`.

Other 6 labs with playgrounds (ARP, DHCP, DNS, HTTP, ICMP, IPv4, TCP-UDP): each playground's THINK tab must also include `MisconceptionsSection`. List playground files to patch:
- `arp-playground.tsx`
- `dhcp-playground.tsx`
- `dns-playground.tsx`
- `http-playground.tsx`
- `icmp-ping-playground.tsx`
- `ipv4-playground.tsx`
- `tcp-udp-playground.tsx`

## Related Files

**Modify:**
- `app/src/lib/schema-lab.ts` — add `MisconceptionSchema`, extend `LabFixtureSchema`
- `server/api/labs-routes.js` — add `misconceptions` to `toLabContent()`
- `app/src/components/lab/lab-renderer.tsx` — add `MisconceptionsSection`, wire into THINK tab

**Read (check THINK tab slot, then patch):**
- `app/src/components/lab/diagrams/tcp-ip-journey-playground.tsx`
- `app/src/components/lab/diagrams/arp-playground.tsx`
- `app/src/components/lab/diagrams/dhcp-playground.tsx`
- `app/src/components/lab/diagrams/dns-playground.tsx`
- `app/src/components/lab/diagrams/http-playground.tsx`
- `app/src/components/lab/diagrams/icmp-ping-playground.tsx`
- `app/src/components/lab/diagrams/ipv4-playground.tsx`
- `app/src/components/lab/diagrams/tcp-udp-playground.tsx`

**No new files** unless `MisconceptionsSection` pushes `lab-renderer.tsx` past 200 lines — then extract to `app/src/components/lab/misconceptions-section.tsx`.

## Implementation Steps

1. **schema-lab.ts**: Define `MisconceptionSchema` (wrong/right/why strings + passthrough). Add `misconceptions: z.array(MisconceptionSchema).optional()` to `LabFixtureSchema`. Export `Misconception` type.
2. **labs-routes.js**: In `toLabContent()`, add `misconceptions: doc.misconceptions ?? []`. No change to `toIndexEntry()`.
3. **lab-renderer.tsx**: Implement `MisconceptionsSection`. Check line count — extract to separate file if needed. Wire into THINK tab: render `<MisconceptionsSection>` above `<TldrSection>` in `LabTabsWithoutPlayground`.
4. **Playground THINK tabs**: For each playground file, locate THINK tab render, prepend `<MisconceptionsSection items={lab.misconceptions ?? []} />`. Confirm `lab` prop is typed as `LabContent`.
5. **Compile check**: `pnpm --dir app run typecheck` — must pass zero errors.
6. **Smoke test**: Start dev server (`pnpm run dev:server` + `pnpm --dir app run dev`). Navigate to any lab. THINK tab must render with no errors (misconceptions section absent = OK since field empty).

## Todo

- [ ] Add `MisconceptionSchema` + `Misconception` type to `schema-lab.ts`
- [ ] Add `misconceptions` to `LabFixtureSchema` as optional array
- [ ] Add `misconceptions: doc.misconceptions ?? []` to `toLabContent()` in `labs-routes.js`
- [ ] Implement `MisconceptionsSection` component in `lab-renderer.tsx` (or extracted file)
- [ ] Wire `MisconceptionsSection` above `TldrSection` in `LabTabsWithoutPlayground`
- [ ] Patch `tcp-ip-journey-playground.tsx` THINK tab
- [ ] Patch all 7 other playground THINK tabs
- [ ] Run `pnpm --dir app run typecheck` — 0 errors
- [ ] Smoke test: THINK tab renders without crash on lab with no misconceptions

## Success Criteria

- `GET /api/labs/tcp-ip-packet-journey` response JSON contains `misconceptions: []`
- TypeScript type `LabContent.misconceptions` exists and is `Misconception[] | undefined`
- THINK tab renders `MisconceptionsSection` (hidden when empty, visible when data present)
- No TypeScript compile errors
- All playground THINK tabs accept `lab.misconceptions`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Playground THINK tab structure varies per file | Med | Med | Read each file before patching; pattern is consistent (TabsTrigger "think") |
| `lab-renderer.tsx` exceeds 200 lines after addition | High | Low | Extract `MisconceptionsSection` to `misconceptions-section.tsx` immediately |
| Zod optional vs required mismatch later | Low | Med | Add as optional now, document TODO to tighten after Phase 5 backfill complete |
| `dangerouslySetInnerHTML` XSS in misconceptions.why | Low | High | Content is author-controlled (MongoDB admin only, no user input). Same risk level as existing `walkthrough.why`. No change needed to existing security posture. |

## Security Considerations

- `misconceptions[].why` uses `dangerouslySetInnerHTML` — same attack surface as existing `walkthrough[].why` and `tryAtHome[].why`. Content origin is MongoDB admin write (not user input). Acceptable per current project security posture.
- Do not add `misconceptions` to any user-facing write endpoint.

## Next Steps

- Phase 1 (can run in parallel): verify HTML links in `tldr.why` render path
- Phase 2 (blocked on this phase): OSI content update requires field to exist in DB + API
