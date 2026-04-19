---
phase: 03
title: Docker & Containerization
status: pending
priority: P1
effort: medium
---

# Phase 03 — Docker

## Why
"Chạy được trên máy em" — Docker giải quyết vấn đề môi trường. Dev hiểu Docker = deploy nhanh, debug production dễ.

## Core
- Container KHÔNG phải VM. Container share kernel với host, chỉ isolate namespace + cgroup.
- Image = blueprint (read-only layers). Container = instance chạy từ image (có writable layer).
- Dockerfile = công thức build image.

## Topics & Todo

### 1. Concept & Install
- [ ] VM vs Container (kernel sharing, resource)
- [ ] Namespace (PID/NET/MNT) + cgroup — cách isolate
- [ ] Cài Docker Engine trên Ubuntu
- **Demo**: `docker run hello-world`, `docker run -it ubuntu bash` → so sánh `ps` trong container vs host

### 2. Image & Container lifecycle
- [ ] `docker pull/run/ps/stop/rm/rmi/logs/exec`
- [ ] Port mapping `-p`, volume `-v`, env `-e`, `--name`, `--rm`, `-d`
- **Demo**: Chạy nginx container mount HTML từ host, truy cập từ browser

### 3. Dockerfile
- [ ] Instructions: FROM, RUN, COPY, ADD, CMD vs ENTRYPOINT, ENV, EXPOSE, WORKDIR
- [ ] Layer caching — sắp xếp instruction để cache hit
- [ ] Multi-stage build (giảm size)
- **Demo**: Build image Node.js app, so sánh size single-stage vs multi-stage

### 4. Volume & Network
- [ ] Bind mount vs named volume vs tmpfs
- [ ] Network: bridge (default), host, none, custom bridge
- [ ] Service discovery trong custom bridge (container ping nhau bằng name)
- **Demo**: 2 container (app + mysql) trên custom bridge, app connect `mysql:3306` bằng hostname

### 5. Docker Compose
- [ ] `docker-compose.yml` — services, volumes, networks, depends_on
- [ ] `up -d`, `down`, `logs -f`, `exec`
- **Demo**: Stack nginx + app + mysql, 1 lệnh `compose up`

### 6. Registry & tagging
- [ ] Docker Hub vs private registry
- [ ] Tag convention: `app:1.2.0`, `app:latest` (tránh latest prod)
- **Demo**: Push image lên Docker Hub, pull về VM khác chạy

### 7. Debug & Best practice
- [ ] `docker logs`, `docker exec -it`, `docker inspect`, `docker stats`
- [ ] Small base image (alpine, distroless), .dockerignore, non-root user
- [ ] Healthcheck

## Checklist qua phase
- [ ] Giải thích được container ≠ VM
- [ ] Tự viết Dockerfile multi-stage cho 1 app thật
- [ ] Compose stack web + db + cache chạy được
- [ ] Debug container chết bằng logs/inspect
