# Phase 00 — D3 × Framer Motion integration spike

> **[RED TEAM #11] NEW PHASE** — Validate tích hợp D3 + Framer trước khi commit 7 phases. Không có phase này, effort 4-6d (now 3-3.5d) là ảo tưởng vì team (có thể) chưa có prior art.

**Priority:** P0 (prerequisite) | **Effort:** 0.5d | **Status:** ✅ complete | **Depends:** none

## Goal
POC 1 sample frame animated với D3 scale layout + Framer Motion transform — xác nhận 2 thư viện không tranh DOM, bundle size chấp nhận được, HMR work.

## Scope (intentionally tiny)
- 3 device nodes (client/router/server) layout qua D3 `scaleLinear`.
- 1 packet dot animate từ client → router → server qua Framer `animate`.
- Play/Pause button duy nhất.
- KHÔNG: scrubber, narration, layer slots, drill-down, sandbox, export, a11y.

## Decision criteria (go/no-go phase-01)

### Go
- D3 output scale → Framer transform render đúng, không conflict.
- HMR reload không phá animation state.
- Bundle impact < 60kb gzipped cho `d3-scale` + `d3-shape` + `framer-motion` tree-shaken.
- Build + test CI pass.

### No-go → evaluate alternatives
- Nếu D3 output không ổn định → **bỏ D3 hoàn toàn**, thay bằng arithmetic (xem [RED TEAM #15] alt).
- Nếu Framer bundle > 60kb → cân nhắc `react-spring` hoặc CSS-only animation.
- Nếu DOM conflict thực tế xảy ra → tái thiết kế kiến trúc trước khi ship.

## Implementation steps
1. Install deps: `npm install --save-exact framer-motion@<pinned> d3-scale@<pinned> d3-shape@<pinned>`. Commit lockfile.
2. Create `app/src/components/lab/diagrams/spike-poc.tsx` (temporary, xóa sau phase-01).
3. Wire vào route `/spike-playground` (dev-only, không expose production).
4. Đo bundle: `npm run build --prefix app` → note `dist/assets/*.js` gzipped size.
5. Test HMR: Vite dev server, edit component → animation không reset hard (hoặc reset sạch có chủ đích).
6. Document findings trong `plans/dattqh/reports/spike-d3-framer-260419.md`:
   - Versions pinned
   - Bundle delta
   - Integration issues gặp phải
   - Go/no-go decision + lý do

## Acceptance criteria
- Spike component animate được 1 packet qua 3 devices.
- Bundle delta đo và document.
- Report file ghi decision.
- Nếu no-go: plan.md cập nhật stack + effort tương ứng.

## Risks
- Spike kéo dài thành full implementation → timebox 0.5d hard cap, xóa code sau phase-01 bất kể outcome.
- "Hoạt động trong spike nhưng fail trong phase-02 drag" → spike cố ý tiny để không tạo false confidence; phase-02 acceptance riêng.
