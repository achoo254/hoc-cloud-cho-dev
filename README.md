# hoc-cloud-cho-dev

> 🎓 **Học tại đây: [https://hoc-cloud.inetdev.io.vn/](https://hoc-cloud.inetdev.io.vn/)**
>
> Workspace tự học Cloud/DevOps với **interactive animated protocol visualizations** — playground từng bước, animated diagrams, quiz + flashcards (SM-2 spaced repetition), tiến độ học cá nhân và leaderboard.

## 🚀 Bắt đầu học ngay

👉 **Truy cập [hoc-cloud.inetdev.io.vn](https://hoc-cloud.inetdev.io.vn/)** để học 8 chủ đề mạng cơ bản với playground tương tác. Đăng nhập Google để lưu tiến độ, theo dõi heatmap và leaderboard.

## Labs (8 chủ đề)

| Slug | Chủ đề | Playground nổi bật |
|------|--------|--------------------|
| `arp` | Address Resolution Protocol | ARP request/reply animation |
| `dhcp` | DHCP DORA Process | 4-bước DORA visualizer |
| `dns` | DNS Hierarchical Resolution | Recursive resolver animation |
| `http` | HTTP Protocol | 51 animated scenarios |
| `icmp-ping` | ICMP Ping Request/Reply | RTT + TTL visualizer |
| `subnet-cidr` | Subnet & CIDR | Binary mask + host calculator |
| `tcp-ip-packet-journey` | Packet Journey qua OSI layers | Layer encapsulation step-by-step |
| `tcp-udp` | TCP vs UDP | 3-way handshake + connection comparison |

## Tech Stack

- **Frontend**: Vite 6, React 18, TypeScript, Tailwind CSS 3.4, shadcn/ui (Radix)
- **Animation**: Framer Motion 11, D3.js 7 (math only)
- **Backend**: Hono.js 4.6, Node.js 22+
- **Auth**: Firebase Auth (Google provider) + firebase-admin session cookies
- **Database**: MongoDB (Mongoose) + Meilisearch (full-text search)
- **Deploy**: PM2 + Nginx trên VPS (GitHub Actions auto-deploy)

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| `app/` | Vite+React SPA — components, playgrounds, diagrams, dashboard |
| `server/` | Hono.js: `/api/labs`, `/api/search`, `/api/progress`, `/api/leaderboard`, `/auth/*` |
| `server/auth/` | Firebase Admin, session middleware |
| `fixtures/labs/` | Lab JSON (schema v3) — source of truth (sync vào MongoDB) |
| `scripts/` | Build scripts (validate schema, sync labs, bundler) |
| `docs/` | Tài liệu dự án |
| `deploy/` | `nginx.conf.example` tham chiếu |

## Development

```bash
pnpm install              # root deps (Hono, Mongoose, Meilisearch, firebase-admin)
pnpm --dir app install    # app deps (React, Vite, firebase client)
```

```bash
# Terminal 1 — Hono API (port 8387)
pnpm run dev:server

# Terminal 2 — Vite dev server (port 5173, proxy /api → :8387)
pnpm run dev:app
```

Mở `http://localhost:5173`.

### Env vars

Client cần `VITE_FIREBASE_CONFIG` (JSON config từ Firebase Console). Server cần `MONGODB_URI`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` + credentials của Firebase Admin (service account JSON) — xem `docs/deployment-guide.md`.

## Build & Deploy

```bash
pnpm --dir app run build   # FE → app/dist/
pnpm run build:server      # BE → dist-server/server.bundle.js (esbuild, pure-JS bundle)
```

GitHub Actions (`.github/workflows/deploy.yml`) tự chạy khi push `master`:

1. Build FE (Vite) + BE (esbuild bundle, no native deps)
2. Smoke test `/healthz`
3. Stage `app/dist/` + `server.bundle.js`
4. SCP lên VPS, extract, `pm2 restart` (với `NODE_ENV=production`)

VPS không cần `package.json`, không `npm ci`. Nginx config: `deploy/nginx.conf.example`.

## Thêm lab mới

1. Tạo fixture JSON trong `fixtures/labs/` (schema v3 — xem `docs/lab-schema-v3.md`)
2. Validate: `node scripts/validate-lab-fixtures.js`
3. Sync vào MongoDB + Meilisearch: `pnpm run sync-labs`
4. Thêm playground component vào `app/src/components/lab/diagrams/` nếu cần

Xem `docs/content-guidelines.md` (tone, ngôi xưng, cite nguồn).

## API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/labs` | Lab index (MongoDB) |
| GET | `/api/labs/:slug` | Nội dung một lab (MongoDB) |
| GET | `/api/search?q=<q>` | Meilisearch full-text search với highlight |
| GET | `/api/progress` | Trả `{ uuid, progress: [...] }` theo session cookie |
| POST | `/api/progress` | Upsert `{ lab_slug, opened_at?, completed_at?, quiz_score? }` |
| GET | `/api/leaderboard` | Top users theo completion + streak |
| POST | `/auth/session` | Đổi Firebase ID token → HttpOnly session cookie |
| POST | `/auth/logout` | Xoá session cookie |
| GET | `/sse/reload` | Server-Sent Events (dev live-reload) |

## Cheat-sheet

```bash
# Sync fixtures → MongoDB + Meilisearch
pnpm run sync-labs

# Reset progress (browser)
DevTools → Application → Cookies → xoá session; Local Storage → xoá key lab:*
```

---

🌐 **Production**: [https://hoc-cloud.inetdev.io.vn/](https://hoc-cloud.inetdev.io.vn/)
