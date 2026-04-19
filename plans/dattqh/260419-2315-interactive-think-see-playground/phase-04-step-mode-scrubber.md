# Phase 04 — Step-by-step mode

> **[RED TEAM #5] CUT FROM PILOT** — Step mode gần như duplicate story mode (cùng reducer, cùng frames, chỉ khác auto-tick). Đã absorb keyboard `← → Space` vào phase-03 story mode (30 phút). Drill-down Sheet panel defer sang v2 (sau khi có learning signal). File giữ lại tham khảo cho plan v2.

**Priority:** P2 | **Effort:** 0.5d | **Status:** CUT (v2) | **Depends:** phase-03

## Goal
Thêm Step mode: Next/Prev buttons, no auto-advance, click device/layer drill-down side panel.

## Related files
- `app/src/components/lab/diagrams/packet-journey.tsx` — add mode switcher
- `app/src/components/lab/diagrams/drill-down-panel.tsx` — NEW side panel
- `app/src/components/lab/diagrams/journey-reducer.ts` — reuse (no new action)

## Implementation steps
1. Mode tabs ở top: Story / Step / Sandbox (Sandbox placeholder tới phase-05).
2. Step mode: disable auto-tick, show explicit Prev / Next buttons + current-step indicator (e.g. `3 / 9`).
3. Keyboard: ← Prev, → Next, Space pause/resume (story mode), Esc close drill-down.
4. Click device hoặc layer slot → open `drill-down-panel.tsx` (shadcn Sheet từ phải):
   - Device: title, role description
   - Layer: protocol detail từ TLDR, current frame's `observeWith` + `code` nếu có, liên kết tới `failModes[]` của step hiện tại
5. Drill-down panel giữ mở khi user chuyển frame (update content theo frame mới).

## Acceptance criteria
- Tab switcher work, state reset sạch giữa modes (hoặc preserve frameIdx).
- Keyboard nav work theo mô tả.
- Click layer → panel mở với đúng content.
- No regression Story mode.

## Risks
- Event handler leak khi switch mode → cleanup trong `useEffect`.
