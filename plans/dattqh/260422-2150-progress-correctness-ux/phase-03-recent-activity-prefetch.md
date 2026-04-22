---
phase: 3
name: Sprint 3 — Recent activity + prefetch
status: not-started
priority: P1
effort: 2-3 ngày
---

# Phase 03 — Recent activity + prefetch

Đây là "việc tiếp theo" cho user, không cần recommendation engine. Kết hợp BE index + FE route loader prefetch để giảm spinner.

## Context Links

- [plan.md](./plan.md) · [phase-02](./phase-02-ux-feedback.md)
- Files: `server/db/models/progress-model.js`, `app/src/components/dashboard/recent-activity-section.tsx` (new), `app/src/components/dashboard/dashboard-layout.tsx` (mount point), `app/src/App.tsx` (router loaders), `app/src/routes/lab-viewer.tsx` (loader), `app/src/routes/index.tsx` (loader)
- **Stack đã verified:** react-router-dom ^7.2.0, `createBrowserRouter` đã dùng → thêm `loader` per route là clean
- **DueSection đã tồn tại** (`components/dashboard/due-section.tsx` — SM2 due cards). RecentActivitySection khác cấp độ: "lab mở gần nhất nhưng chưa completed". Đặt RecentActivity **phía trên** DueSection trong dashboard layout.

## Tasks

### B4 — Index cho query "recent activity"

- **File:** `server/db/models/progress-model.js`
- **Hiện tại:** `progressSchema.index({ userUuid: 1, labSlug: 1 })`, `{ userId: 1, labSlug: 1 }` — không có index cho `lastUpdated`
- **Change:** thêm compound index để cover query `Progress.find({userId}).sort({lastUpdated: -1}).limit(5)`
  ```js
  progressSchema.index({ userId: 1, lastUpdated: -1 });
  progressSchema.index({ userUuid: 1, lastUpdated: -1 });
  ```
- **Migration:** Mongo auto-build; chạy `npm run sync-labs` hoặc server restart để mongoose `syncIndexes` pick up. Nếu không, chạy script `node -e "require('./server/db/models').Progress.syncIndexes()"`
- **Verify:** `db.progresses.getIndexes()` trong mongo shell
- **Acceptance:** `explain()` trên query recent-activity dùng `IXSCAN`, không `COLLSCAN`

### F7 — RecentActivitySection dashboard

- **Route:** `/` → `routes/index.tsx` → `<DashboardLayout />` (`components/dashboard/dashboard-layout.tsx`)
- **New component:** `app/src/components/dashboard/recent-activity-section.tsx`
- **Data:** dùng `useProgress()` sẵn có (không cần endpoint mới) — slice 5 entry đầu (đã sort desc bởi BE)
  - Nếu payload lớn (>100 entry), add `/api/progress/recent?limit=5` endpoint sau — không phải phase này
- **UI:**
  - Heading "Tiếp tục học" / "Việc tiếp theo"
  - 5 card/row: lab title, stepper nhỏ, `last_updated` relative ("2 giờ trước"), deeplink
  - **Deeplink:** `#section-quiz` nếu có quiz nhưng chưa complete; `#section-flashcards` nếu quiz done; `#section-think` nếu chưa mở
  - Empty state: "Chưa có lab nào — khám phá bên dưới"
- **Helper:** `deriveResumeAnchor(entry)` → trả section anchor:
  - `!quiz_score` → `#section-quiz`
  - `quiz_score && !completed_at` → `#section-flashcards`
  - `completed_at` → `#section-commands`
  - `!opened_at` → `#section-think`
- **Acceptance:**
  - User có 3 lab in-progress → hiện 3 card, click card #1 → mở đúng lab + scroll đúng section
  - User mới → empty state

### F10 — Prefetch /api/progress trong route loader

- **Verified:** `App.tsx` đã dùng `createBrowserRouter` (react-router-dom ^7.2.0). Chỉ cần thêm `loader` per route — KHÔNG cần refactor.
- **Challenge:** `queryClient` hiện khởi tạo trong `main.tsx` và chỉ expose qua Provider. Loader chạy ngoài React tree → 2 option:
  1. Export `queryClient` thành singleton (`app/src/lib/query-client.ts`) và import cả ở `main.tsx` lẫn `App.tsx`
  2. Loader trả plain fetch, để component vẫn dùng React Query (nhưng mất dedupe)
- **Chọn option 1** (sạch, dùng cho cả loader và Provider):
  ```ts
  // app/src/lib/query-client.ts
  export const queryClient = new QueryClient({ defaultOptions: {...} })
  ```
  Loader: `loader: () => queryClient.ensureQueryData({ queryKey: PROGRESS_QUERY_KEY, queryFn: getProgress })`
- **Scope phase này:** chỉ prefetch cho lab `/lab/:slug` và dashboard `/`, không đụng route khác
- **Acceptance:**
  - Chrome Network: click link lab → request `/api/progress` khởi phát đồng thời với chunk JS, không chờ `useQuery` mount
  - Stepper không flash skeleton 300ms đầu tiên

## Implementation order

1. B4 (10 min) — thêm index, restart server, verify
2. F7 (3-4h) — component + deriveResumeAnchor + wire dashboard
3. F10 (2-3h) — router refactor + loader

## Todo

- [ ] Thêm 2 compound index ở `progress-model.js`
- [ ] Restart server, verify `db.progresses.getIndexes()` có index mới
- [ ] Smoke perf: query recent activity < 10ms với 1000 doc
- [ ] Create `deriveResumeAnchor()` util + unit test inline
- [ ] Create `components/dashboard/recent-activity-section.tsx`
- [ ] Mount trong `dashboard-layout.tsx` trước `<DueSection>` (heading: "Tiếp tục học")
- [ ] Export `queryClient` singleton tại `app/src/lib/query-client.ts`, refactor `main.tsx` import từ đó
- [ ] Add `loader` cho route `/` và `/lab/:slug` trong `App.tsx` dùng `queryClient.ensureQueryData(PROGRESS_QUERY_KEY)`
- [ ] Verify prefetch qua Network tab (request start cùng với chunk JS)

## Design notes (anti-slop)

- Recent activity KHÔNG dùng "3-column card grid" — dùng list dọc với divider 1px, ngày phía phải monospace. Density dial=4.
- Icon resume: Phosphor `ArrowClockwise` hoặc Heroicons thay Lucide default
- Relative time: `vi-VN` Intl.RelativeTimeFormat

## Risk

- Router đã là data router v7 → F10 low-risk, không cần defer
- Export queryClient singleton đòi đổi `main.tsx` — 1 file, 3 dòng, trivial
- DueSection chồng lấn về "việc tiếp theo" (SM2 spaced rep). Khi thêm RecentActivitySection, cân nhắc gộp/tách rõ ràng bằng heading khác nhau ("Tiếp tục học" vs "Ôn tập hôm nay")

## Success criteria

- Query recent activity dùng index (verified với `explain()`)
- Dashboard có section "Tiếp tục học" với deeplink chính xác
- Vào lab không thấy spinner progress (prefetch warm cache)

## Next

Phase 04 — Hardening (rate-limit, migrate tx, tests, docs).
