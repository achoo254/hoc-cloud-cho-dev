# Phase 8 — Docs + Journal + Changelog

**Status:** pending | **Priority:** medium | **Effort:** 0.5h | **Depends on:** Phase 7

## Context

Sau khi mọi phase pass, cập nhật docs để team có thể follow pattern này cho các lab khác sau này.

## Files to update

| File | Change |
|------|--------|
| `docs/lab-schema-v3.md` | Document field mới `phaseType`/`steps[]`/`analysis`/`troubleshooting` trong `tryAtHome[]` table |
| `docs/project-changelog.md` | Entry mới: "DHCP tryAtHome v3 — 6 core + 3 optional practical with embedded screenshots" |
| `docs/development-roadmap.md` | Mark milestone "Hands-on practical với reference screenshot" complete |
| `docs/journals/2026-05-24-dhcp-tryathome-practical.md` (NEW) | Journal entry — quá trình, technical decisions, lessons learned |
| `docs/codebase-summary.md` | Note new component `screenshot-figure.tsx` |
| `docs/content-guidelines.md` | (optional) Section "Practical phase với screenshot" mô tả pattern reusable |

## docs/lab-schema-v3.md — additions

Mở rộng bảng `tryAtHome[]` shape (§2 hoặc thêm section riêng):

```
### tryAtHome[] item — extended (v3.1, additive)

| Key | Type | Mandatory | Note |
|-----|------|-----------|------|
| cmd | string | ✅ | Summary command block |
| why | string | ✅ | Summary rationale |
| observeWith | string | — | Summary observation |
| title | string | — | Phase heading (e.g. "Phase 4 — Case A") |
| sbsSection | string | — | Source section reference (e.g. "§7") |
| vmTarget | enum | — | 'host' \| 'server' \| 'client1' \| 'client2' |
| estimatedMinutes | int | — | Time budget |
| phaseType | enum | — | 'core' \| 'optional' (render khác nhau) |
| steps[] | step | — | Detail steps with screenshot |
| analysis | {observation, mechanism, lesson} | — | "Kiểm tra điều gì xảy ra" callout |
| troubleshooting[] | {symptom, fix} | — | Pitfall guide |

VMware Workstation Pro 25H2 baseline cho screenshot. Caption Vietnamese.
```

## docs/journals/2026-05-24-dhcp-tryathome-practical.md

Outline journal:
- **Context**: assignment requirement + SBS-v2 hybrid + brainstorm v1→v2 evolution
- **Decisions**:
  - Core/Optional split khi đối chiếu assignment
  - Backward compatible schema (Zod `.passthrough()` + optional fields)
  - Static folder vs MongoDB GridFS vs CDN
  - User chạy VMware thật vs synthetic screenshots
- **Implementation surprises** (nếu có)
- **Lessons learned**:
  - Re-check assignment vs SBS gốc tránh over-engineer
  - Wireshark GUI workflow phải explicit ngoài tcpdump CLI
  - `analysis` block (Observation/Mechanism/Lesson) làm rõ "kiểm tra điều gì xảy ra"
- **Pattern reusable**: dùng cho lab khác (OSI, TCP, DNS) — practical phase + reference screenshot

## docs/project-changelog.md — entry

```markdown
## 2026-05-24 — DHCP Lab `tryAtHome` v3 (Core + Optional Practical)

### Added
- Schema v3 patch (additive): `phaseType`, `steps[]`, `analysis`, `troubleshooting` fields cho `tryAtHome[]`
- Renderer: `TryAtHomePhaseCard`, `TryAtHomeAnalysisCallout`, `ScreenshotFigure` components
- Static assets: `app/public/labs/dhcp/screenshots/{core,optional}/` với 17+6 reference PNG (VMware Workstation Pro 25H2)
- DHCP lab `tryAtHome`: 6 core phase (Setup, dhcpd minimal, DORA Wireshark, Case A, Case B, Compare) + 3 optional (NAT, ping-check, APIPA)
- Migration script `server/scripts/update-lab-dhcp-tryathome-v3.js` (idempotent, backup)

### Changed
- DHCP lab tryAtHome thay hẳn 9 item cũ → 9 item mới structure phong phú
- `docs/lab-schema-v3.md`: section mới cho tryAtHome extended

### Backward compatibility
- 7 lab khác (osi, tcpip, dns, dns-resolution, tcpdump, ipv4, http) tryAtHome render không đổi (field mới optional)
```

## Acceptance criteria

- [ ] 4 docs updated (schema, changelog, roadmap, codebase-summary)
- [ ] Journal entry tạo + committed
- [ ] Markdown link verified (relative path không break)
- [ ] Dates đúng định dạng ISO (2026-05-24)
- [ ] No grammar errors trong journal (sacrifice grammar cho concision được phép)

## Final commit message gợi ý

```
feat(lab): replace DHCP tryAtHome bằng 6 core + 3 optional practical với VMware screenshots

- Schema v3.1 patch additive: phaseType, steps[], analysis, troubleshooting
- Renderer: TryAtHomePhaseCard + ScreenshotFigure + analysis callout
- 17 core + 6 optional reference PNG (VMware Workstation Pro 25H2)
- Migration: server/scripts/update-lab-dhcp-tryathome-v3.js (idempotent)
- Docs: lab-schema-v3.md, changelog, roadmap, journal updated

Closes: assignment DHCP Lab Server-Client (ESXi/VMware + tcpdump/Wireshark + 2 case)
Refs: plans/dattqh/260524-1726-dhcp-tryathome-vmware-practical/
```
