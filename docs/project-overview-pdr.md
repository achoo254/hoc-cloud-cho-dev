# Project Overview — Product Development Requirements

Production: **https://hoc-cloud.inetdev.io.vn/**

## 1. Product Vision

Workspace tự học Cloud/DevOps tập trung vào **học qua tương tác** thay vì đọc lý thuyết. Mỗi giao thức mạng được trình bày qua playground bước-từng-bước, animated diagrams, quiz + flashcards SM-2, kèm progress tracking cá nhân và leaderboard cộng đồng.

## 2. Problem Statement

Tài liệu Cloud/DevOps hiện có thường rơi vào 2 cực:

- **Hàn lâm**: RFC, sách giáo khoa, đọc chán, khó hình dung data flow
- **Bề mặt**: blog post sơ sài, không cite nguồn, không verify được

Người học cần nội dung **fact-first, có nguồn, có tương tác** để xây mental model đúng ngay từ đầu.

## 3. Target Audience

- Dev đang chuyển sang role DevOps/SRE/Cloud Engineer
- Sinh viên ngành mạng/hệ thống muốn hình dung giao thức
- Self-learner cần curriculum có cấu trúc + spaced repetition

Non-target: người tìm cert prep (AWS/Azure/GCP), enterprise training.

## 4. Core Requirements

### 4.1 Functional

| Req | Description | Status |
|-----|-------------|--------|
| FR-1 | 8+ labs mạng cơ bản với playground tương tác | ✅ 8 labs live |
| FR-2 | THINK/SEE/SHIP structure per lab (TL;DR → walkthrough → quiz) | ✅ |
| FR-3 | Desktop shows playground, mobile falls back to text | ✅ CSS-only switch |
| FR-4 | Full-text search across labs với highlight | ✅ SQLite FTS5 + bm25 |
| FR-5 | Progress tracking (opened, completed, quiz score) | ✅ Per anon UUID + authed user |
| FR-6 | Activity heatmap (GitHub-style) | ✅ |
| FR-7 | Spaced repetition queue (SM-2 algorithm) | ✅ Flashcards |
| FR-8 | Google sign-in → persistent progress + leaderboard | ✅ Firebase Auth |
| FR-9 | SVG export của diagram (sanitized) | ✅ DOMPurify |
| FR-10 | Self-hosted web terminal cho try-at-home commands | 📋 Planned |

### 4.2 Non-functional

| Req | Target | Rationale |
|-----|--------|-----------|
| NFR-1 | Initial JS bundle < 200 KB gzip | Mobile first-paint |
| NFR-2 | Route chunks lazy-loaded | Dashboard ≠ lab viewer |
| NFR-3 | TypeScript strict mode, no `any` | Schema correctness |
| NFR-4 | Lab content Zod-validated tại build time | Fail fast CI |
| NFR-5 | A11y: keyboard nav, prefers-reduced-motion | Playground animations respect PRM |
| NFR-6 | SVG export stripped `script`, `foreignObject`, inline events | Prevent XSS in shared files |
| NFR-7 | Session cookie: HttpOnly + Secure + SameSite=Lax + signed | Mitigate XSS/CSRF |
| NFR-8 | Deploy via single `pm2 restart`, no `npm ci` trên VPS | Minimal VPS footprint |

## 5. Content Requirements

Xem `docs/content-guidelines.md` (canonical):

- **Ngôi xưng**: cấm "bạn/tôi/chúng ta" — dùng imperative, passive, hoặc danh từ trung tính
- **Cụm từ cấm**: "production-ready", "ai cũng dùng"... (không verify được)
- **Cite nguồn** cho 4 loại claim: số liệu cụ thể, protocol spec, so sánh/benchmark, best practice bảo mật
- **Ưu tiên nguồn gốc**: RFC > vendor docs > man page > blog

## 6. Tech Requirements

### Frontend
- Vite 6 + React 18 + TypeScript strict
- Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- Framer Motion cho animation, D3 **chỉ** cho math (no DOM touch)
- React Router v7 lazy-loaded routes
- React Query cho data fetching

### Backend
- Hono.js 4.6 trên Node 22+
- better-sqlite3 (sync driver, FTS5 virtual tables)
- firebase-admin verify Firebase ID token → HttpOnly session cookie
- esbuild bundle → single `server.bundle.js` (no `node_modules` trên VPS ngoài `better-sqlite3`)

### Infra
- VPS + Nginx + PM2 (cluster mode)
- GitHub Actions CI/CD (push `master` → deploy)
- Firebase Auth làm external IdP (không tự host)

## 7. Success Metrics

- **Engagement**: completion rate per lab, avg quiz score, return rate sau 7 ngày
- **Content quality**: 0 claim unsourced trong lab content (enforce qua review)
- **Performance**: Lighthouse Perf ≥ 90 desktop, ≥ 75 mobile
- **Deploy reliability**: CI smoke test `/healthz` pass rate 100%

## 8. Out of Scope

- ❌ Server-side rendering (SPA là đủ — SEO không ưu tiên)
- ❌ Mobile app native (responsive web đủ dùng)
- ❌ User-generated content (maintainer curate)
- ❌ Multi-tenant / org management
- ❌ Paid plans / subscription
- ❌ Video content (animation + text đủ)

## 9. Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Playground bug break full lab | `PlaygroundErrorBoundary` + `?textMode=1` escape hatch |
| Firebase outage → auth down | Guest mode vẫn dùng được (anon UUID cookie); progress preserve |
| SQLite single-point-of-failure | Daily backup + readonly migration dry-run trong CI |
| SVG export XSS | DOMPurify `svg` + `svgFilters` profile mandatory |
| `better-sqlite3` ABI mismatch khi deploy | Native module build trong CI cùng Node version với VPS |
| Content drift (fixture vs generated) | `npm run gen:content` + `sync-labs` chạy tự động; CI validate Zod |

## 10. Open Questions

- Web terminal dùng WebContainer (StackBlitz) hay Docker sandbox tự host?
- SQLite có đủ scale khi user base > 10k? Có nên migrate LibSQL/Turso multi-region?
- Rate-limit API (`/api/progress`, `/auth/session`) cần chưa?
- Nên bundle search index client-side hay chỉ server API? (Hiện cả 2 — tradeoff size vs offline)
