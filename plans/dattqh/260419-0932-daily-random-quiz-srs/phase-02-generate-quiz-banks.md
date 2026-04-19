# Phase 02 — Generate Quiz Banks (Claude Code in-session)

## Context Links
- Plan: [../plan.md](./plan.md)
- Schema contract: [phase-01-schema-srs-engine.md](./phase-01-schema-srs-engine.md)
- Engine: **Claude Code session trực tiếp** — không Python, không Gemini, không ai-multimodal skill

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 3h
- **Blockers:** Phase 01 (schema locked)

## Requirements
1. Generate 60-100 Qs/lab cho 8 labs trong `labs/01-networking/`
2. Input: content HTML hiện tại của mỗi lab (TL;DR + walkthrough + core sections)
3. Output: `labs/_shared/quiz-bank/{labId}.json` (array of Q objects)
4. Schema v2 validated: `{id, q, options[4], correct, whyCorrect, whyOthersWrong, difficulty, tags[]}`
5. Mix difficulty ~40% easy, 40% medium, 20% hard
6. **Inline merge as seed**: extract 8 inline Qs hiện tại của mỗi lab từ `data.quiz`, normalize (gán `id`, `difficulty` suy từ độ phức tạp, `tags` theo chủ đề lab), include vào bank. Gen thêm ~52-92 câu mới cho đủ target.
7. Self-review: Claude đọc lại output, flag duplicates/ambiguous/technical errors, fix tại chỗ

## Architecture

### Pipeline (Claude in-session, per lab)
```
For each lab HTML (8 labs):
  1. Read HTML via Read tool → extract inline `data.quiz` + prose (TL;DR, walkthrough, core)
  2. Normalize 8 seed Qs: assign id=`{labId}-q001..q008`, difficulty (dựa độ phức tạp), tags (theo chủ đề)
  3. Claude gen ~60 new Qs từ context + seed (tránh trùng stem) theo schema
  4. Self-review in-session: Claude đọc toàn bộ 60+8, list issues, fix inline
  5. Dedupe by stem similarity (manual reading, Claude judgment)
  6. Validate schema (all fields present, correct ∈ 0..3, options.length===4, difficulty enum)
  7. Write labs/_shared/quiz-bank/{labId}.json via Write tool
```

**Không cần script/Python/API** — toàn bộ chạy trong 1 Claude Code session, dùng Read/Write tools.

### Lab ID Mapping
| File | labId |
|------|-------|
| 01-tcp-ip-packet-journey.html | net-01-tcp-ip |
| 02-subnet-cidr.html | net-02-subnet-cidr |
| 03-tcp-udp.html | net-03-tcp-udp |
| 04-icmp-ping.html | net-04-icmp-ping |
| 05-arp.html | net-05-arp |
| 06-dhcp.html | net-06-dhcp |
| 07-http.html | net-07-http |
| 08-dns.html | net-08-dns |

(Confirm against each file's `LabTemplate.init({ labId })` call.)

### Generation Prompt (internal — Claude tự dùng khi được delegate)
```
Bạn là tech lead thiết kế quiz active-recall WHY-first cho dev học networking.
Ngữ cảnh lab: <CONTENT>
Seed đã có (8 câu inline, tránh trùng stem): <SEED_QS>
Sinh ~60 câu MỚI tiếng Việt cho lab này (tổng bank = seed + new ≥ 60, ≤ 100). Schema JSON:
{
  "id": "{labId}-q{seq}",  // vd: net-01-tcp-ip-q001
  "q": "câu hỏi (HTML inline code OK)",
  "options": ["A","B","C","D"],  // đúng 4 options
  "correct": 0-3,
  "whyCorrect": "giải thích ngắn tại sao đúng",
  "whyOthersWrong": {"0":"...","1":"...", ...},  // giải thích từng option sai
  "difficulty": "easy" | "medium" | "hard",
  "tags": ["dns","udp",...]  // 1-3 tags
}
Yêu cầu (áp cho TỔNG bank sau merge):
- ~40% easy (fact recall), ~40% medium (apply), ~20% hard (debug/scenario)
- Câu hỏi WHY-first (vì sao, khi nào, điều gì xảy ra nếu...)
- KHÔNG lặp stem với seed hoặc nhau
- 4 options plausible, không có "tất cả đều đúng"
- whyCorrect + whyOthersWrong BẮT BUỘC
Trả về JSON array only.
```

### Self-Review (Claude critic pass, in-session)
Sau khi gen, Claude tự đọc lại toàn bộ bank, check:
- Technical accuracy (RFC/spec compliance)
- Duplicate stems (normalize whitespace, compare)
- Ambiguous wording / missing why
- Correct index valid (0..3)
Fix tại chỗ, không cần round-trip API.

## Related Code Files
- 8× `labs/01-networking/*.html` (read-only: extract inline quiz + prose)
- NEW: `labs/_shared/quiz-bank/{labId}.json` (write)
- KHÔNG có script/tooling — chạy trong Claude session

## Implementation Steps (per-lab loop, Claude session)
1. Create `labs/_shared/quiz-bank/` directory
2. For each lab HTML:
   a. Read HTML, extract `LabTemplate.init({ data: { quiz: [...] } })` inline array
   b. Normalize 8 seed Qs (id/difficulty/tags), keep content intact
   c. Read prose sections (TL;DR, walkthrough, core)
   d. Claude gen ~60 new Qs per prompt above
   e. Self-review pass, fix issues
   f. Validate schema + count (60-100)
   g. Write `labs/_shared/quiz-bank/{labId}.json`
3. Manual spot-check 5 Qs/lab (read final JSON)
4. Commit 8 bank files

## Todo List
- [ ] Create quiz-bank dir
- [ ] Pilot: net-01-tcp-ip (extract seed → gen → review → write → QA)
- [ ] Batch: net-02...net-08 (same flow)
- [ ] Validate all 8 banks (schema + count 60-100)
- [ ] Commit

## Success Criteria
- 8 JSON files, each 60-100 Qs
- All Qs pass schema validator (no missing fields)
- Difficulty distribution ±10% of target
- No exact-stem duplicates within a bank
- Manual spot-check: 0/5 samples có câu sai kỹ thuật

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Claude hallucinate sai kỹ thuật | Med | High | Self-review pass + manual spot-check 5/lab |
| Duplicate Qs across banks | Med | Low | Accept — mỗi lab độc lập |
| Session context bloat (8 labs × 60 Qs) | Med | Med | 1 lab/session, commit từng lab xong mới sang lab tiếp |
| Seed normalization sai difficulty/tags | Low | Low | Human review seed trước khi gen |

## Rollback
- Delete `labs/_shared/quiz-bank/` → phase 03 fallback kicks in automatically
