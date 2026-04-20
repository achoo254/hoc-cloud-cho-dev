# Phase 07 — Polish + a11y + bundle audit

**Priority:** P2 | **Effort:** 0.5d | **Status:** ✅ complete | **Depends:** phase-06

## Goal
A11y, keyboard nav, reduced motion, bundle size check, smoke test toàn bộ.

## Related files
- All files từ phase-01 → phase-06
- `app/vite.config.ts` — verify rollup chunks

## Implementation steps
1. **A11y**:
   - `aria-live="polite"` cho narration panel.
   - `aria-label` cho play/pause/next/prev buttons.
   - Focus trap drill-down panel.
   - Color contrast 4.5:1 minimum (verify shadcn tokens).
2. **Keyboard nav**:
   - ← Prev, → Next, Space Play/Pause, Esc close panel.
   - Tab cycles through interactive controls.
3. **Reduced motion**: detect `prefers-reduced-motion` → disable Framer Motion transitions (fall back to instant state change), disable drag animation (snap).
4. **Bundle audit**:
   - `npm run build --prefix app` → kiểm tra playground chunk lazy (không trong main bundle).
   - Target: playground chunk < 100kb gzipped.
5. **Smoke test checklist**:
   - 8 labs vẫn render (7 text + 1 playground).
   - Desktop `tcp-ip-packet-journey` → playground.
   - Mobile (<768px) → text fallback.
   - Quiz + flashcards + try-at-home vẫn work (SHIP section untouched).
   - Progress tracking vẫn upsert (`openedAt`, `completedAt`).
   - Search + TOC still navigate `#section-*` anchors (playground expose same ids).
6. **Docs update**:
   - `docs/codebase-summary.md`: thêm mục diagram registry pattern.
   - `docs/code-standards.md`: D3 vs Framer separation rule.

## Acceptance criteria
- Lighthouse a11y ≥ 90 trên lab page.
- Keyboard-only user hoàn thành story mode full playthrough.
- Reduced motion disable animation đúng.
- Playground chunk lazy, main bundle không tăng > 5kb.
- Smoke checklist all green.

## Risks
- Focus trap edge cases (Tab ra ngoài Sheet) → test với keyboard.
- `prefers-reduced-motion` ảnh hưởng drag encap demo → fall back click-to-step thay vì drag.

## [RED TEAM] Required changes

### #13 — Regression: **Manual smoke + TypeScript** (Validation S2 revise)
Self-learning repo → không setup Playwright/Vitest infra. Thay bằng:
1. `npm run typecheck --prefix app` (đã có `tsc --noEmit` trong build) — cover type regression + lazy import resolve.
2. Manual smoke checklist (phase-07 step 5) — tự click qua 8 labs trong dev server, 5 phút.
3. TypeScript strictness bảo vệ phần lớn regression runtime (fixture schema mismatch, registry key drift).

### ~~Analytics tracking~~ (CẮT — Validation S2)
Self-learning repo không có user base. Bỏ toàn bộ `event-log.ts` + admin page. Pilot validation = tự dùng 2-3 lần trong tuần đầu + note cảm nhận.

### Env flag wiring (Validation V4)
`lab-renderer.tsx`:
```tsx
const PLAYGROUND_ENABLED = import.meta.env.VITE_ENABLE_DIAGRAM_PLAYGROUND !== 'false'
const textOverride = new URLSearchParams(location.search).get('textMode') === '1'
if (!PLAYGROUND_ENABLED || textOverride) return <TextRenderer lab={lab} />
```
Document trong `docs/deployment-guide.md`: "Set `VITE_ENABLE_DIAGRAM_PLAYGROUND=false` trong env build để kill-switch".

### #15 — ESLint rule enforce D3×Framer separation
Thêm vào `app/.eslintrc` (hoặc flat config):
```json
{
  "overrides": [{
    "files": ["app/src/components/lab/diagrams/**"],
    "rules": {
      "no-restricted-imports": ["error", {
        "patterns": ["d3-selection", "d3-transition", { "group": ["d3"], "message": "Use d3-scale/d3-shape only — no DOM ops" }]
      }]
    }
  }]
}
```
Document trong `docs/code-standards.md`: "Trong `diagrams/**`, D3 CHỈ được dùng để compute numbers; Framer Motion độc quyền DOM mutation."

### Bundle gate ([RED TEAM support])
Trước phase-01 đo baseline `app/dist/assets/*.js` gzipped size, ghi vào plan.md. Mỗi phase acceptance include "main bundle delta ≤ Nkb" với N cụ thể (không phải con số "< 100kb" magic).
