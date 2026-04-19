# Phase 06 — Polish

**Status:** completed (2026-04-19) · **Effort:** 1d · **Priority:** P2 · **Depends on:** phase-01..05

## Completion notes

- Route code-split + manualChunks: main 8.67KB gzip (target <200KB)
- Lazy chunks: mermaid (744KB gzip), shiki (299KB gzip) — separated from main
- `prefers-reduced-motion` cover stats/roadmap/catalog/flashcard/quiz/search
- Page transitions (AnimatePresence fade+slide, 200ms), skip-to-content link, Sonner Toaster
- LabToc sidebar (sticky desktop, Sheet mobile, IntersectionObserver active section)
- Theme default `system`, live OS change listener, animated sun/moon toggle
- `rollup-plugin-visualizer` gated by `VITE_ANALYZE=1`

## Not done (out of scope / deferred)

- `layoutId` lab-card → lab-viewer shared element (needs LayoutGroup across routes)
- NVDA screen reader manual test (requires human)
- Shiki subset migrate (`shiki/bundle/web`) — defer until Lighthouse needs

## Goal

Chuẩn hoá animation, dark mode, responsive, accessibility, performance trước khi deploy.

## Steps

### Animation

1. **Page transitions**: `<AnimatePresence>` ở App root, fade + slide-up 200ms giữa routes
2. **Layout transitions**: `layoutId` khi click lab card dashboard → expand header trang lab
3. **Micro-interactions**: hover lift card, button press, tab underline slide, skeleton shimmer
4. **Reveal on scroll**: stagger cho dashboard sections (`useInView` + `whileInView`)
5. Respect `prefers-reduced-motion` — disable motion via `useReducedMotion()`

### Dark mode

6. Theme provider (shadcn pattern, `class` strategy)
7. Toggle button trong header với sun/moon animate
8. Persist localStorage key `theme`, default: `system`
9. Test toàn bộ components dark/light đều OK

### Responsive

10. Breakpoints: mobile 375/414, tablet 768, desktop 1024/1440
11. Dashboard: grid 1 col mobile → 2 col tablet → 3 col desktop
12. Lab viewer: sticky TOC sidebar desktop, collapse sheet mobile
13. Command palette: full-screen mobile

### Accessibility

14. Keyboard: tab order, focus ring (shadcn default), Escape đóng dialog
15. ARIA: landmarks, live regions cho toast, quiz announcements
16. Color contrast ≥ 4.5:1 cả dark/light (shadcn default OK, verify)
17. Screen reader test (NVDA) 1 lab flow

### Performance

18. Code-split per route: `React.lazy` + Suspense
19. Lazy load Mermaid + Shiki (chỉ load khi lab có code/diagram)
20. Preload fonts (font-display: swap)
21. Image `<img loading="lazy">` nếu có
22. Bundle analyze: `rollup-plugin-visualizer`, target main chunk < 200KB gzip
23. Lighthouse: Perf ≥ 85, A11y ≥ 95, Best Practices ≥ 95

## Files đụng

- Nhiều component cross-cutting — refine, không tạo mới nhiều

## Success criteria

- Lighthouse 4 scores ≥ target
- `prefers-reduced-motion` respect (manual test)
- Dark mode screenshot compare: không component nào unreadable
- Mobile Safari 375px: không overflow ngang
- Main bundle < 200KB gzip
- Keyboard-only user hoàn thành: dashboard → search → lab → quiz

## Risks

- Framer Motion + reduced-motion: test kỹ, một số animation cần degrade graceful
- Shiki bundle to: nếu > 100KB thì chuyển `shiki/bundle/web` subset hoặc `prism-react-renderer`
