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
- Files: `server/api/progress-routes.js`, `server/db/models/progress-model.js`, `app/src/components/home/recent-activity-section.tsx` (new), `app/src/routes/*` hoặc `App.tsx` router config, `app/src/lib/api.ts`

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

- **Route:** home `/` (dashboard). Check `app/src/App.tsx` / routes để biết component chính hiện tại.
- **New component:** `app/src/components/home/recent-activity-section.tsx`
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

- **Stack:** project dùng React Router? Check `App.tsx` / `main.tsx`
- **Strategy:**
  - Nếu dùng React Router v6.4+ data router: `loader: () => queryClient.ensureQueryData({ queryKey: PROGRESS_QUERY_KEY, queryFn: getProgress })`
  - Nếu chưa có data router: wrap mỗi lab route component với `<Await>` hoặc prefetch trong top-level layout `useEffect` (less ideal)
  - **Recommended:** chuyển lab route sang `createBrowserRouter` pattern nếu chưa
- **Scope phase này:** chỉ prefetch cho route lab (`/lab/:slug`) và dashboard (`/`), không đụng route khác
- **Acceptance:**
  - Chrome Network: vào `/lab/vpc-basics` → request `/api/progress` start ngay khi click link, không chờ component mount
  - Stepper không flash skeleton 300ms đầu

## Implementation order

1. B4 (10 min) — thêm index, restart server, verify
2. F7 (3-4h) — component + deriveResumeAnchor + wire dashboard
3. F10 (2-3h) — router refactor + loader

## Todo

- [ ] Thêm 2 compound index ở `progress-model.js`
- [ ] Restart server, verify `db.progresses.getIndexes()` có index mới
- [ ] Smoke perf: query recent activity < 10ms với 1000 doc
- [ ] Create `deriveResumeAnchor()` util + unit test inline
- [ ] Create `recent-activity-section.tsx`
- [ ] Mount trong home dashboard component
- [ ] Kiểm tra routing stack hiện tại; document trong plan update nếu cần refactor lớn
- [ ] Setup data router loader cho lab + dashboard (nếu đã dùng v6.4+)
- [ ] Verify prefetch qua Network tab

## Design notes (anti-slop)

- Recent activity KHÔNG dùng "3-column card grid" — dùng list dọc với divider 1px, ngày phía phải monospace. Density dial=4.
- Icon resume: Phosphor `ArrowClockwise` hoặc Heroicons thay Lucide default
- Relative time: `vi-VN` Intl.RelativeTimeFormat

## Risk

- Router refactor có thể chạm nhiều file (sidebar links, back button) — giữ URL schema không đổi để giảm blast radius
- Nếu router hiện không phải data router → F10 defer sang phase riêng, commit B4+F7 trước

## Success criteria

- Query recent activity dùng index (verified với `explain()`)
- Dashboard có section "Tiếp tục học" với deeplink chính xác
- Vào lab không thấy spinner progress (prefetch warm cache)

## Next

Phase 04 — Hardening (rate-limit, migrate tx, tests, docs).
