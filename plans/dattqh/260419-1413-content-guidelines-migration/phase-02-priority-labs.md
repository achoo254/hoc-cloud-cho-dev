# Phase 02 — 4 Priority Labs

**Status:** completed | **Priority:** P0 | **Effort:** 3–4h | **Depends on:** Phase 01 (optional)

## Files

1. `labs/01-networking/02-subnet-cidr.html` — 3 "bạn" + 1 "mình" + 3 RFC không link + "phổ biến nhất" + "tốt nhất"
2. `labs/01-networking/01-tcp-ip-packet-journey.html` — 6 "bạn" + "hàn lâm" (L114)
3. `labs/01-networking/08-dns.html` — 6 "bạn" + 4 RFC không link + 2 số (512B, TTL 86400) không cite + "phổ biến nhất"
4. `labs/01-networking/04-icmp-ping.html` — 3 "bạn" + 1 "mình" + RFC 792 ×3 không link

## Steps per lab

1. **Fix ngôi xưng** — replace "bạn/tôi/chúng ta/mình" theo ngữ cảnh (imperative hoặc danh từ trung tính).
2. **Fix cụm cấm** — rewrite câu giữ nghĩa.
3. **Add RFC/source link** — mỗi RFC/số liệu cite → link gốc `datatracker.ietf.org` hoặc man page. Link có anchor section khi có.
4. **Add `## References` block** cuối `<script type="application/json" id="lab-data">` hoặc phần tương đương (check `labs/README.md` schema).
5. **Checklist mục 7** before commit.

## Decisions áp dụng

- `02-subnet-cidr.html` L367 "10.x.x.x là tốt nhất" → bỏ "tốt nhất", viết: "10.0.0.0/8 (16M địa chỉ) là range rộng nhất trong 3 private range của [RFC 1918 §3](https://datatracker.ietf.org/doc/html/rfc1918#section-3)."
- `02-subnet-cidr.html` L342 "phổ biến nhất" → rewrite theo fact cụ thể, không claim popularity.
- `08-dns.html` L411 "phổ biến nhất" → tương tự.
- `08-dns.html` 512 bytes → cite `[RFC 1035 §4.2.1](https://datatracker.ietf.org/doc/html/rfc1035#section-4.2.1)`.
- `08-dns.html` TTL 86400 → cite `[RFC 1035 §3.2.1](https://datatracker.ietf.org/doc/html/rfc1035#section-3.2.1)` hoặc để nguyên số + ghi "giá trị ví dụ (1 ngày)".
- `01-tcp-ip-packet-journey.html` L114 "hàn lâm" → rewrite: "định nghĩa chính thức" hoặc xoá từ này nếu không đổi nghĩa.

## RFC cần link (verify trước khi dán)

- RFC 1918 (private range): https://datatracker.ietf.org/doc/html/rfc1918
- RFC 3021 (31-bit prefix): https://datatracker.ietf.org/doc/html/rfc3021
- RFC 792 (ICMP): https://datatracker.ietf.org/doc/html/rfc792
- RFC 1035 (DNS): https://datatracker.ietf.org/doc/html/rfc1035
- RFC 2181 (clarifications DNS): https://datatracker.ietf.org/doc/html/rfc2181
- RFC 7766 (DNS over TCP): https://datatracker.ietf.org/doc/html/rfc7766

## Acceptance per lab

- `grep -E '\b(bạn|tôi|chúng ta|mình|các bạn)\b' <file>` → 0 match
- `grep -Ei 'magic|hộp đen|hàn lâm|thuần code app|lý thuyết suông|thế giới thật|phổ biến nhất|tốt nhất' <file>` → 0 match (trừ khi "tốt nhất" trong quote có nguồn)
- Mỗi "RFC XXXX" có link đi kèm
- Lab render OK trong browser, không lỗi console
