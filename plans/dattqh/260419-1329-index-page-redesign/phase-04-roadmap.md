# Phase 04 — Learning Roadmap Timeline

**Priority:** P1 · **Status:** completed · **Effort:** 3h

## Goal
Timeline 8 phase có dependency arrow, duration, progress. Click node → scroll tới phase group ở catalog.

## Files

- **MODIFY:** `labs/index.html` (thêm `#roadmap-mount`, extend CATALOG với `duration`, `prereq`)
- **MODIFY:** `labs/_shared/index-sections.js` (renderRoadmap)
- **MODIFY:** `labs/_shared/index-page.css`

## CATALOG schema extension

```js
{
  id: 'phase-01',                 // NEW — stable id cho scroll anchor
  phase: 'Phase 01 — Networking',
  duration: '8-10h',              // NEW
  prereq: [],                     // NEW — array of phase ids
  labs: [...]
}
// Phase 02 prereq: ['phase-01'], etc.
```

## Layout

### Desktop (>1024)

Horizontal timeline flex, node connected by SVG line:

```
[01 Networking]──→[02 Linux]──→[03 Docker]──→[04 Python]
    ↓                                            ↓
    prereq=[]                                    prereq=[03]
    8 labs · 8-10h                               5 labs · 6h
    ████░░░░ 50%
```

### Tablet (640-1024)

Horizontal scroll-x snap, 3 node visible, snap-align center.

### Mobile (<640)

Vertical timeline, node stack, left vertical line connector.

## Node content

- Number badge: `01..08`, accent bg nếu có progress, green nếu done.
- Phase name: short (strip "Phase XX — " prefix).
- Stats: `{ready}/{total} lab · {duration}`.
- Progress bar: từ stats per-phase (count labs completed).
- Click → `document.querySelector('[data-phase-id="phase-01"]')?.scrollIntoView()`.

## Renderer

```js
export function renderRoadmap(mount, catalog, stats) {
  const phases = catalog.map(g => ({
    id: g.id,
    name: g.phase.replace(/^Phase \d+ — /, ''),
    num: g.id.split('-')[1],
    duration: g.duration || '—',
    prereq: g.prereq || [],
    total: g.labs.length,
    ready: g.labs.filter(l => l.status === 'ready').length,
    done: g.labs.filter(l => statsIsLabDone(l.id, stats)).length,
  }));
  mount.innerHTML = `<ol class="roadmap-timeline">${phases.map(renderNode).join('')}</ol>`;
}
```

## Phase group anchor

Trong renderer phase-group của `bootIndex`, set `div.setAttribute('data-phase-id', group.id)`.

## Acceptance

- 8 node render đúng với duration + progress.
- Click node → smooth scroll tới phase group (-80px offset cho sticky header nếu có).
- Desktop: horizontal, mobile: vertical. Tablet: scroll-snap mượt.
- Prereq arrow ẩn ở mobile (redundant với order).
- Touch target ≥44px cho node.

## Unresolved

- Duration ước tính cho 8 phase: phase-01 đã rõ từ schema v2 `estimatedMinutes` (sum ~6h). Các phase khác chưa có lab đầy đủ → hardcode estimate dựa roadmap plan `260419-0823`.
