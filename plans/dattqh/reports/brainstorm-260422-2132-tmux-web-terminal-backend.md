---
type: brainstorm
title: "Tmux in VPS web-terminal containers — yes or no?"
date: 2026-04-22
related_plan: 260421-1453-self-hosted-web-terminal
---

## Problem

Plan self-hosted web terminal dự định `WS → docker exec bash`. WS rớt (laptop sleep, đổi mạng, refresh) → shell mới mỗi lần reconnect, mất `cd`, env vars, scrollback `tcpdump`. Lab 45–60 phút → UX tệ. Hỏi: có cần tmux/multiplexer trên VPS không?

## Ngữ cảnh được loại trừ

| Ngữ cảnh | Quyết định |
|---------|------------|
| SSH ops (admin) | Tùy thói quen, ngoài scope |
| Long-running processes | Đã có PM2, không cần tmux (DRY) |
| Lab dạy tmux | Hiện giáo án networking, không có — bỏ qua conflict prefix |
| **Backend web terminal** | **Đây là câu hỏi thật** |

## Options đã đánh giá

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A — No multiplexer | Simplest, ít layer | Reconnect = restart. Scrollback = 0 | Reject — UX tệ |
| **B — tmux in container** | Reconnect giữ state, scrollback 10k lines, `-A` flag create-or-attach, Katacoda/Cloud Shell dùng cách này | +0.5MB image, cần handle nested prefix nếu tương lai dạy tmux | **✅ CHOSEN** |
| C — dtach | 20KB, không conflict prefix | Không built-in scrollback, Alpine không có trong main repo | Reject — thiếu scrollback |

## Quyết định

**Option B + kick-old-client.**

- Base image: `apk add tmux` + ship `/etc/tmux.conf` (history-limit 10000, mouse on, remain-on-exit on).
- Container PID 1 = `sleep infinity`. KHÔNG để `bash` là ENTRYPOINT.
- Backend attach:
  1. `docker exec tmux new-session -A -d -s lab` (idempotent ensure)
  2. `docker exec -it tmux attach-session -d -t lab` (attach + kick stale client)
- 2 tab cùng user → tab mới kick tab cũ (`-d` flag). Hợp solo learner, tránh spawn nhiều bash.

## Implementation impact

Files đã update:
- `plan.md` — Key Decisions thêm row "Session persistence: tmux inside container"
- `phase-01-basic-terminal.md` — Dockerfile.lab-terminal thêm tmux + tmux.conf; docker-manager.js `attachContainer` dùng tmux new-session + attach-session
- `phase-02-lab-containers.md` — lab-arp/Dockerfile + lab-dhcp/Dockerfile.client thêm tmux; PID 1 đổi sang `sleep infinity`; note convention ở đầu
- (Dockerfile.server giữ nguyên — dnsmasq không có shell session)

## Risks mitigated

| Risk | Mitigation |
|------|-----------|
| User gõ `exit` kill session | `remain-on-exit on` + SessionManager mới là owner lifecycle |
| 2 tab đua nhau gõ | `attach -d` kick stale |
| Image size tăng | +0.5MB (Alpine tmux) — negligible |
| Tmux prefix conflict với lab dạy tmux | Chưa có lab như vậy; nếu có sau này unbind outer prefix |

## Success metric

Sau khi implement: rớt WS 5s rồi reconnect → thấy nguyên prompt + output 5 lệnh gần nhất + scrollback.

## Unresolved questions

Không có.
