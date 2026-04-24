---
title: "Phase 3 — TL;DR UI Overflow Check (Conditional Redesign)"
status: pending
priority: P2
effort: 1h
depends_on: [phase-02]
---

# Phase 3 — TL;DR UI Overflow Check (Conditional Redesign)

## Context Links

- Renderer: `app/src/components/lab/lab-renderer.tsx` → `TldrSection`
- OSI playground THINK tab: `app/src/components/lab/diagrams/layer-stack-encap.tsx`
- Brainstorm §5 risk: "Length tăng gây UI overflow TL;DR row"
- New `tldr.why` content: 2–3× longer than originals (§4.2 — each ~300–600 chars vs original ~80 chars)

## Overview

**Priority:** P2 — Conditional. Execute only if Phase 2 visual QA reveals layout problems.

New `tldr[].why` content is 2–3× original length. Current `TldrSection` renders
each row as a card with `why` as a wrapping `<p>`. Layout concern: card height
growth may cause readability issues in the THINK tab, especially on mobile.
The OSI playground uses `LayerStackEncap` which renders tldr rows in a visual
layer-stack — long text may overflow the layer card bounds.

## Trigger Condition

**Execute Phase 3 if any of these are true after Phase 2:**
1. `TldrSection` card height exceeds ~4 lines of text on desktop (1280px) — visually awkward
2. `LayerStackEncap` layer card text overflows its styled boundary
3. Mobile (375px): card text becomes unreadable or causes horizontal scroll

**Skip Phase 3 if:** content wraps cleanly within cards on both desktop/mobile,
and `LayerStackEncap` layer cards accommodate the text without overflow.

## Architecture Options (if triggered)

### Option A — Collapse/Expand `why` field in TldrSection (recommended)

Add a `ShowMore` toggle per card. Default: show first 120 chars + "…" with
"Xem thêm" button. Expanded: full text.

```tsx
// New local state per card
const [expanded, setExpanded] = useState(false)
const PREVIEW_LEN = 120
const isLong = item.why.length > PREVIEW_LEN

// Render
<p className="text-sm text-muted-foreground leading-relaxed">
  <span className="font-medium text-foreground">Why: </span>
  <span dangerouslySetInnerHTML={{
    __html: expanded || !isLong ? item.why : item.why.slice(0, PREVIEW_LEN) + '…'
  }} />
  {isLong && (
    <button onClick={() => setExpanded(e => !e)}
            className="ml-1 text-xs text-primary underline">
      {expanded ? 'Thu gọn' : 'Xem thêm'}
    </button>
  )}
</p>
```

Pros: zero layout change, works on mobile, no new component needed.
Cons: cuts HTML mid-tag if `<a href>` spans the 120-char boundary → must
truncate at word boundary or use a text-only preview with HTML only when expanded.

**Safe implementation**: store plain-text preview separately, or truncate at last
space before 120 chars (no mid-tag risk).

### Option B — Move `why` to tooltip/popover

Show short `what` label + info icon; click/hover shows full `why` in a
`Popover` (Shadcn UI already in project). Zero card height change.

Pros: cleanest layout.
Cons: discoverability — users may not find the info icon; content hidden behind interaction.

### Option C — Accept row height growth (no redesign)

If cards wrap naturally and are readable, do nothing.
Pros: zero code change. Cons: potentially long cards on mobile.

**Recommended: Option A** if overflow detected, **Option C** if layout acceptable.

### LayerStackEncap overflow (OSI playground only)

`LayerStackEncap` renders tldr rows as visual layer cards with fixed/constrained
height. Check if the component has `overflow: hidden` or `max-h` constraints.

If overflow: add `overflow-y: auto` + `max-h` to layer card inner text container.
This is a 2-line CSS change — no component architecture change needed.

## Related Files

**Modify (if Option A triggered):**
- `app/src/components/lab/lab-renderer.tsx` → `TldrSection` component
- `app/src/components/lab/diagrams/layer-stack-encap.tsx` (if layer card overflow)

**Do NOT modify:**
- `schema-lab.ts` — no schema change
- MongoDB data — no content change

## Implementation Steps

1. **Visual QA**: start dev server, navigate to `tcp-ip-packet-journey` THINK tab.
   Check at 1280px, 768px, 375px viewport widths. Note any overflow or layout issues.

2. **LayerStackEncap check**: inspect OSI playground THINK tab (has interactive
   layer stack). Check layer card height/overflow with new content.

3. **Decision**: choose Option A, B, or C based on QA findings. Document here.

4. **If Option A**:
   a. Modify `TldrSection`: add collapse/expand per card.
   b. Truncate at last word boundary before 120 chars (no mid-HTML-tag risk).
   c. Check line count of `lab-renderer.tsx` — extract `TldrSection` if >200 lines total.

5. **If LayerStackEncap overflow**: add `overflow-y: auto` + `max-h-32` to
   inner text `<p>` or container `<div>` in `layer-stack-encap.tsx`.

6. **Typecheck + visual re-check** after any changes.

## Todo

- [ ] Run dev server after Phase 2 content update
- [ ] Visual QA at 1280px / 768px / 375px — record findings
- [ ] Check `LayerStackEncap` layer card overflow
- [ ] Decision: Option A / B / C — document here
- [ ] Implement chosen option (if not C)
- [ ] Typecheck — 0 errors
- [ ] Visual re-check at all 3 viewport widths

## Success Criteria

- THINK tab TL;DR section is readable at all 3 viewports (1280/768/375px)
- No horizontal scroll introduced
- `LayerStackEncap` layer cards display without overflow clipping important text
- If Option A: collapse/expand works without mid-HTML truncation

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| HTML truncation mid-`<a>` tag (Option A) | Med | Med | Truncate at word boundary on plain-text length, render HTML only when expanded |
| `LayerStackEncap` has `overflow: hidden` → text clipped silently | Med | Med | Inspect component CSS; add `overflow-y: auto` if needed |
| Phase 3 scope creep (full TL;DR redesign) | Low | High | Scope strictly: only collapse/expand or CSS overflow fix — no layout overhaul |

## Security Considerations

None beyond Phase 0/1 `dangerouslySetInnerHTML` posture.

## Next Steps

- Phase 5 (blocked on Phase 3 decision): bulk upgrade 7 labs uses same tldr
  content pattern — must know if collapse/expand was added before drafting
  7-lab content (affects whether long `why` fields are acceptable in tldr)
