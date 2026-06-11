---
title: Lab VictoriaLogs (logs-centric) + interactive playground 3 mode
description: ''
status: completed
priority: P2
branch: master
tags: []
blockedBy: []
blocks: []
created: '2026-06-11T07:23:17.856Z'
createdBy: 'ck:plan'
source: skill
---

# Lab VictoriaLogs (logs-centric) + interactive playground 3 mode

## Overview

Thêm 1 **Lab interactive** chủ đề **VictoriaLogs** (logs-centric; VictoriaMetrics là context phụ) vào platform `hoc-cloud`, dùng hạ tầng lab schema v3 + playground registry đã có sẵn. Gồm: 1 playground gộp 3 mode (Kiến trúc&Luồng / LogsQL mini-evaluator / Pipeline stepper), nội dung schema v3 đầy đủ, seed script vào MongoDB, hands-on cài thật trên VPS (rsyslog → syslog ingest), và 1 report markdown nộp giảng viên (tone trung lập).

**Nguồn brainstorm:** [`brainstorm-summary.md`](./brainstorm-summary.md) (mọi quyết định đã chốt + lý do).

**Execution model:** AI Agent thực thi 100%, human chỉ review. Phasing chia theo dependency + reviewability, KHÔNG theo human-hours.

**Định danh:** slug `victorialogs`, `module: "observability"`, title "VictoriaLogs — thu thập & truy vấn log tập trung", `diagram.component = "VictoriaLogsPlayground"`.

**Build trên (đã hoàn thành):** `260419-2315-interactive-think-see-playground` (registry + lab-renderer slot), `260419-1737-schema-v3-think-see-ship` (Zod schema v3), `260602-2027-linux-labs-syslog-boot-swap` (pattern syslog). Không block plan nào.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Foundation & Registry](./phase-01-foundation-registry.md) | Completed |
| 2 | [VPS Hands-on Capture](./phase-02-vps-hands-on-capture.md) | Completed |
| 3 | [Playground Architecture Flow](./phase-03-playground-architecture-flow.md) | Completed |
| 4 | [Playground LogsQL Evaluator](./phase-04-playground-logsql-evaluator.md) | Completed |
| 5 | [Playground Pipeline Stepper](./phase-05-playground-pipeline-stepper.md) | Completed |
| 6 | [Lab Content & Seed](./phase-06-lab-content-seed.md) | Completed |
| 7 | [Instructor Report](./phase-07-instructor-report.md) | Completed |
| 8 | [Integration Verification](./phase-08-integration-verification.md) | Completed |

## Dependencies

**Cross-plan:** none (build trên hạ tầng đã completed; không block/blockedBy plan khác).

**Phase dependency graph (intra-plan):**

```
P1 Foundation ─┬─▶ P3 Architecture Flow ─┐
               ├─▶ P4 LogsQL Evaluator ──┤
               └─▶ P5 Pipeline Stepper ──┤
                                          ├─▶ P8 Integration Verification
P2 VPS Capture ─┬─▶ P6 Lab Content+Seed ─┤   (cần P1+P2)
                └─▶ P7 Instructor Report ┘
P6 cũng blockedBy P1 (cần registry key tồn tại để Zod parse diagram.component)
```

| Phase | blockedBy |
|-------|-----------|
| 1 Foundation & Registry | — |
| 2 VPS Hands-on Capture | — (external prereq: SSH access VPS) |
| 3 Architecture Flow | 1 |
| 4 LogsQL Evaluator | 1 |
| 5 Pipeline Stepper | 1 |
| 6 Lab Content & Seed | 1, 2 |
| 7 Instructor Report | 2 |
| 8 Integration Verification | 3, 4, 5, 6, 7 |

**⚠️ External prerequisite (Phase 2):** AI Agent cần **SSH access tới 1 VPS Linux** để cài VictoriaLogs + rsyslog thật và thu output. Nếu execution-time không có credential → Phase 2 BLOCKED, cần user cung cấp (hoặc fallback: dựng Docker local làm stand-in để sinh output thực — nhưng user đã chọn "VPS / bài thật").
