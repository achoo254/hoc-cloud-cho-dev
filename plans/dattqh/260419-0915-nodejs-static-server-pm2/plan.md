---
title: Node.js static server + PM2 + CI/CD bundle deploy
date: 2026-04-19
status: ready-to-implement
owner: dattqh
---

# Plan: Node.js static server — build artifact deploy

## Context

- Python server hiện tại chỉ là `python -m http.server 8000` serve static `labs/` (xem `labs/index.html:39`). Không có Python logic.
- User có VPS + PM2 + domain. **Source chỉ ở GitHub**, VPS chỉ chạy bundle đã build trong CI/CD.
- Workflow: push GitHub → CI build bundle → scp lên VPS → extract → `pm2 reload`.

## Decisions (confirmed)

| Key | Value |
|---|---|
| PM2 app name | `hoc-cloud-labs` |
| Domain | `hoc-cloud.inetdev.io.vn` |
| VPS path | `/var/www/hoc-cloud-cho-dev` |
| Internal port | `8387` |
| Deploy mode | **Build artifact only** (no git/source on VPS) |
| Deploy branch | `master` (default) |

## Kiến trúc deploy

```
[Dev push master]
    ↓
[GitHub Actions ubuntu-latest]
    ├─ npm ci
    ├─ tạo bundle: server.js + labs/ + node_modules + package.json + ecosystem.config.cjs
    ├─ tar.gz
    ↓
[scp → VPS:/var/www/hoc-cloud-cho-dev/releases/<timestamp>/]
    ├─ extract
    ├─ symlink atomic: current → releases/<timestamp>
    ├─ pm2 reload hoc-cloud-labs
    └─ giữ 3 releases gần nhất, xoá cũ
    ↓
[Nginx :443 → localhost:8387]
```

**Ưu điểm vs git-pull:**
- VPS không cần git, không cần Node npm install (node_modules đã đóng gói sẵn)
- Atomic deploy qua symlink swap → zero-downtime với `pm2 reload`
- Rollback dễ: đổi symlink về release cũ

## Cấu trúc repo sau migration

```
hoc-cloud-cho-dev/
├── server/
│   ├── server.js                # Hono app
│   └── ecosystem.config.cjs     # PM2 config
├── labs/                        # (giữ nguyên, serve từ đây)
├── package.json
├── package-lock.json
├── .github/workflows/deploy.yml
└── deploy/
    ├── nginx.conf.example
    ├── remote-deploy.sh         # Script chạy TRÊN VPS sau khi scp
    └── vps-initial-setup.md     # Hướng dẫn setup VPS lần đầu
```

## Cấu trúc trên VPS

```
/var/www/hoc-cloud-cho-dev/
├── current -> releases/260419-092500/    # symlink
├── releases/
│   ├── 260419-092500/                    # bundle extracted
│   │   ├── server/server.js
│   │   ├── labs/
│   │   ├── node_modules/
│   │   ├── package.json
│   │   └── ecosystem.config.cjs
│   └── 260419-083000/                    # release cũ (giữ 3 cái)
└── shared/                                # (future: logs, .env nếu cần)
```

PM2 start từ `/var/www/hoc-cloud-cho-dev/current/ecosystem.config.cjs` — symlink swap tự động point tới release mới.

## Phases

### Phase 1 — Node.js server + PM2 config (local) — 1h
**Files tạo mới:**
- `package.json` — deps: `hono`, `@hono/node-server` + `serve-static`
- `server/server.js` — serve `../labs` (relative từ `current/`), port từ env `PORT` (default 8387)
- `server/ecosystem.config.cjs` — name `hoc-cloud-labs`, script `./server/server.js`, `cwd: __dirname + '/..'`, env PORT 8387, instances 1, max_memory_restart 200M

**Verify local:**
```bash
npm ci
node server/server.js
# curl http://localhost:8387 → labs/index.html
```

### Phase 2 — Build & deploy script — 45m
**`deploy/remote-deploy.sh`** (chạy trên VPS, nhận 1 arg = tên release):
```bash
#!/bin/bash
set -euo pipefail
RELEASE=$1
BASE=/var/www/hoc-cloud-cho-dev
cd "$BASE/releases/$RELEASE"
ln -sfn "$BASE/releases/$RELEASE" "$BASE/current"
cd "$BASE/current"
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
pm2 save
# Cleanup: giữ 3 releases mới nhất
cd "$BASE/releases" && ls -1t | tail -n +4 | xargs -r rm -rf
```

### Phase 3 — GitHub Actions workflow — 45m
**`.github/workflows/deploy.yml`:**
- Trigger: `push` branch `master` + `workflow_dispatch`
- Steps:
  1. Checkout
  2. Setup Node 20
  3. `npm ci --omit=dev`
  4. Tạo bundle: `tar czf bundle.tar.gz server/ labs/ node_modules/ package.json ecosystem.config.cjs` (nếu `subnet-calculator.html` cần thì thêm)
  5. `appleboy/scp-action`: scp `bundle.tar.gz` → `$VPS:/var/www/hoc-cloud-cho-dev/releases/<timestamp>.tar.gz`
  6. `appleboy/ssh-action`: extract tarball vào `releases/<timestamp>/`, rồi `bash deploy/remote-deploy.sh <timestamp>`

**Secrets cần tạo trên GitHub:**
- `VPS_HOST` — IP hoặc hostname
- `VPS_USER` — SSH user (e.g. `deploy` hoặc `root`)
- `VPS_SSH_KEY` — private key (dedicated deploy key)
- `VPS_SSH_PORT` — thường 22

### Phase 4 — Setup VPS lần đầu — 45m
Tài liệu `deploy/vps-initial-setup.md` gồm:
1. Cài Node 20 LTS (nodesource) + PM2 global
2. Tạo user `deploy` (không dùng root cho deploy)
3. `mkdir -p /var/www/hoc-cloud-cho-dev/{releases,shared}` + chown
4. Add public key của GitHub Actions deploy key vào `~/.ssh/authorized_keys`
5. `pm2 startup` + `pm2 save` (lần đầu cần 1 release đã chạy)
6. Nginx config:
   ```nginx
   server {
     listen 80;
     server_name hoc-cloud.inetdev.io.vn;
     location / { proxy_pass http://127.0.0.1:8387; proxy_set_header Host $host; }
   }
   ```
7. `certbot --nginx -d hoc-cloud.inetdev.io.vn` → tự động HTTP→HTTPS redirect
8. Deploy lần đầu manual (hoặc trigger `workflow_dispatch`)

### Phase 5 — Cleanup & docs — 30m
- Sửa `labs/index.html:39`: bỏ hướng dẫn `python -m http.server`, thay bằng link `https://hoc-cloud.inetdev.io.vn` hoặc `npm start` cho dev
- Update root `README.md` (nếu có) hoặc tạo: mô tả local dev + deploy flow
- Update `docs/deployment-guide.md`
- Note trong `labs/04-python-sysadmin/requirements.txt` vẫn giữ — đó là lab Python riêng biệt, không liên quan server

## Success Criteria

- [ ] `https://hoc-cloud.inetdev.io.vn` → `labs/index.html` (HTTPS, valid cert)
- [ ] `pm2 list` trên VPS show `hoc-cloud-labs` online
- [ ] Reboot VPS → app tự start
- [ ] Push commit lên `master` → deploy xong <3 phút, không downtime
- [ ] VPS **không có** `.git` folder, **không có** source gốc, chỉ có bundle
- [ ] Rollback: `ln -sfn releases/<old> current && pm2 reload` hoạt động

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| node_modules build trên ubuntu-latest khác kiến trúc VPS | VPS hầu hết là Linux x64 — khớp. Nếu VPS ARM, đổi runner sang `ubuntu-24.04-arm` |
| SSH key leak | Dedicated deploy key, scope chỉ repo này, user `deploy` (không root) |
| Port 8387 đụng app khác | Confirmed user chọn port này; verify `ss -tlnp \| grep 8387` trước |
| Bundle quá to vì node_modules | Dùng `npm ci --omit=dev`. Hono rất nhẹ → bundle <5MB |
| Release tích luỹ đầy disk | Script cleanup giữ 3 releases mới nhất |

## VPS environment (confirmed)

- OS: **CentOS 9** (x64 giả định — cần user confirm nếu ARM)
- User SSH: dùng user sẵn có (sẽ hỏi cụ thể khi setup secrets)
- Nginx: **đã cài** → config đặt tại `/etc/nginx/conf.d/hoc-cloud.conf`
- Domain `hoc-cloud.inetdev.io.vn`: chưa có app khác → free để dùng

**CentOS 9 caveats cần chú ý:**
- **SELinux**: nginx proxy tới localhost cần `setsebool -P httpd_can_network_connect 1`
- **Firewalld**: mở port 80/443 bằng `firewall-cmd --permanent --add-service={http,https} && firewall-cmd --reload`
- **Node install**: dùng nodesource RPM (`curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -`)
- **Nginx config path**: `/etc/nginx/conf.d/*.conf` (không phải `sites-enabled`)
- **Certbot**: `dnf install certbot python3-certbot-nginx`

## Next Steps

Bắt đầu Phase 1 ngay: tạo `package.json`, `server/server.js`, `server/ecosystem.config.cjs`.
