---
phase: 6
title: Lab Content & Seed
status: completed
priority: P1
effort: ''
dependencies:
  - 1
  - 2
---

# Phase 6: Lab Content & Seed

## Overview
Viết nội dung lab `victorialogs` đầy đủ schema v3 (9 mandatory section) + seed script insert vào MongoDB. `diagram.component='VictoriaLogsPlayground'`. Tuân `content-guidelines.md` (cấm xưng hô, fact-first, cite `docs.victoriametrics.com`). Hands-on dùng lệnh/output thật từ Phase 2.

## Requirements
- Functional: doc lab qua `LabFixtureSchema.parse()` không throw; seed upsert vào collection `labs`; Meili auto-sync (post-save hook); xuất hiện ở `/api/labs` + catalog.
- Content (mandatory schema v3): `misconceptions[]` (≥2), `tldr[]`, `walkthrough[]` (≥1), `quiz[]` (≥1, đề xuất ≥3), `flashcards[]` (≥1), `try_at_home[]` (≥1). `module:"observability"`, `estimated_minutes`, `content_hash`, `updated_at`.
- Non-functional: HTML inline trong content field; mọi port/RFC/version cite nguồn gốc; ngôi xưng trung lập; `why` theo cấu trúc 3 đoạn (P1 contract / P2 mechanics / P3 implication) ≥200 ký tự.

## Architecture
- Nội dung logs-centric:
  - `misconceptions`: "VictoriaLogs ≠ Elasticsearch (không phải inverted index full)", "stream ≠ index", "LogsQL ≠ PromQL/SQL".
  - `tldr`: `_msg`/`_time`/`_stream` & field model; ingestion (syslog/ES/Loki/OTEL); LogsQL; column storage/compression; single-node vs cluster (vlinsert/vlstorage/vlselect).
  - `walkthrough`: vòng đời 1 log (rsyslog → syslog listener → vlinsert → vlstorage → query) — mỗi step `what`+`why`(3 đoạn)+`observeWith`+`code`; `failModes`/`fixSteps` cho lỗi ingest/quyền (lấy evidence thật Phase 2).
  - `quiz` (≥3): cú pháp LogsQL filter; port 9428; chọn collector; phân biệt với metrics/MetricsQL.
  - `flashcards`: field đặc biệt, pipe operators, port, single vs cluster.
  - `try_at_home`: phase core (cài VPS thật, từ Phase 2) + phase optional (Grafana, nửa metrics) dùng `phaseType`, `steps[]` (`do`/`expect` từ output thật), `analysis`, `troubleshooting`.
- Seed script mirror `migrate-linux-labs-to-exercises.js` pattern: connect Mongo → build doc → `LabFixtureSchema` verify → upsert `Lab` → log.

## Related Code Files
- Create: `server/scripts/seed-victorialogs-lab.js`
- Read: `server/db/models/lab-model.js`, `server/scripts/migrate-linux-labs-to-exercises.js`, `app/src/lib/schema-lab.ts`, `docs/content-guidelines.md`, Phase 2 `captured-outputs/`
- Data đích: MongoDB collection `labs` (⚠️ xem cảnh báo prod bên dưới)

## Implementation Steps
1. Đọc lab-model.js + 1 lab JSON hiện có (vd qua `/api/labs/:slug`) để khớp shape doc đầy đủ (id, content_hash...).
2. Soạn nội dung từng section theo content-guidelines (cite docs từng claim).
3. Nhúng lệnh/output thật Phase 2 vào walkthrough + try_at_home.
4. Viết seed script: build doc → `LabFixtureSchema.parse(doc)` verify TRƯỚC khi save → upsert → log slug + hash.
5. Chạy seed (xem cảnh báo env), verify `/api/labs/victorialogs` trả đúng + Meili search ra.

## Success Criteria
- [ ] `LabFixtureSchema.parse()` pass (đủ 9 mandatory, misconceptions ≥2).
- [ ] Seed upsert thành công; `/api/labs/victorialogs` trả full content.
- [ ] Catalog hiển thị lab (module observability); Meili search "VictoriaLogs"/"LogsQL" ra kết quả.
- [ ] Checklist content-guidelines pass (không xưng hô, mọi số liệu có nguồn).
- [ ] `diagram.component='VictoriaLogsPlayground'` → playground render.

## Risk Assessment
- **⚠️ Env = prod:** `.env.development` trỏ thẳng prod DB (memory). Seed = ghi prod. Phải xác nhận target DB trước khi chạy; cân nhắc seed lên DB test trước, hoặc xác nhận user OK ghi prod. KHÔNG chạy seed mù.
- **Thiếu mandatory field** → Zod parse verify ngay trong seed, fail sớm trước save.
- **Số liệu sai** → cite docs từng claim; không dựa trí nhớ về port/flag.
- **Phụ thuộc Phase 2**: nội dung hands-on chỉ chốt sau khi có output thật.
