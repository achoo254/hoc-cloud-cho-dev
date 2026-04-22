---
title: "Self-hosted Web Terminal for Hands-on Learning"
description: "Implement xterm.js + WebSocket + Docker for real terminal experience in labs"
status: in-progress
priority: P1
effort: 5 weeks (10-12 weeks calendar with weekends-only)
branch: feat/web-terminal
tags: [terminal, docker, websocket, hands-on, learning]
created: 2026-04-21
updated: 2026-04-22
blockedBy: []  # 260422-0803-sqlite-to-mongodb-meilisearch completed 2026-04-22 → unblocked
blocks: []
relatedReports:
  - plans/dattqh/reports/brainstorm-260421-1453-self-hosted-web-terminal-learning.md
  - plans/dattqh/reports/brainstorm-260422-2132-tmux-web-terminal-backend.md
---

## Goal

Add self-hosted web terminal to labs for real hands-on practice with networking commands. Users can run actual commands (`ip neigh show`, `ping`, `tcpdump`) in isolated Docker containers directly from browser.

## Success Criteria

- [ ] xterm.js terminal renders in lab pages
- [ ] WebSocket connection established between browser and server
- [ ] Docker container spawns per session with network tools
- [ ] Commands execute and output streams back to browser
- [ ] Session auto-cleanup after 30 min inactive
- [ ] Max 5 concurrent sessions with queue for overflow
- [ ] Resource limits prevent abuse (256MB RAM, 0.5 CPU)
- [ ] WS reconnect within idle-timeout window restores prompt + scrollback (tmux persistence)
- [ ] Second tab on same session kicks the first (single-attach via `tmux attach -d`)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  xterm.js + WebSocket client                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (wss://api.domain/ws/terminal)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hono.js + @hono/node-ws                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐        │
│  │ WS Upgrade  │──│ Session Mgr  │──│ Dockerode       │        │
│  └─────────────┘  └──────────────┘  └────────┬────────┘        │
└──────────────────────────────────────────────┼──────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Host                                   │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │  lab-terminal:v1   │  │  lab-terminal:v1   │                 │
│  │  Alpine + net-tools │  │  (per session)     │                 │
│  │  Isolated network  │  │                    │                 │
│  └────────────────────┘  └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| WS library | `@hono/node-ws` | Native Hono integration, less deps |
| Container engine | `dockerode` | Most mature Node.js Docker client |
| Base image | Alpine Linux | Small (~5MB), fast boot, has apk |
| Session storage | MongoDB (Mongoose) | Aligns with post-migration stack (plan `260422-0803`); re-uses `server/db/mongo-client.js` singleton |
| Terminal lib | xterm.js | Industry standard, addon ecosystem |
| Session persistence | tmux inside container (`attach -d` kicks stale client) | WS reconnect preserves prompt/scrollback/env; ~0.5MB overhead per image |

## VPS Requirements

| Resource | Current | Required | Action |
|----------|---------|----------|--------|
| RAM | 1-2 GB | 4-8 GB | Upgrade VPS |
| CPU | 1 vCPU | 2-4 vCPU | Upgrade VPS |
| Docker | None | Installed | Install Docker Engine |

## Phases

| Phase | File | Description | Est. Time | Status |
|-------|------|-------------|-----------|--------|
| P1 | [phase-01-basic-terminal.md](./phase-01-basic-terminal.md) | xterm.js + WS + single container | 1 week | Deployed to VPS 2026-04-22 — `/ws/terminal/:labSlug` live, WS 101 via Cloudflare verified |
| P2 | [phase-02-lab-containers.md](./phase-02-lab-containers.md) | Lab-specific Docker images | 2 weeks | ARP topology deployed (`lab-arp-host-a/b` built); DHCP/DNS/HTTP/ICMP/TCP pending |
| P3 | [phase-03-session-management.md](./phase-03-session-management.md) | Timeout, cleanup, queue | 1 week | Deployed — `[cleanup-cron] started, interval=60s` confirmed in PM2 logs |
| P4 | [phase-04-security-hardening.md](./phase-04-security-hardening.md) | Resource limits, isolation | 1 week | Code complete; seccomp profile still pending (rate-limit deferred) |

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Container abuse | High | Medium | Resource limits, time caps, monitoring |
| WebSocket instability | Medium | Low | Heartbeat, reconnection logic; tmux in container preserves state across reconnect |
| Tmux prefix conflict if future lab teaches tmux | Low | Low | No such lab currently; if added, unbind outer prefix or document `C-b C-b` nested binding |
| VPS overload | High | Medium | Session cap, queue, scale VPS |
| Security breach | Critical | Low | Rootless Docker, network isolation |

## Out of Scope

- Multi-user collaborative terminals (kick-old-client chosen over shared-attach — see brainstorm 260422-2132)
- Persistent container storage
- Custom lab scenarios (future phase)
- Mistake Journal integration (separate plan)
- Gamification features (separate plan)

## Dependencies

- VPS upgrade (blocking)
- Docker installation on VPS (blocking)
- No blocking plans detected
