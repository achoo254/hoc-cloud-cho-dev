# hoc-cloud-cho-dev

> Repo tự học **Cloud — System & Network — DevOps** dành cho developer bắt đầu từ con số 0.

Đây không phải khóa học bán vé. Đây là một bộ **labs tương tác** (HTML tự chứa) + **cheat-sheet thực chiến** để bạn vừa đọc, vừa gõ lệnh, vừa trả lời quiz, vừa ôn lại bằng flashcard theo thuật toán Spaced Repetition (SM-2). Mục tiêu: sau khi đi hết repo này, một dev "thuần code app" có thể tự tin đụng vào server, network, Docker, CI/CD mà không còn cảm giác "cloud là hộp đen".

---

## 1. Repo này dành cho ai?

- Bạn là **dev (frontend/backend/mobile)** đã biết code nhưng chưa từng dựng server, chưa hiểu TCP/IP, chưa đụng Linux shell nghiêm túc.
- Bạn muốn hiểu **tại sao** (WHY) trước khi học **làm sao** (HOW) — tức là mỗi concept phải trả lời được "bỏ qua cái này thì hệ thống vỡ chỗ nào?".
- Bạn học tốt hơn khi **gõ lệnh thật**, xem output thật, chứ không phải đọc lý thuyết suông.

Nếu bạn đã là sysadmin/SRE nhiều năm, repo này hơi cơ bản cho bạn — nhưng vẫn có thể dùng làm tài liệu onboard cho junior.

---

## 2. Lộ trình học (đi theo thứ tự)

Toàn bộ labs nằm trong thư mục `labs/`, đánh số theo thứ tự nên học:

| # | Module | Học cái gì | Cần trước đó |
|---|--------|------------|--------------|
| 01 | **Networking** | OSI, TCP/IP, subnet/CIDR, TCP vs UDP, ICMP, ARP, DHCP, HTTP, DNS | Không cần gì |
| 02 | **Linux** | Shell cơ bản, SSH, netplan (static IP), sshd hardening, cron backup | Biết mở terminal |
| 03 | **Docker** | Container vs VM, Dockerfile multi-stage, docker-compose | Module 02 |
| 04 | **Python cho Sysadmin** | Script tự động hoá: disk alert, parse log, CLI tool | Biết Python cơ bản |
| 05 | **Ansible** | Infrastructure as Code, playbook, role, inventory | Module 02, 03 |
| 06 | **Monitoring** | Prometheus + Alertmanager, metrics là gì, alert rule | Module 03 |
| 07 | **Logging** | Loki + Promtail, structured log (JSON), log pipeline | Module 03, 06 |
| 08 | **CI/CD** | GitHub Actions, build → test → deploy, secret management | Module 03 |

> **Quy tắc vàng:** học xong module N, **dừng lại 1–2 ngày** để làm phần `Try at home` trước khi sang module N+1. Đọc lướt không đọng lại gì.

---

## 3. Cách chạy labs (local)

Labs là các file HTML tự chứa (self-contained), cần một HTTP server nhỏ để load đúng (không double-click file, vì browser sẽ chặn fetch/ES modules qua `file://`).

### Cách 1 — Node.js (khuyến nghị, có live-reload)

```bash
# yêu cầu Node >= 20
npm install
npm run dev          # dev mode, auto reload khi sửa file
# hoặc
npm start            # production mode
```

Server chạy mặc định tại `http://localhost:3000` → mở trang dashboard của labs.

### Cách 2 — Python (nhanh, không cần cài gì nếu có Python)

```bash
cd labs
python -m http.server 8000
# mở http://localhost:8000
```

### Dashboard

Trang `index.html` trong `labs/` là **dashboard** tổng:
- Danh sách labs theo module
- Tiến độ (progress) bạn đã làm đến đâu
- Số flashcard **due hôm nay** theo thuật toán SM-2
- Tất cả trạng thái lưu ở `localStorage` của trình duyệt — **không có backend**, không gửi dữ liệu đi đâu

Muốn reset: DevTools → Application → Local Storage → xoá tất cả key `lab:*`.

---

## 4. Triết lý "4 chân kiềng Deploy-Ready"

Mỗi lab đều có cấu trúc cố định:

```
Hero → Misconceptions → TL;DR → Walkthrough → Quiz → Flashcards (SM-2) → Try at home
```

Content layer được thiết kế theo **Schema v2 — 4 chân kiềng**:

| Chân kiềng | Trường | Trả lời câu hỏi |
|------------|--------|-----------------|
| 💡 **WHY** | `why` | Tại sao cần biết concept này? |
| ⚠️ **BREAKS** | `whyBreaks` | Hiểu sai/thiếu thì hệ thống vỡ chỗ nào? |
| 👁️ **OBSERVE** | `observeWith` | Lệnh gì để tận mắt thấy nó đang xảy ra? (tcpdump, dig, journalctl, …) |
| 🚀 **DEPLOY** | `deploymentUse` | Khi deploy VPS thật, dùng concept này ở đâu? |

4 nút toggle ở góc phải trang: bật/tắt từng lớp độc lập để tự test ("ẩn WHY, tự nhớ → bật lại kiểm tra").

### Global search + multi-device progress

- **Search box ở mọi trang**: gõ `/` focus, kết quả full-text qua FTS5 từ backend.
- **Progress sync multi-device**: cookie ẩn danh (`hcl_uid` UUID, 2 năm) lưu tiến độ đọc + điểm quiz lên server. Mở trên device khác cùng cookie → thấy đã đọc gì, điểm bao nhiêu. Không cần đăng ký tài khoản.

---

## 4b. API endpoints (server)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/healthz` | Health + DB status |
| GET | `/api/search?q=<keyword>` | FTS5 full-text search qua tất cả lab (title + tldr + walkthrough + quiz + flashcards + try-at-home) |
| GET | `/api/progress` | Trả `{ uuid, progress: [...] }` cho cookie hiện tại |
| POST | `/api/progress` | Body `{ lab_slug, opened_at?, completed_at?, quiz_score? }` → upsert |
| POST | `/api/progress/migrate` | Batch import từ localStorage cũ (chạy 1 lần) |
| GET | `/__livereload` · `/sse/reload` | SSE dev live-reload |

## 5. Spaced Repetition — học để nhớ lâu

Flashcards trong mỗi lab dùng thuật toán **SM-2** (giống Anki):

- Sau khi lật thẻ, chọn 1 trong 4 nút: **Again (0)** / **Hard (1)** / **Good (2)** / **Easy (3)**
- Thuật toán tính khoảng cách đến lần ôn tiếp theo
- Dashboard hiển thị số thẻ **due hôm nay** across tất cả labs

Kỷ luật khuyến nghị: mở dashboard **mỗi ngày 10 phút**, clear hết thẻ due trước khi học bài mới.

---

## 6. Cấu trúc repo

```
hoc-cloud-cho-dev/
├── README.md                  # file bạn đang đọc
├── package.json
├── server/
│   ├── server.js              # Hono.js: static + /api/search + /api/progress + SSE reload
│   ├── api/
│   │   ├── search-routes.js   # GET /api/search (FTS5)
│   │   └── progress-routes.js # GET/POST /api/progress (anon cookie UUID)
│   ├── db/
│   │   ├── sqlite-client.js
│   │   ├── migrate.js
│   │   └── migrations/*.sql   # 001-init, 002-kill-theory, 003-fix-labs-fts-columns
│   ├── lib/
│   │   ├── csp-middleware.js
│   │   ├── sse-reload.js
│   │   └── anon-uuid-cookie.js
│   ├── scripts/
│   │   └── sync-labs-to-db.js # walk labs/*.html → labs + labs_fts
│   └── ecosystem.config.cjs   # PM2 production
├── deploy/                    # nginx + remote deploy script
├── data/hoccloud.db           # SQLite: labs + labs_fts + progress
├── labs/
│   ├── index.html             # dashboard (hydrate server progress badges)
│   ├── _shared/
│   │   ├── lab-template.css   # theme + schema-v2 callouts
│   │   ├── lab-template.js    # WHY-first runtime + SM-2 + auto-inject widgets
│   │   ├── search-widget.{js,css}
│   │   └── progress-sync.js   # multi-device sync
│   ├── 01-networking/         # 8 labs HTML (schema v2 rolling: DNS pilot → rest)
│   ├── 02-linux/ … 08-cicd/
├── docs/                      # tài liệu dự án (PDR, roadmap, ...)
├── plans/                     # plan triển khai các tính năng repo này
└── subnet-calculator.html     # tool phụ: tính subnet/CIDR
```

---

## 7. Gợi ý cách học hiệu quả

1. **Đi tuần tự** — không nhảy cóc. Network là nền của mọi thứ, bỏ sẽ hổng về sau.
2. **Gõ tay, đừng copy-paste** — đặc biệt ở phần `Try at home`. Ngón tay nhớ lâu hơn mắt.
3. **Làm quiz 2 lần** — lần 1 ngay sau khi đọc, lần 2 sau 1 tuần. Điểm lần 2 mới phản ánh kiến thức thật.
4. **Dựng 1 VPS rẻ** (~5$/tháng: Vultr, DigitalOcean, Contabo) để thực hành module 02+. Labs chỉ là giả lập — kiến thức đọng lại khi bạn thật sự SSH vào server thật và nó thật sự đang chạy.
5. **Viết blog/note cá nhân** sau mỗi module — bắt não bạn giải thích lại bằng lời của mình.

---

## 8. Đóng góp / mở rộng

- Thêm lab mới: copy một file lab có sẵn (ví dụ `labs/01-networking/01-tcp-ip-packet-journey.html`), sửa `<title>` và block `<script type="application/json" id="lab-data">`, thêm entry vào `CATALOG` trong `labs/index.html`.
- Schema `lab-data` và convention đầy đủ xem ở `labs/README.md`.
- Mở DevTools console khi dev — template sẽ warn nếu thiếu trường `why` ở bất kỳ block nào.

---

## 9. Tài liệu thêm

- `docs/project-overview-pdr.md` — mô tả sản phẩm chi tiết
- `plans/` — lịch sử các plan triển khai tính năng
- `labs/README.md` — hướng dẫn viết lab mới, schema, quy ước WHY-first

---

**Chúc học vui.** Cloud không phải magic — nó chỉ là Linux + network + một lớp automation dày lên theo thời gian. Đi chậm, hiểu sâu, rồi mọi abstraction (Kubernetes, Terraform, service mesh, ...) sau này đều trở thành chuyện dễ.
