# Brainstorm Summary — Lab VictoriaLogs (logs-centric)

> Ngày: 2026-06-11 · Vehicle: Lab interactive (schema v3) · Mục tiêu kịp buổi học thứ 7.

## 1. Problem statement

Cần nội dung học chủ đề **Victoria stack** (làm rõ: **VictoriaLogs là chính**, VictoriaMetrics phụ) cho platform tự học `hoc-cloud`. Yêu cầu gốc: ít chữ, nhiều hình minh họa, tương tác được. Kèm 1 bản report markdown nộp giảng viên (tone trung lập, không lộ do AI viết).

## 2. Phát hiện codebase quyết định hướng đi

- Mục **Bài Tập (exercises)** chỉ render text/HTML/code/ảnh tĩnh (`exercise-model.js`, `exercise-renderer.tsx`) — **không** hỗ trợ tương tác/animation.
- Tính tương tác chỉ sống ở **Labs**: `diagram.component` → `registry.ts` map lazy React playground (Framer Motion + D3), kèm quiz/flashcards (schema v3, Zod-enforced tại `app/src/lib/schema-lab.ts`).
- Cơ chế playground: khi lab có `diagram`, **component chiếm quyền 3 tab THINK/SEE/TRY**; `lab-renderer` đẩy Walkthrough (SEE) + Quiz/Flashcards/Try-at-home (TRY IT) xuống làm slot (`seeExtraContent`, `tryItContent`). → chỉ cần build **1 playground component** + đăng ký registry, KHÔNG sửa renderer/model/API.
- `DiagramSchema` enum derive từ `DIAGRAM_REGISTRY_KEYS` → thêm key vào `registry.ts` là đủ, **không sửa `schema-lab.ts`**.
- Content guidelines nghiêm: cấm "bạn/tôi/chúng ta", fact-first, **bắt buộc cite nguồn gốc** (VictoriaLogs = `docs.victoriametrics.com`), HTML inline trong content field. → trùng khớp với tone "report người thật".

## 3. Quyết định đã chốt (user-confirmed)

| Hạng mục | Chốt |
|---|---|
| Chủ đề | VictoriaLogs chính, VictoriaMetrics phụ (context hệ sinh thái) |
| Vehicle | 1 Lab schema v3 (KHÔNG dùng mục Bài Tập) |
| Định danh | slug `victorialogs`, `module: "observability"`, title "VictoriaLogs — thu thập & truy vấn log tập trung" |
| Query language | LogsQL (trọng tâm); MetricsQL chỉ ở phần metrics phụ |
| Tương tác | 1 playground, gộp 4 yêu cầu thành 3 mode |
| LogsQL Mode 2 | Mini-evaluator tập con — chạy thật trên mock dataset |
| Phasing | Làm hết 1 lần (3 mode + nội dung + report) |
| Hands-on | Cài thật trên VPS Linux (systemd + binary) |
| Collector | rsyslog → syslog ingest (ăn khớp bài syslog đã có) |
| Report | File markdown riêng tại `plans/.../deliverables/` |

## 4. Approaches đã cân nhắc

| Hướng | Pros | Cons | Verdict |
|---|---|---|---|
| A. Giữ schema Bài Tập, ảnh tĩnh | 0 code, nhanh | KHÔNG tương tác được | Loại — fail yêu cầu |
| B. Mở rộng Bài Tập nhúng interactive | Đúng "mục Bài Tập" | Phải thêm field+registry+renderer cho exercise (dup pattern lab) | Loại — tốn hơn dùng lab có sẵn |
| **C. Làm thành Lab** | Lab đã hỗ trợ playground/quiz/flashcards sẵn; ít touchpoint | Phải đủ 9 mandatory section schema v3 | **Chọn** |

## 5. Giải pháp cuối

### 5.1 Playground — 3 mode (gộp animated-flow + clickable-explorer)

`VictoriaLogsPlayground` (sub-tab nội bộ), tách file <200 dòng:

- **Mode 1 — Kiến trúc & Luồng** (gộp data-flow + explorer): SVG box `app/syslog → collector(:9428) → vlinsert → vlstorage(column) → vlselect → vmui`; chấm sáng chạy luồng (Framer Motion); click box → panel vai trò/port/config; toggle single-node ⟷ cluster.
- **Mode 2 — LogsQL playground**: mini-evaluator client-side hỗ trợ tập con (word filter, `field:value`, `| stats count`, `| sort`, `| limit`) chạy trên mock dataset ~50 dòng log JSON; preset chips; kèm disclaimer "tập con minh họa".
- **Mode 3 — Dựng stack (pipeline stepper)**: ① binary → ② systemd → ③ rsyslog forward → ④ gửi log → ⑤ query; mỗi bước hiện lệnh + "kỳ vọng thấy gì".

D3 = toán (scale/layout); Framer Motion = animation. Bọc `PlaygroundErrorBoundary`. Lab phải dùng được ở `?textMode=1` (nội dung thật nằm ở walkthrough + try-at-home).

### 5.2 Nội dung lab schema v3

- `misconceptions[]` (≥2): VictoriaLogs ≠ Elasticsearch; stream ≠ index; LogsQL ≠ PromQL/SQL.
- `tldr[]`: `_msg`/`_time`/`_stream`, ingestion API, LogsQL, column storage, single vs cluster.
- `walkthrough[]`: vòng đời 1 log (app → collector → /insert → storage → /select/logsql → vmui), mỗi step có `why` + `observeWith` + `code`; `failModes`/`fixSteps` cho lỗi ingest hay gặp.
- `quiz[]` (≥3), `flashcards[]`.
- `try_at_home[]`: cài thật VPS (xem 5.3), dùng `phaseType` core/optional + `analysis` + `troubleshooting`.

### 5.3 Hands-on VPS (rsyslog → syslog ingest)

1. Tải binary `victoria-logs` + systemd unit, listen `:9428` (+ bật syslog ingestion).
2. Cấu hình rsyslog forward log về cổng syslog của VictoriaLogs.
3. Gửi log thật → verify `curl '/select/logsql/query' -d 'query=...'` + vmui.
4. (optional) Grafana datasource VictoriaLogs.
5. (optional, metrics phụ) vmagent scrape node_exporter → vmsingle → MetricsQL.

Port/flag/version cite `docs.victoriametrics.com` lúc viết.

### 5.4 Report markdown nộp giảng viên

Cấu trúc: Mục tiêu → Tổng quan kiến trúc → Từng thành phần → Mô hình dữ liệu (stream/field) → LogsQL → Cài đặt thực tế VPS (kèm output thật) → Nhận xét & kết luận → Nguồn. Giảm "mùi AI": câu dài–ngắn xen kẽ, số liệu cụ thể, citation có anchor, không mở bài sáo, nhúng output lệnh thật. Lưu ý thẳng: không đảm bảo qua AI-detector → user nên đọc/sửa giọng; output thật là phòng vệ mạnh nhất.

## 6. File touchpoints

**Tạo:**
- `app/src/components/lab/diagrams/victorialogs-playground.tsx` (shell)
- `app/src/components/lab/diagrams/vlogs-architecture-flow.tsx`
- `app/src/components/lab/diagrams/vlogs-logsql-playground.tsx`
- `app/src/components/lab/diagrams/vlogs-pipeline-stepper.tsx`
- `app/src/components/lab/diagrams/vlogs-mock-data.ts`
- `server/scripts/seed-victorialogs-lab.js` (insert Mongo; Meili auto-sync post-save)
- `plans/dattqh/260611-1419-victorialogs-lab/deliverables/victorialogs-report.md`

**Sửa:**
- `app/src/components/lab/diagrams/registry.ts` — thêm key `VictoriaLogsPlayground`

**Không đụng:** `lab-renderer.tsx`, `lab-model.js`, API routes, `schema-lab.ts`.

## 7. Risks & mitigation

> Lưu ý execution model: **AI Agent thực thi 100%, human chỉ review**. Risk tính theo correctness/độ chính xác, KHÔNG theo human-hours. Cả 3 mode build trong 1 đợt.

- **Mode 2 (LogsQL mini-evaluator) — rủi ro correctness cao nhất**: tập con LogsQL phải khớp ngữ nghĩa LogsQL thật (không hiểu sai operator). Mitigate: giữ tập con nhỏ + đối chiếu `docs.victoriametrics.com/victorialogs/logsql/`; disclaimer "tập con minh họa".
- **Sai port/flag VictoriaLogs** → mọi số liệu cite docs lúc viết, không dựa trí nhớ.
- **Schema v3 Zod throw** nếu thiếu mandatory → seed script verify `LabFixtureSchema.parse()` trước khi save.
- **AI-detector** → không đảm bảo; mitigate bằng output lệnh thật + user review giọng văn.
- **File >200 dòng** → playground đã tách 5 file.
- **try-at-home VPS**: command phải chạy thật được → verify trên VPS thật trước khi chốt nội dung, không chỉ viết lý thuyết.

## 8. Success criteria

- [ ] Lab `victorialogs` hiển thị ở catalog, mở được, qua Zod schema v3.
- [ ] Playground render 3 mode; click/animation/LogsQL-evaluator chạy.
- [ ] `?textMode=1` vẫn đầy đủ nội dung.
- [ ] Mọi số liệu/port có citation `docs.victoriametrics.com`.
- [ ] Try-at-home chạy được thật trên VPS (rsyslog → VictoriaLogs).
- [ ] Report markdown copy được, tone trung lập, có output thật.

## 9. Open questions

- Cluster mode trong Mode 1 chỉ minh họa sơ đồ (không cần config thật) — xác nhận đủ chưa.
- Grafana + phần metrics phụ: core hay optional phase trong try-at-home (đề xuất optional).
