# Sample Lab — DNS refactored theo Schema v2

> So sánh trực tiếp: v1 hiện tại (từ `labs/01-networking/08-dns.html`) vs v2 áp dụng WHY + WHEN-IT-BREAKS + SEE-IT-ON-VPS.

## 1. Before/After — 1 TL;DR row

### v1 (hiện tại)

```json
{
  "what": "Recursive resolver (8.8.8.8, ISP)",
  "why": "Đây là 'thám tử DNS' thật sự — nó tự đi hỏi Root → TLD → Authoritative thay bạn. Google 8.8.8.8, Cloudflare 1.1.1.1 là recursive resolver công cộng. ISP hay cấp resolver riêng nhưng đôi khi inject quảng cáo vào NXDOMAIN."
}
```

✅ Giải thích concept tốt
❌ Không nói hỏng thì ra sao, không gợi ý quan sát

### v2 (đề xuất)

```json
{
  "what": "Recursive resolver (8.8.8.8, ISP)",
  "why": "'Thám tử DNS' — tự đi hỏi Root → TLD → Authoritative thay bạn. 8.8.8.8 (Google), 1.1.1.1 (Cloudflare) là resolver công cộng.",
  "whyBreaks": "Resolver chết → mọi domain fail dù mạng OK. Triệu chứng: `ping 8.8.8.8` thành công nhưng `ping google.com` báo 'Temporary failure in name resolution'. Hay nhầm với **stub resolver** (nằm trong OS, chỉ forward, không tự recurse) và **authoritative** (server cuối chứa record thật). ISP resolver có thể tiêm quảng cáo vào NXDOMAIN → test bằng `dig nonexistent-xyz-123.com` trên nhiều resolver."
}
```

✅ Giữ nguyên chiều dài đọc tổng
✅ `whyBreaks` làm rõ triệu chứng + 2 concept hay nhầm trong 1 block

## 2. Before/After — 1 Walkthrough step

### v1

```json
{
  "step": 2,
  "what": "dig +trace — xem toàn bộ recursive path",
  "why": "+trace bắt dig tự làm recursive từ root, không dùng cache của resolver. Đây là cách xác nhận 'record đã cập nhật chưa' — nếu +trace trả đúng nhưng resolver vẫn sai thì đó là cache issue.",
  "code": "dig example.com +trace"
}
```

### v2

```json
{
  "step": 2,
  "what": "dig +trace — xem toàn bộ recursive path",
  "why": "+trace bắt dig tự làm recursive từ root, không dùng cache resolver. Là cách xác nhận 'record đã cập nhật chưa'.",
  "whyBreaks": "Nếu +trace trả kết quả khác với `dig example.com` (không +trace) → resolver của bạn đang cache cũ, chờ TTL hết hoặc chuyển resolver. Nếu +trace cũng sai → record chưa publish xong ở authoritative.",
  "code": "dig example.com +trace",
  "observeWith": {
    "cmd": "dig example.com +trace",
    "lookAt": "1) Thứ tự output: phải có 3 nhóm NS — root (.), TLD (com.), authoritative (example.com.). 2) Dòng cuối cùng có cờ 'Received X bytes from 93.184.216.34#53' → IP đó chính là authoritative đã trả lời. 3) Nếu stuck ở root hoặc TLD → firewall/ISP chặn UDP 53 outbound, thử port 853 (DoT) hoặc 443 (DoH)."
  }
}
```

✅ `whyBreaks` biến concept thành công cụ debug
✅ `observeWith` chỉ rõ 3 điểm cần nhìn, không mơ hồ

## 3. Before/After — Try at home

### v1

```json
{ "why": "Hiểu TTL cache thực tế", "cmd": "dig example.com; sleep 5; dig example.com" }
```

### v2

```json
{
  "why": "Hiểu TTL cache thực tế — xem cache hoạt động từ góc nhìn resolver.",
  "cmd": "dig example.com | grep -A1 'ANSWER SECTION'; sleep 5; dig example.com | grep -A1 'ANSWER SECTION'",
  "observeWith": "So sánh cột TTL ở 2 output. Lần 1 TTL=3600 (vừa fetch), lần 2 TTL≈3595 (resolver đã đếm ngược 5s). Nếu TTL KHÔNG giảm → bạn đang chạy qua 2 resolver khác nhau (ví dụ systemd-resolved cache local + upstream khác). Thử `dig +nocookie @1.1.1.1 example.com` 2 lần để cô lập 1 resolver duy nhất."
}
```

## 4. Block MỚI — `misconceptions` ở đầu lab

```json
"misconceptions": [
  "❌ 'DNS chỉ trả IP của domain' — thực ra có ≥10 record type: A, AAAA, CNAME, MX, TXT, NS, PTR, SOA, SRV, CAA. Debug email = TXT. Debug subdomain = CNAME. Debug anti-spam = PTR.",
  "❌ 'TTL là thời gian domain sống' — sai. TTL là thời gian RESOLVER được cache record. Đổi IP mà TTL=86400 = phải chờ tới 24h cho resolver trên thế giới hết cache.",
  "❌ 'nslookup và dig như nhau' — sai. nslookup ẩn TTL, flag, timing; dig show hết. Debug production LUÔN dùng dig, không dùng nslookup."
]
```

Hiển thị ở đầu lab, background vàng nhạt — "**Đọc trước khi học**: nếu bạn đang nghĩ theo các cách dưới đây, chỉnh lại trước khi vào bài."

## 5. Block MỚI — `vpsExercise` (chỉ ở lab cuối module networking)

```json
"vpsExercise": {
  "title": "Trace DNS end-to-end trên VPS + giả lập 2 resolver",
  "prerequisites": ["VPS Ubuntu 22.04+", "Cài sẵn: dig, dnsmasq, tcpdump"],
  "steps": [
    "1) SSH vào VPS. Chạy `sudo tcpdump -i any port 53 -n` ở tab 1.",
    "2) Tab 2: `dig @8.8.8.8 google.com`. Đếm số packet ở tab 1 — nên thấy 1 query UDP đi, 1 response về.",
    "3) Tab 2: `dig @8.8.8.8 google.com` lần 2 ngay lập tức. Vẫn thấy packet? Có — vì resolver phía bạn không cache, 8.8.8.8 cache ở phía Google.",
    "4) Cài dnsmasq local: `sudo apt install dnsmasq -y`, config `/etc/dnsmasq.conf` thêm `port=5353` (tránh đụng systemd-resolved), restart.",
    "5) Tab 2: `dig @127.0.0.1 -p 5353 google.com` — lần 1 sẽ chậm (dnsmasq phải đi hỏi upstream), lần 2 sẽ rất nhanh (dnsmasq cache rồi). Xác nhận bằng `Query time:` trong output dig.",
    "6) Tab 1 tcpdump nhìn traffic lúc này: lần 1 có traffic ra upstream (port 53 ngoài), lần 2 chỉ có loopback traffic port 5353 — resolver tự trả lời."
  ],
  "deliverable": [
    "Q1: Tại sao lần 2 `dig @8.8.8.8` vẫn thấy traffic ở tcpdump, dù 8.8.8.8 đã cache?",
    "Q2: TTL bạn nhận được ở lần 1 và lần 2 (qua dnsmasq) khác nhau thế nào? Giải thích.",
    "Q3: Nếu bạn muốn giả lập 'authoritative server hỏng' — dnsmasq sẽ trả gì cho client? SERVFAIL hay NXDOMAIN? Test bằng cách thêm `server=/broken.test/10.255.255.255` vào dnsmasq config."
  ],
  "tearDown": "sudo systemctl stop dnsmasq; sudo apt remove dnsmasq -y"
}
```

**Tại sao bài này phù hợp 1-VPS**:
- Không cần máy #2 — loopback + dnsmasq làm "resolver thứ 2"
- Dùng `tcpdump -i any` để *thấy* query đi đâu — đúng tinh thần SEE-IT-ON-VPS
- Deliverable là 3 câu hỏi quan sát, không phải "cài cái gì" — ép suy luận, không ép gõ

## 6. Checklist khi viết 1 lab theo v2

Viết xong, self-check:

- [ ] Mỗi TL;DR row có cả `why` và `whyBreaks`?
- [ ] Mỗi walkthrough step có `why`, `whyBreaks`, `observeWith` (cmd + lookAt)?
- [ ] Mỗi `tryAtHome` có `observeWith` nói RÕ nhìn vào cột/flag nào?
- [ ] Mỗi quiz option sai có giải thích sai ở đâu (không chỉ "đáp án A đúng")?
- [ ] Lab cuối module có `vpsExercise` dùng netns/docker/loopback, không yêu cầu VPS #2?
- [ ] Console khi mở lab không còn warning `[lab] ... missing ...`?

## 7. Ước lượng công sức migrate

| Việc | Effort |
|------|--------|
| Cập nhật `lab-template.js` thêm warn rules mới | 30 phút |
| Cập nhật `lab-template.css` render `whyBreaks` + `observeWith` callout | 1 giờ |
| Migrate 8 lab networking (viết thêm `whyBreaks` + `observeWith`) | ~30 phút/lab × 8 = 4 giờ |
| Viết `vpsExercise` cho 8 module | ~1 giờ/module × 8 = 8 giờ |
| Cập nhật `labs/README.md` + top-level `README.md` | 30 phút |
| **Tổng** | **~14 giờ** (chia nhỏ được — migrate 1 lab/ngày trong 2 tuần) |

## 8. Khuyến nghị

1. **Làm lab DNS trước** (refactor file `08-dns.html`) — dùng làm reference cho các lab sau.
2. **Chưa migrate labs khác** cho tới khi bạn xem UX thật của lab DNS v2 trên browser, thấy ổn mới nhân rộng.
3. Khi migrate 7 lab còn lại, có thể giao từng cái cho agent `fullstack-developer` kèm reference là `sample-lab-dns-refactored.md` này — tiết kiệm thời gian.
