# hoc-cloud-cho-dev

Workspace tự học Cloud/DevOps với **interactive animated protocol visualizations**. Mỗi lab có playground bước-từng-bước, animated diagrams và concept cards.

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
- **Animation**: Framer Motion 11, D3.js 7
- **Backend**: Hono.js 4.6, Node.js 22+
- **Database**: SQLite (better-sqlite3, FTS5 full-text search)
- **Diagrams**: Mermaid, custom SVG/D3 visualizations
- **Other**: React Query 5, React Router 7, Shiki, MiniSearch

## Cấu trúc

| Thư mục | Nội dung |
|---------|----------|
| `app/` | Vite+React SPA — components, playgrounds, diagrams |
| `server/` | Hono.js: `/api/search` (FTS5) + `/api/progress` + `/sse` |
| `fixtures/labs/` | Lab JSON (schema v3) — source of truth |
| `content/` | TypeScript modules (generated từ fixtures) |
| `scripts/` | Build scripts (fixtures → TS, bundler) |
| `docs/` | Tài liệu dự án |
| `data/` | `hoccloud.db` — SQLite (labs + FTS + progress) |
| `deploy/` | `nginx.conf.example` tham chiếu |

## Development

```bash
npm install              # root deps
npm install --prefix app # app deps
```

```bash
# Terminal 1 — Hono API (port 8387)
npm run dev:server

# Terminal 2 — Vite dev server (port 5173, proxy /api → :8387)
npm run dev:app
```

Mở http://localhost:5173

## Build & Deploy

```bash
# Build
npm run build --prefix app   # FE → app/dist/
npm run build:server         # BE → dist-server/server.bundle.js (esbuild)
```

GitHub Actions (`.github/workflows/deploy.yml`) tự chạy khi push `master`:
1. Build FE (Vite) + BE (esbuild bundle)
2. Smoke test `/healthz`
3. Stage `app/dist/` + `server.bundle.js` + `node_modules/better-sqlite3`
4. SCP lên VPS, extract, `pm2 restart`

VPS không cần `package.json`, không `npm ci`. Nginx config: `deploy/nginx.conf.example`.

## Thêm lab mới

1. Tạo fixture JSON trong `fixtures/labs/` (schema v3 — xem `docs/lab-schema-v3.md`)
2. Validate: `node scripts/validate-lab-fixtures.js`
3. Generate content modules: `npm run gen:content`
4. Sync vào DB: `node server/scripts/sync-labs-to-db.js`
5. Thêm playground component vào `app/src/components/lab/diagrams/` nếu cần

Xem `docs/content-guidelines.md` (tone, ngôi xưng, cite nguồn).

## API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/search?q=<q>` | FTS5 full-text search (bm25 rank + `<mark>` highlight) |
| GET | `/api/progress` | Trả `{ uuid, progress: [...] }` theo cookie |
| POST | `/api/progress` | Upsert `{ lab_slug, opened_at?, completed_at?, quiz_score? }` |
| GET | `/sse/reload` | Server-Sent Events (dev live-reload) |

## Cheat-sheet

```bash
# Sync fixtures → DB (tự chạy khi server boot)
node server/scripts/sync-labs-to-db.js

# Fresh DB (local dev)
rm data/hoccloud.db && npm run dev:server

# Reset progress (browser)
DevTools → Application → Local Storage → xoá key lab:*
```
