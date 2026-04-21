# Brainstorm Report: Self-hosted Web Terminal for Hands-on Learning

**Date:** 2026-04-21  
**Status:** Approved  
**Priority:** High  

---

## Problem Statement

User (hands-on learner, personal growth goal) faces two main challenges:
1. **Khó nhớ lâu** — Content học xong dễ quên
2. **Thiếu thực hành** — Animations hay nhưng không có real terminal interaction

Current platform có SM-2 flashcards và quizzes cho retention, nhưng thiếu **hands-on terminal experience** để reinforce muscle memory với networking commands.

---

## User Profile

| Aspect | Detail |
|--------|--------|
| Learning style | Hands-on learner |
| Goal | Personal growth (expand skillset) |
| Time | Weekends only (deep dive OK) |
| Infra preference | Self-host everything, full control |

---

## Evaluated Approaches

### 1. Challenge-First Learning Mode
- **Concept:** Đảo ngược flow: show problem → predict → reveal animation
- **Pros:** Low effort, reuse existing content, proven active recall
- **Cons:** Không có real hands-on terminal
- **Verdict:** Good for retention, không solve hands-on gap

### 2. Third-party Embed (KillerCoda/LabEx)
- **Concept:** Embed iframe/link to external lab platform
- **Pros:** Zero infra, free tier available
- **Cons:** User rời platform, branding mất, dependency risk
- **Verdict:** Quick win nhưng không phù hợp user preference (self-host)

### 3. Hybrid (Simulated + External)
- **Concept:** Browser-based simulated terminal + KillerCoda links
- **Pros:** Balance effort/value, safe
- **Cons:** Simulated không "real", 2 systems to maintain
- **Verdict:** Good MVP approach nhưng user muốn full self-host

### 4. Self-hosted Web Terminal ✅ SELECTED
- **Concept:** xterm.js + WebSocket + Docker containers
- **Pros:** Full control, seamless UX, real hands-on
- **Cons:** High effort, cost increase, security complexity
- **Verdict:** Matches user preference for full control

---

## Final Recommended Solution

### Architecture Overview

```
Browser (xterm.js)
    ↓ WebSocket
Hono.js Backend
    ↓ Dockerode API
Docker Host (isolated lab containers)
    ├── arp-lab (2 VMs + switch)
    ├── dhcp-lab (server + client)
    ├── dns-lab (resolver chain)
    └── ...per lab type
```

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Terminal UI | xterm.js + addons | Browser terminal emulator |
| Transport | WebSocket (Hono.js) | Bidirectional I/O |
| Container Mgmt | Dockerode | Create/exec/destroy |
| Lab Images | Alpine Linux + net-tools | Lightweight, fast boot |
| Session Mgr | Custom (SQLite or in-memory) | User → container mapping |

### Security Model

| Measure | Implementation |
|---------|----------------|
| Resource limits | `--memory=256m --cpus=0.5` |
| Time limit | Auto-destroy after 30 min inactive |
| Network isolation | Unique Docker network per session |
| Command whitelist | Optional: restrict dangerous commands |
| Concurrent cap | Max 5 active sessions, queue overflow |

---

## Implementation Considerations

### VPS Requirements

| Resource | Current | Required |
|----------|---------|----------|
| RAM | 1-2 GB | 4-8 GB |
| CPU | 1 vCPU | 2-4 vCPU |
| Storage | Basic | Same |
| Cost | ~$5-10/mo | ~$20-40/mo |

### Estimated Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| P1 | Basic terminal (xterm.js + WS + single container) | 1 week |
| P2 | Lab containers (multi-container network topologies) | 2 weeks |
| P3 | Session management (timeout, cleanup, queue) | 1 week |
| P4 | Security hardening (limits, isolation, monitoring) | 1 week |

**Total:** ~5 weeks development (10-12 weeks calendar với weekends-only schedule)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Container abuse (crypto mining) | High | Resource limits + time caps + monitoring |
| WebSocket complexity | Medium | Use proven libraries (ws, dockerode) |
| VPS cost increase | Medium | Start with smaller VPS, scale on demand |
| Maintenance overhead | Medium | Automated cleanup cron, health checks |
| Docker host compromise | High | Rootless Docker, SELinux/AppArmor |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Terminal session usage | >50% of lab visitors try terminal | Analytics |
| Session duration | Avg >5 min (engaged learning) | Backend logs |
| Command success rate | >80% commands run successfully | Container logs |
| User retention | +20% return visitors | Cookie tracking |

---

## Future Enhancements (Out of scope now)

1. **Mistake Journal** — Track wrong quiz answers, generate focused review
2. **Progress Gamification** — Streaks, badges, XP system
3. **Challenge-First Mode** — Active recall before animation
4. **Teaching Mode** — Feynman technique implementation
5. **Multi-user labs** — Collaborative network troubleshooting

---

## Next Steps

1. ✅ Finalize architecture decision (this report)
2. ⬜ Create detailed implementation plan (`/ck:plan`)
3. ⬜ Setup Docker host on VPS
4. ⬜ Implement Phase 1: Basic terminal
5. ⬜ Iterate phases P2-P4

---

## Sources

- [xterm.js Docker Integration](https://www.presidio.com/technical-blog/building-a-browser-based-terminal-using-docker-and-xtermjs/)
- [KillerCoda Interactive Environments](https://killercoda.com/)
- [DevOps Home Lab Learning](https://www.virtualizationhowto.com/2026/01/the-top-devops-skills-in-2026-you-can-learn-in-a-home-lab/)
- [Active Recall & Spaced Repetition](https://training.safetyculture.com/blog/how-to-use-active-recall-and-spaced-repetition/)
