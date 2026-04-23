# Content Guidelines

Chuẩn viết nội dung cho repo tự học này. Áp dụng cho: `labs/*.html`, `README.md`, `docs/**`, UI copy (dashboard, widget, button, tooltip).

Nguyên tắc gốc: **trung lập, fact-first, có nguồn, xoay quanh việc học cá nhân**.

---

## 1. Ngôi xưng

**Cấm:** "bạn", "tôi", "chúng ta", "mình", "các bạn".

**Thay thế** tuỳ ngữ cảnh:

| Kiểu | Ví dụ |
|------|-------|
| Imperative | "Hiểu WHY trước HOW" |
| Passive | "Concept này cần hiểu trước khi..." |
| Danh từ trung tính | "Người học cần...", "Lab này yêu cầu..." |

Ví dụ chuyển đổi:

- ❌ "Bạn cần dựng 1 VPS để thực hành."
- ✅ "Thực hành module này cần 1 VPS."

---

## 2. Cụm từ cấm

Cấm không điều kiện (vì mơ hồ, không kiểm chứng được, hoặc mang tính hô khẩu hiệu):

- "thế giới thật đang dùng", "industry standard" (không kèm nguồn)
- "không phải magic", "hộp đen"
- "hàn lâm", "lý thuyết suông" (khi mô tả material khác)
- "thuần code app", "dev chân chính"
- "production-ready", "deploy-ready" khi không kèm checklist định nghĩa cụ thể
- "ai cũng dùng", "đa số dev", "phổ biến nhất" (không kèm số liệu + nguồn)

Nếu cần diễn đạt ý tương tự: thay bằng fact cụ thể + nguồn. Ví dụ:

- ❌ "DNS là thứ cả thế giới dùng."
- ✅ "DNS định nghĩa trong [RFC 1034](https://datatracker.ietf.org/doc/html/rfc1034) và [RFC 1035](https://datatracker.ietf.org/doc/html/rfc1035)."

---

## 3. Nguồn dẫn chứng

Bắt buộc cite nguồn cho 4 loại claim:

1. **Số liệu cụ thể**: port, RFC number, timeout mặc định, version, size limit, exit code.
2. **Quy chuẩn / giao thức**: mọi câu mô tả hành vi chuẩn của protocol/OS/API.
3. **So sánh / benchmark**: "X nhanh hơn Y", "phổ biến hơn", thị phần, latency.
4. **Best practice / khuyến nghị bảo mật**: dẫn CIS Benchmark, OWASP, vendor docs, man page.

### Ưu tiên nguồn gốc

Theo thứ tự ưu tiên:

1. RFC (datatracker.ietf.org), POSIX spec (pubs.opengroup.org), man page (man7.org, kernel.org)
2. Vendor docs chính chủ (docs.docker.com, kubernetes.io, nginx.org, redis.io, postgresql.org)
3. OpenSSH / OpenSSL / GNU coreutils docs
4. CIS Benchmark, NIST, OWASP (cho security)
5. Nguồn trung gian (blog, StackOverflow) — **chỉ khi không tìm được nguồn gốc**, và phải ghi rõ là nguồn trung gian.

### Format trích dẫn

Kết hợp hai cách:

- **Link inline** ngay cạnh claim cho claim quan trọng:
  > TCP RTO tính theo công thức trong [RFC 6298 §2](https://datatracker.ietf.org/doc/html/rfc6298#section-2).

- **Mục `## References`** cuối mỗi lab, đánh số `[1][2]` cho nguồn được dẫn nhiều lần trong lab:
  ```
  ## References
  [1] RFC 793 — Transmission Control Protocol. https://datatracker.ietf.org/doc/html/rfc793
  [2] man 8 tcpdump. https://www.tcpdump.org/manpages/tcpdump.1.html
  ```

### Link phải cụ thể

- Link tới section/anchor khi có (`#section-2`, `#name-initial-sequence-number`)
- Không link tới trang chủ khi claim nằm ở trang con cụ thể
- Không link tới bản cache / mirror khi bản gốc còn online

---

## 4. Ý kiến cá nhân / khuyến nghị

Cho phép, với điều kiện kèm đủ 3 yếu tố:

1. **Lý do** (vì sao)
2. **Điều kiện áp dụng** (khi nào / không khi nào)
3. **Nguồn** (nếu là best practice có chuẩn ngoài)

Ví dụ:

- ❌ "Nên disable root SSH."
- ✅ "Disable root SSH khi server mở ra public internet, vì giảm surface bruteforce vào account có UID 0 (xem [`PermitRootLogin` — sshd_config(5)](https://man.openbsd.org/sshd_config#PermitRootLogin))."

Cấm dùng không định nghĩa: "tốt nhất", "chuẩn", "đúng đắn", "sai", "cách chuyên nghiệp".

---

## 5. Hero / Intro của lab

Chỉ chứa 3 mục, theo thứ tự:

1. **Mục tiêu**: sau lab này làm được gì, đo được, cụ thể.
   - ❌ "Hiểu về TCP/IP."
   - ✅ "Đọc được output `tcpdump -n port 80` và chỉ ra TCP flag của mỗi packet."
2. **Tiên quyết**: module/lab/kiến thức cần có trước (liên kết tới lab cụ thể).
3. **Thời lượng ước tính** (optional): dạng range, vd "30–60 phút".

Không có: analogy bay bổng, motivational, "magic", "hộp đen", so sánh cảm xúc.

---

## 6. Tông giọng

- Trung lập, mô tả. Tránh tính từ cảm xúc: "tuyệt vời", "kinh khủng", "dễ dàng", "phức tạp".
- Câu ngắn, fact-first. Động từ trước tính từ.
- Technical term giữ tiếng Anh khi không có bản dịch tiếng Việt chuẩn đã được dùng phổ biến trong docs chính chủ (socket, handshake, payload, header, flag, buffer, thread).
- Dùng số liệu thay tính từ khi có thể:
  - ❌ "File rất lớn."
  - ✅ "File ≥ 1 GB."

---

## 7. Checklist review mỗi lab / doc

Trước khi commit một lab/doc, kiểm:

- [ ] Không có "bạn / tôi / chúng ta / mình / các bạn"
- [ ] Không có cụm cấm ở mục 2
- [ ] Mọi số liệu / RFC / version / port có link nguồn
- [ ] Mọi câu "nên / khuyến nghị / best practice" có lý do + điều kiện + nguồn
- [ ] Hero chỉ có mục tiêu + tiên quyết (+ thời lượng optional)
- [ ] Mục `## References` cuối file liệt kê đủ nguồn dùng trong lab
- [ ] Link trỏ tới nguồn gốc, có anchor tới section cụ thể khi có

---

## 8. Áp dụng cho schema v3 (labs)

Mapping guidelines với 12 sections của schema v3 (mnemonic: THINK · SEE · TRY IT — AUTOMATE/DEPLOY là callouts nằm trong walkthrough/tldr). Spec đầy đủ: [`lab-schema-v3.md`](./lab-schema-v3.md).

| Group | Section | Key | Mandatory? | Yêu cầu nguồn |
|-------|---------|-----|------------|---------------|
| THINK | Misconceptions | `misconceptions[]` (≥2) | ✅ | Cite nếu myth có nguồn lan truyền |
| THINK | WHY | `why` | ✅ | Không bắt buộc |
| THINK | BREAKS | `whyBreaks` | ✅ | Bắt buộc nếu cite error code / log line |
| SEE | OBSERVE | `observeWith` | ✅ | Bắt buộc cite man page tool |
| SEE | FAIL | `failModes[]` | ⚪ optional | Bắt buộc cite log reference / error doc |
| SEE | FIX | `fixSteps[]` | ⚪ optional | Bắt buộc cite man page cho command |
| (callout) | AUTOMATE | `automateScript` | ⚪ optional | Cite vendor docs nếu dùng API/lib |
| (callout) | DEPLOY | `deploymentUse` | ✅ | Bắt buộc cite vendor docs nếu config cụ thể |
| TRY IT | TL;DR | `tldr[]` | ✅ | Inherit cite từ row |
| TRY IT | Quiz | `quiz[]` | ✅ | Cite trong `whyCorrect` |
| TRY IT | Flashcards | `flashcards[]` | ✅ | Cite ngắn, inline |
| TRY IT | Try at home | `tryAtHome[]` | ✅ | Bắt buộc cite man page nếu flag lạ |

Optional section (FAIL/FIX/AUTOMATE): **không render DOM trống** nếu thiếu data. Không gượng ép — thêm khi lab tự nhiên có failure evidence / fix action / automation script.

Validation: Zod schema tại `app/src/lib/schema-lab.ts` throw runtime khi lab thiếu mandatory field.

---

## 9. UI copy (dashboard, widget, button)

- Label button: động từ ngắn, không xưng hô. "Bắt đầu lab" (OK), không "Học ngay bạn ơi".
- Tooltip: fact, không motivational. "Due hôm nay theo SM-2" (OK), không "Đừng quên ôn nhé!".
- Empty state: state fact + action. "Chưa có flashcard due. Mở lab bất kỳ để tạo thẻ." (OK).

---

## 10. Exception

Khi không thể áp dụng guideline này (vd: quote lại nguyên văn nguồn ngoài có dùng "bạn"), đánh dấu bằng blockquote + ghi rõ là quote:

```markdown
> Quote từ [nguồn X](url):
> "... nguyên văn có chứa 'bạn' ..."
```

---

## 11. Repo scope rules

Repo này là personal learning workspace, không phải product/course.

- **Tone**: Cấm marketing copy. Cấm: "dành cho ai", "tại sao chọn repo này", CTA ("bắt đầu ngay"), feature pitch ("tính năng nổi bật"), slogan ("chúc học vui"). Chỉ note kỹ thuật.
- **Schema v3 mandatory**: Mọi lab mới BẮT BUỘC đủ 9 mandatory sections (Misconceptions ≥2, WHY, BREAKS, OBSERVE, DEPLOY, TL;DR, Quiz, Flashcards, Try at home). Optional (FAIL, FIX, AUTOMATE) — chỉ thêm khi tự nhiên có, không gượng ép. Runtime Zod enforcement tại `app/src/lib/schema-lab.ts`.
- **Ngôn ngữ**: Content/comment dùng tiếng Việt. Code identifier (function, variable, file name) dùng English.
- **Markdown location**: Không tạo `.md` ngoài `plans/dattqh/` và `docs/` trừ khi user yêu cầu.
