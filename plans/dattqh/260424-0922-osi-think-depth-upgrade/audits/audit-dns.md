# Audit — Tìm hiểu giao thức DNS (dns)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 2 | 12 rows; only tldr[6] (A/AAAA) and tldr[7] (CNAME) have RFC cites. 10/12 rows make protocol claims with no cite |
| W Walkthrough depth | 1 | step[3].why references TTL and resolver cache behavior — no RFC 1034 §3.5 cite; most steps are tool-usage focused |
| C Cite coverage | 2 | 2/12 tldr rows have RFC cites; 0/7 walkthrough steps have RFC cites on protocol claims |
| B Banned phrases | 0 | No violations found |
| **Total** | **7 / 10** | |

## Priority: High

## Specific Violations

### TL;DR
- tldr[0].why (Stub resolver): "Adalah DNS client đơn giản nhất — nằm ngay trong OS. Nó không tự recursive, chỉ forward query tới recursive resolver được cấu hình." — stub resolver behavior defined in RFC 1034 §5.3.1, uncited
- tldr[1].why (Recursive resolver): "Đây là 'thám tử DNS' thật sự — nó tự đi hỏi Root → TLD → Authoritative thay cho client." — analogy "thám tử" is analogy-heavy framing; recursive resolution defined RFC 1034 §4.3.2, uncited
- tldr[2].why (Root server): "Đỉnh của cây DNS. Root chỉ biết 1 việc: TLD nào do nameserver nào quản lý." — root server delegation defined RFC 1034 §3.6, uncited; "hàng trăm anycast instance" — unsourced figure
- tldr[3].why (TLD): "Biết nameserver của từng domain trong TLD đó." — NS delegation mechanism RFC 1034 §3.6, uncited
- tldr[4].why (Authoritative): "Response từ đây có AA=1 (Authoritative Answer) trong DNS packet." — AA flag defined RFC 1035 §4.1.1, uncited
- tldr[5].why (TTL): "Số giây resolver được phép cache record trước khi phải hỏi lại authoritative." — TTL semantics RFC 1034 §3.5, uncited; "Best practice: hạ TTL 24h trước khi migration" — best practice claim without source
- tldr[9].why (TXT/SPF/DKIM): "SPF liệt kê server được phép gửi email thay domain, DKIM thêm chữ ký số, DMARC chỉ định policy xử lý email fail." — SPF=RFC 7208, DKIM=RFC 6376, DMARC=RFC 7489, all uncited
- tldr[10].why (Negative cache): "Khi domain không tồn tại, resolver cache lại kết quả NXDOMAIN theo TTL của SOA record." — negative caching defined RFC 2308 §3, uncited
- tldr[11].why (DoH): "Encrypt DNS query qua HTTPS port 443 — ISP không thấy domain đang được hỏi." — DoH defined RFC 8484, uncited

### Walkthrough
- step[1].why: "dig là công cụ debug DNS số 1. Hiểu output của dig = hiểu được DNS response thật, biết TTL còn bao nhiêu, ai là authoritative server." — no cite; "So sánh Query time: <5ms là cache hit, >50ms là fresh lookup" — thresholds unsourced
- step[2].why: "+trace bắt dig tự làm recursive từ root, không dùng cache của resolver." — no RFC 1034 cite on recursive resolution mechanics
- step[4].why: "TTL giảm mỗi lần hỏi (vì resolver cache đã có). Query lần 1 TTL=3600, query lần 2 vài phút sau TTL=3540." — TTL decrement behavior RFC 1034 §3.5, uncited

## Misconception Candidates (3–5)

1. wrong: "Stub resolver tự recursive đi hỏi Root/TLD/Authoritative" → right: "Stub resolver chỉ forward query đến recursive resolver đã cấu hình (/etc/resolv.conf); chỉ recursive resolver mới tự đi hỏi toàn bộ chain" (RFC 1034 §5.3.1) — why it matters: debug DNS failure phải kiểm tra đúng resolver, không nhầm vai trò
2. wrong: "Đổi A record là DNS thay đổi ngay lập tức trên toàn thế giới" → right: "Resolver cache record theo TTL của record hiện tại; nếu TTL=86400 khi đổi, user bị stuck tới 24h; chỉ dig +trace thấy record mới ngay" (RFC 1034 §3.5) — why it matters: không hạ TTL trước migration = downtime kéo dài
3. wrong: "CNAME có thể đặt ở apex domain (example.com)" → right: "CNAME ở zone apex vi phạm RFC 2181 §10.1 vì CNAME không được coexist với SOA/NS records; dùng ALIAS/ANAME record nếu cần" — why it matters: một số DNS provider allow CNAME apex → behavior undefined trên provider khác → website/email break
4. wrong: "NXDOMAIN nghĩa là domain không bao giờ tồn tại" → right: "NXDOMAIN chỉ nghĩa là domain không tồn tại TẠI THỜI ĐIỂM query; resolver cache NXDOMAIN theo negative TTL trong SOA record (RFC 2308 §3); tạo record rồi vẫn bị NXDOMAIN vài phút là bình thường" — why it matters: dev tạo DNS record xong test ngay bị lỗi, tưởng config sai
5. wrong: "Có 13 root server → DNS dễ bị tấn công vì ít server" → right: "13 là số địa chỉ IP (label a-m), nhưng mỗi địa chỉ dùng IP anycast có hàng trăm physical instance toàn cầu; total physical instances >1800 (xem root-servers.org)" — why it matters: hiểu anycast giúp giải thích tại sao DNS resilient

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| Stub resolver chỉ forward, không tự recursive | RFC 1034 §5.3.1 |
| Recursive resolution: Root → TLD → Authoritative | RFC 1034 §4.3.2 |
| Root server delegation mechanism | RFC 1034 §3.6 |
| TTL semantics và cache decrement | RFC 1034 §3.5 |
| AA=1 (Authoritative Answer) flag | RFC 1035 §4.1.1 |
| NXDOMAIN negative caching theo SOA minimum TTL | RFC 2308 §3 |
| CNAME không được coexist ở zone apex | RFC 2181 §10.1 |
| SPF | RFC 7208 |
| DKIM | RFC 6376 |
| DMARC | RFC 7489 |
| DNS over HTTPS (DoH) | RFC 8484 |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 9 / 12 (tldr[0,1,2,3,4,5,9,10,11] — add RFC cites; tldr[1] fix "thám tử" analogy framing)
- walkthrough steps to rewrite: 3 / 7 (step[1,2,4] — add RFC cites, fix unsourced thresholds)
- Estimated effort: 1h
