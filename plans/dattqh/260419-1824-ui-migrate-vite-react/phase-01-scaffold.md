# Phase 01 — Scaffold

**Status:** completed (2026-04-19) · **Effort:** 0.5d · **Priority:** P1

## Completion notes

- `app/` scaffold đầy đủ (Vite+React18+TS strict+Tailwind3.4+shadcn), `npm run build` pass, `tsc --noEmit` 0 errors
- 9 shadcn components: button, card, badge, skeleton, input, separator, tabs, dialog, sheet (cmdk/sonner installed, components wire ở phase 02)
- Dark mode toggle + localStorage persist OK; React Query + Router + Devtools OK
- Proxy `/api`, `/healthz`, `/sse` → :3000 (verify `/api/reload` vs `/sse` endpoint name khi test live ở phase 02)
- Root scripts: `dev:app`, `dev:server`, `build:app`

## Goal

Khởi tạo `app/` với Vite + React 18 + TS + Tailwind + shadcn/ui + routing + API proxy → Hono.

## Steps

1. `npm create vite@latest app -- --template react-ts`
2. Cài deps: `tailwindcss postcss autoprefixer clsx tailwind-merge class-variance-authority lucide-react react-router-dom @tanstack/react-query zod framer-motion`
3. Init Tailwind + shadcn/ui (`npx shadcn@latest init`) — theme base (neutral), CSS variables, dark mode `class`
4. Cấu hình `vite.config.ts`: proxy `/api/*` + `/healthz` + SSE → `http://localhost:3000` (Hono)
5. Setup React Router: routes `/`, `/lab/:slug`, `/search`, `*` (404)
6. Setup React Query: `QueryClientProvider` ở `main.tsx`, devtools
7. Folder structure:
   ```
   app/src/
   ├── main.tsx
   ├── App.tsx
   ├── routes/{index,lab-viewer,search,not-found}.tsx
   ├── components/{ui,layout}/
   ├── lib/{api.ts,utils.ts}
   └── styles/globals.css
   ```
8. Layout shell: header (logo, search trigger, theme toggle), main, footer
9. Install shadcn primitives dùng trong các phase sau: `button card dialog command input badge tabs sheet skeleton sonner`
10. `package.json` root: add workspaces hoặc script `dev:app` → `cd app && vite`, `dev:server` giữ nguyên
11. Smoke test: `npm run dev:app` + `npm run dev:server` → fetch `/api/progress` từ React app OK

## Files tạo mới

- `app/` (toàn bộ)
- Root `package.json` thêm scripts

## Files không đụng

- `server/`, `labs/`, `data/`, `deploy/`

## Success criteria

- `npm run dev:app` chạy port 5173, hot reload OK
- Request `/api/*` proxy đúng sang Hono port 3000
- shadcn Button + Card render được
- Dark mode toggle hoạt động (persist localStorage)
- TypeScript strict mode, no errors

## Risks

- shadcn init conflict với Tailwind v4: pin Tailwind v3.4 cho stable
- Hono SSE proxy qua Vite: dùng `ws: false, changeOrigin: true` + test `/api/reload`
