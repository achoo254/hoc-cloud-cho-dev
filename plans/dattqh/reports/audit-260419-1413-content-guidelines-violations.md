# Audit — Content Guidelines Violations

Date: 2026-04-19 14:13 | Scope: `README.md`, `labs/**/*.html`, `docs/**/*.md`, `labs/_shared/*` (UI copy).
Guidelines ref: `docs/content-guidelines.md`.

## Summary

- Files scan: 21 (README.md + 9 lab HTML + 2 docs/*.md + shared)
- Tổng violation: ~35–40
  - Ngôi xưng cấm: 25–30 (100% coverage)
  - Cụm từ cấm: 7 (100% coverage)
  - Claim cần nguồn nhưng thiếu link: 5–8 (sampled)
  - Khuyến nghị trần: 3–5 (sampled)

## Chi tiết

### 1. Ngôi xưng cấm ("bạn / tôi / chúng ta / mình")
- `README.md` — "bạn" ×5 (L5, L15, L66, L127, L168)
- `labs/01-networking/01-tcp-ip-packet-journey.html` — bạn ×6
- `labs/01-networking/02-subnet-cidr.html` — bạn ×3, mình ×1
- `labs/01-networking/04-icmp-ping.html` — bạn ×3, mình ×1
- `labs/01-networking/05-arp.html` — bạn ×2, mình ×1
- `labs/01-networking/08-dns.html` — bạn ×6
- Lab khác: ~3 violation

### 2. Cụm từ cấm
| File | Cụm | Line |
|------|-----|------|
| README.md | "hộp đen" | 5 |
| README.md | "thuần code app" | 5 |
| README.md | "lý thuyết suông" | 13 |
| README.md | "không phải magic" | 189 |
| labs/01-networking/01-tcp-ip-packet-journey.html | "hàn lâm" | 114 |
| labs/01-networking/02-subnet-cidr.html | "phổ biến nhất" (không số liệu) | 342 |
| labs/01-networking/08-dns.html | "phổ biến nhất" (không số liệu) | 411 |

### 3. Claim cần nguồn nhưng thiếu link (sample)
- `labs/01-networking/02-subnet-cidr.html`: RFC 1918, RFC 3021 cite không link
- `labs/01-networking/04-icmp-ping.html`: RFC 792 (L425, L481, L567) không link
- `labs/01-networking/08-dns.html`: RFC 2181, RFC 7766 (L417–418, L597–610) không link; số 512 bytes (L270, L279) không cite RFC 1035/2671; TTL 86400 không link
- Các số cụ thể trong lab khác chưa scan hết

### 4. Khuyến nghị trần (sample)
| File | Line | Snippet | Issue |
|------|------|---------|-------|
| README.md | 42 | "Cách 1 — Node.js (khuyến nghị...)" | Thiếu lý do rõ |
| README.md | 21 | "đánh số theo thứ tự nên học" | "Nên" không giải thích why |
| labs/01-networking/02-subnet-cidr.html | 367 | "10.x.x.x là tốt nhất..." | Có điều kiện nhưng thiếu source |

## Priority file (nhiều violation nhất)

1. `labs/01-networking/02-subnet-cidr.html` — 6 ngôi xưng + 3 RFC thiếu link
2. `labs/01-networking/01-tcp-ip-packet-journey.html` — 6 ngôi xưng + "hàn lâm"
3. `labs/01-networking/08-dns.html` — 6 ngôi xưng + 4 RFC thiếu link + 2 số thiếu cite
4. `README.md` — 5 ngôi xưng + 3 cụm cấm + 2 khuyến nghị trần

## Khối lượng refactor ước tính

- Files touch: 13–15
- LOC đụng: ~200–300
- Độ khó: trung
  - Ngôi xưng: search-replace có context
  - RFC link: verify từng RFC trên datatracker.ietf.org
  - Cụm cấm: rewrite câu giữ nghĩa
  - Khuyến nghị: add lý do + điều kiện + source

## Quyết định (đã chốt 2026-04-19)

1. Cụm "10.x.x.x tốt nhất" → bỏ "tốt nhất", chỉ giữ fact + link RFC 1918.
2. 512 bytes DNS UDP → cite RFC 1035 §4.2.1 (nguồn gốc).
3. "Phổ biến nhất" trong subnet + dns → bỏ hẳn, viết lại câu theo fact, không claim popularity.
4. UI copy trong `labs/_shared/*` + `labs/index.html` → scan bổ sung (xem phần "UI copy scan" dưới).

## UI copy scan (bổ sung)

Scope: `labs/index.html`, `labs/_shared/*.js`, `labs/_shared/*.css`.

- `labs/_shared/index-sections-stats.js:82` — `<h2>Tiến độ của bạn</h2>` — ngôi xưng "bạn"

Các file khác clean (hero, footer, roadmap, toolbar, search-widget, CSS). Tổng: 1 violation, 1 LOC.
