---
title: Content Guidelines Migration
slug: content-guidelines-migration
date: 2026-04-19
status: completed
blockedBy: []
blocks: []
phases:
  - phase-01-readme-and-docs.md
  - phase-02-priority-labs.md
  - phase-03-remaining-networking-labs.md
  - phase-04-ui-and-smoke-test.md
---

# Plan — Content Guidelines Migration

Refactor toàn bộ nội dung hiện có để tuân thủ `docs/content-guidelines.md`.

## Context

- Guidelines: `docs/content-guidelines.md` (vừa ban hành 2026-04-19)
- Audit report: `plans/dattqh/reports/audit-260419-1413-content-guidelines-violations.md`
- Scope vi phạm: ~40 violation trên 14 file
- Decisions đã chốt (xem audit report §Quyết định): bỏ "tốt nhất" cho 10.x.x.x, cite RFC 1035 §4.2.1 cho 512B DNS, bỏ hẳn "phổ biến nhất", UI 1 fix.

## Nguyên tắc refactor

1. **Không đổi ngữ nghĩa kỹ thuật** — chỉ đổi cách diễn đạt + bổ sung nguồn.
2. **Link gốc** — ưu tiên RFC (datatracker.ietf.org), man7.org, vendor docs chính chủ; có anchor section khi có.
3. **Áp dụng checklist mục 7 guidelines** cho mỗi file trước khi commit.
4. **Không rewrite quiz/flashcard answer đúng/sai** — chỉ đổi wording + bổ sung `explanation` với nguồn.

## Phases

| # | Phase | File | Ước lượng |
|---|-------|------|-----------|
| 1 | README + docs/*.md | `phase-01-readme-and-docs.md` | 2–3 file, ~80 LOC |
| 2 | 4 priority labs (subnet-cidr, tcp-ip, dns, icmp-ping) | `phase-02-priority-labs.md` | 4 file, ~150 LOC |
| 3 | Networking lab còn lại (arp + 4 lab khác) | `phase-03-remaining-networking-labs.md` | 5 file, ~60 LOC |
| 4 | UI fix + smoke test (build + manual review) | `phase-04-ui-and-smoke-test.md` | 1 LOC fix + validation |

## Success criteria

- Grep toàn repo (phạm vi guidelines áp dụng) zero match với pattern: `\b(bạn|tôi|chúng ta|mình|các bạn)\b`
- Grep zero match: `magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất`
- Mỗi RFC mention trong lab networking có link `datatracker.ietf.org`
- Server `npm run dev` start được, 9 lab networking render không lỗi console
- Checklist mục 7 guidelines pass cho từng file đã refactor

## Out of scope

- Module 02–08 (linux, docker, python, ansible, monitoring, logging, cicd) — vì lab schema v2 refactor các module này còn đang tiến hành ở plan khác (`260419-1206-kill-theory-labs-v2-refactor`). Guidelines sẽ áp dụng cho nội dung mới của các module đó khi refactor.
- Plans + reports đã tạo — không back-refactor văn bản nội bộ.

## Risks

- **Rewording làm mất ý gốc**: mitigate bằng diff review từng câu trước commit.
- **Link RFC anchor sai**: verify thủ công mỗi link trước commit (curl HEAD hoặc open browser).
- **Refactor quá tay làm câu khô khan**: cho phép động từ imperative, không yêu cầu tất cả câu phải passive.
