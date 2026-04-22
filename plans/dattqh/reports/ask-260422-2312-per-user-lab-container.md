# Tư vấn: 1 user × 1 lab = 1 terminal riêng (persist)

**Ngày:** 2026-04-22 23:12 | **Loại:** Architecture consultation | **Branch:** master

## Yêu cầu gốc

User muốn bỏ giới hạn container Docker cho tài khoản đã login. Mỗi lab có 1 terminal riêng theo từng user, persist qua nhiều phiên truy cập.

## Hiện trạng (code đã scan)

- `server/terminal/session-manager.js:14` — global cap `TERMINAL_MAX_CONCURRENT=5`, FIFO queue cho user thứ 6+
- `server/lib/docker-manager.js:15-27` — mỗi container 256MB RAM, 0.5 CPU, 50 PIDs, tmpfs 64MB, `AutoRemove=true`, `NetworkMode=none`
- Key hiện tại: `sessionId` random 8-char — KHÔNG bind `(userId, labSlug)` → user mở lab lần 2 tab khác = container mới
- Persist: tmux trong container, nhưng `AutoRemove=true` + idle timeout 30' → mất hoàn toàn khi idle
- Topology labs: `lab-orchestrator` spin nhiều container/lab qua compose

## Phân tích môi trường VPS

**Thực tế:**
- CPU: 4 cores (Intel Broadwell, no TSX, IBRS)
- RAM: 7.5 GB (không phải 8)
- Disk: 59.9 GB total, **51.7 GB đã dùng (86%)**, chỉ còn **~8.2 GB free**
- OS: CentOS Stream 9

**Budget RAM 7.5GB:**

| Thành phần | RAM |
|---|---|
| OS + kernel + buffer | 1.0 GB |
| Mongo + Meili + Hono + Nginx | 2.5 GB |
| Reserve chống OOM | 1.0 GB |
| Free cho containers | **3.0 GB** |

→ 256MB/container × cap = 12, an toàn **10 active**.

**Budget Disk 8.2GB free (bottleneck thực sự):**

| Thành phần | Disk |
|---|---|
| Mongo data tăng 1 tháng | 1 GB |
| Docker/pm2 logs | 1 GB |
| Reserve | 2 GB |
| Free cho containers | **~4 GB** |

→ Container cap 200-300MB/container. 20 slot × 200MB = 4GB vừa khít.

## Quyết định của user (qua Q&A)

1. **VPS hiện tại**: 4 CPU / 8GB RAM / 60GB disk (thực 7.5GB + 8.2GB free)
2. **Persist data**: tối đa 1 ngày, giới hạn volume — lab mục đích test lệnh
3. **Login migration guest→authed**: KHÔNG cần — destroy guest, tạo mới cho authed
4. **Abuse/rate-limit**: chấp nhận rủi ro free Gmail, không cần captcha/rate-limit
5. **Topology labs**: để chuyên gia tự quyết

## Khuyến nghị cuối (brutal, sau khi thấy disk 86%)

### "Không giới hạn" là ảo tưởng với VPS hiện tại

Thực tế làm được:
- **Tối đa 10 user chạy đồng thời** (RAM cứng, vật lý)
- **Mỗi user lưu tối đa 5 lab "ngủ" trong 12h** (ép xuống từ 24h user yêu cầu do disk)
- **Topology lab giữ cơ chế cũ** — không đưa vào cơ chế per-user
- **BẮT BUỘC dọn disk xuống <50%** trước khi release

Nâng lên 24h TTL như yêu cầu gốc → phải nâng disk VPS lên 120GB hoặc giảm hibernate cap xuống 3.

### Model kiến trúc

Key container theo `(userId, labSlug)` — deterministic, không phải random sessionId.

```
States: none → active → hibernated (stopped) → destroyed
                 ↑          ↓ idle 10min
                 └──────────┘ reconnect → docker start

Global cap ACTIVE:    10
Per-user ACTIVE:      3
Per-user HIBERNATED:  5
Guest ACTIVE:         1 (không hibernate, không key theo user)
```

**Hibernation** = `docker stop` (không `rm`). Overlay FS giữ, RAM giải phóng. Reconnect = `docker start` + reattach tmux.

### Config cụ thể

```
ACTIVE_GLOBAL_CAP        = 10
ACTIVE_PER_USER_CAP      = 3
HIBERNATE_PER_USER_CAP   = 5
IDLE_HIBERNATE_MS        = 10 * 60 * 1000         # 10 phút
HIBERNATE_TTL_MS         = 12 * 60 * 60 * 1000    # 12h (ép xuống từ 24h)
STORAGE_OPT_SIZE         = '300m'                 # test 200m vs 500m
BLKIO_WRITE_BPS          = 5 * 1024 * 1024        # 5 MB/s
```

### Thay đổi file

| File | Thay đổi |
|---|---|
| `docker-manager.js:25` | `AutoRemove: true` → `false` |
| `docker-manager.js:33` | Container name `terminal-${sessionId}` → `lab-${userHash}-${labSlug}` |
| `docker-manager.js:16-27` | Thêm `StorageOpt.size`, `BlkioDeviceWriteBps` |
| `session-manager.js:14` | Tách `ACTIVE_GLOBAL_CAP`, `ACTIVE_PER_USER_CAP`, `HIBERNATE_PER_USER_CAP` |
| `session-manager.js:43` | `requestSession`: lookup `(userId, labSlug)` — nếu hibernated → `docker start` thay vì create |
| `session-manager.js:152` | `cleanupIdle`: idle → hibernate, không terminate |
| `terminal-session-model.js` | Unique index `(userId, labSlug)`, field `status: active\|hibernated\|destroyed`, `hibernatedAt` |
| Cron mới | 5 phút: idle→hibernate. 1h: hibernated >12h→destroy |

### Phân phase

**Phase 0 — Dọn VPS (BẮT BUỘC TRƯỚC KHI CODE):**
```bash
sudo du -sh /var/lib/docker /var/log /home /root/* 2>/dev/null | sort -h
docker system df -v
docker image prune -a
docker builder prune -a
sudo journalctl --vacuum-time=7d
find /var/log -name "*.gz" -mtime +14 -delete
pm2 flush
```
Target: free xuống ≥15-20GB. Không đạt → DỪNG feature.

**Phase 0.5 — Storage driver check:**
```bash
docker info | grep -i 'storage driver\|backing filesystem'
df -T /var/lib/docker
```
- `overlay2 + xfs + pquota` → `StorageOpt.size` hoạt động
- `overlay2 + ext4` (CentOS Stream 9 default) → KHÔNG hoạt động, fallback: `BlkioDeviceWriteBps` + monitor + alert

**Phase 0.75 — Monitoring:**
- Cron 5 phút: alert nếu `/var/lib/docker > 30GB` hoặc `/ > 90%`
- Tự động terminate container idle nhất khi chạm ngưỡng

**Phase 1 — Refactor keying:**
1. Đổi tên container sang deterministic `lab-{userHash}-{labSlug}`
2. `AutoRemove: false`
3. Thêm status `hibernated` vào model, unique index
4. Lookup `findByUserLab` trước khi `createContainer`
5. Giữ MAX=5 phase này, chỉ đổi keying

**Phase 2 — Hibernation:**
1. Idle 10 phút → `docker stop`
2. Reconnect: `status=hibernated` → `docker start` + reattach tmux
3. Cron thu hồi hibernated >12h

**Phase 3 — Nâng cap:**
1. `ACTIVE_GLOBAL_CAP` 5→10
2. Thêm per-user cap
3. Load test 15 user concurrent trước production

## Rủi ro và mitigation

| Rủi ro | Mitigation |
|---|---|
| OOM khi spike | Reserve 1GB RAM, cap cứng 10 containers |
| Disk đầy | StorageOpt 300MB + cron monitoring + alert auto-terminate |
| Abuse free Gmail | Chấp nhận (user quyết), backstop = per-user cap 3 active |
| Tmux state loss khi `docker stop` | tmux lưu trong memory container — stop sẽ mất session tmux. Phải test: dùng `tmux-resurrect` plugin hoặc chấp nhận user mất tmux windows (file vẫn còn) |
| `docker start` reattach fail | Fallback: destroy + create lại, user mất data → acceptable với TTL 12h |

## Câu hỏi chưa chốt

1. Đồng ý Phase 0 dọn disk trước không? Chưa dọn → feature fail khi launch.
2. TTL 12h (do disk ép) hay giữ 24h + giảm hibernate cap xuống 3?
3. Topology lab giữ cơ chế cũ (khuyến nghị) hay ép vào cơ chế mới?
4. Có quyền SSH vào VPS để chạy cleanup + `docker info` không?
5. **Tmux persist qua `docker stop`**: test trước có work không? Nếu không work, có chấp nhận mất tmux session (chỉ giữ file /home/labuser) không?
6. Nâng disk VPS lên 120GB có khả thi budget không? Nếu có → mở được TTL 24h + hibernate cap 10 như kỳ vọng ban đầu.
