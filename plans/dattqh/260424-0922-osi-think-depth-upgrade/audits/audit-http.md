# Audit — Tìm hiểu HTTP (http)

## Gap Scores

| Dimension | Score (0–2) | Evidence |
|-----------|-------------|---------|
| M Misconceptions | 2 | Field missing entirely |
| T TL;DR depth | 1 | 11 rows; mechanics explained well; 0 RFC 9110/9112 cites on protocol claims |
| W Walkthrough depth | 1 | step[1].why uses `<code>curl -v</code>` (HTML tag in content); step[4].why uses `<code>openssl s_client</code>` — HTML already in field; no RFC 9110 cites |
| C Cite coverage | 2 | 0/11 tldr rows cite RFC 9110/9112; 0/7 walkthrough steps cite RFC on protocol claims |
| B Banned phrases | 0 | No violations found |
| **Total** | **6 / 10** | |

## Priority: High

## Specific Violations

### TL;DR
- tldr[0].why (Request): "4 thành phần này là tất cả những gì server cần để xử lý yêu cầu." — HTTP request structure defined RFC 9110 §6 / RFC 9112 §3, uncited
- tldr[1].why (Response): "Status code nói 'chuyện gì xảy ra'. Header nói 'như thế nào'. Body là kết quả." — analogy-heavy; RFC 9110 §15 defines status code semantics, uncited
- tldr[4].why (3xx): "301 Permanent redirect: browser/bot sẽ cache và không hỏi lại. 302 Temporary: không cache." — redirect caching semantics defined RFC 9110 §15.4.2/15.4.3, uncited
- tldr[7].why (HTTP/1.1): "Keep-alive cho phép dùng lại TCP conn nhưng vẫn phải đợi response trước mới gửi request tiếp (pipelining broken trong thực tế). 6 conn/domain là workaround browser hay dùng." — persistent connections RFC 9112 §9.3; "6 conn/domain" is browser heuristic with no cite
- tldr[8].why (HTTP/2): "Multiplexing = nhiều request song song trên 1 TCP conn. HPACK nén header giảm overhead. Cùng resource, HTTP/2 nhanh hơn H1 ~30-50% trên nhiều asset." — HTTP/2 defined RFC 9113; HPACK defined RFC 7541; "~30-50%" performance claim unsourced
- tldr[9].why (HTTPS): "TLS làm 2 việc: (1) mã hoá để không bị nghe lén, (2) xác thực domain để không bị MITM." — no RFC 8446 (TLS 1.3) cite
- tldr[10].why (TLS handshake): "Handshake tạo shared secret mà không truyền key qua dây (ECDHE)." — TLS handshake defined RFC 8446 §4, uncited

### Walkthrough
- step[1].why: "Dev thường chỉ thấy code, không thấy raw request. `<code>curl -v</code>` hiện chính xác bytes gửi đi." — HTML tag `<code>` present in why field; should be plain text or markdown backtick
- step[4].why: "Khi thấy 'certificate verify failed' cần biết cert của CA nào, expire lúc nào, SAN có match domain không. `<code>openssl s_client</code>` cho tất cả thông tin này" — HTML tag `<code>` in why field; TLS cert validation RFC 9110 §4.3.4 uncited
- step[3].why: "HTTP/2 không tự động dùng — server phải hỗ trợ và negotiate qua ALPN trong TLS handshake." — ALPN defined RFC 7301, uncited

## Misconception Candidates (3–5)

1. wrong: "HTTP/2 tự động bật khi upgrade nginx" → right: "HTTP/2 yêu cầu thêm `http2` vào listen directive và negotiate qua ALPN (RFC 7301) trong TLS handshake; không có TLS = không có HTTP/2 trong thực tế vì browser chỉ hỗ trợ HTTP/2 over TLS" — why it matters: deploy nginx mới không thấy H2 vì thiếu config
2. wrong: "301 redirect có thể rollback dễ dàng" → right: "301 được browser cache vĩnh viễn (cho đến khi user clear cache); một khi đã cache, browser không hỏi lại server — không thể force-expire từ server side" (RFC 9110 §15.4.2) — why it matters: redirect sai dùng 301 thay 302 = khó rollback
3. wrong: "4xx là lỗi server" → right: "4xx là lỗi do client request sai (sai format, thiếu auth, không có quyền, không tìm thấy); 5xx mới là lỗi server; debug 4xx = fix request, không restart server" (RFC 9110 §15.5/15.6) — why it matters: dev restart server khi gặp 401/404 là sai hướng hoàn toàn
4. wrong: "HTTPS chỉ encrypt data, không làm gì khác" → right: "TLS làm 2 việc riêng biệt: (1) confidentiality — encrypt payload; (2) authentication — xác thực certificate để chống MITM; thiếu certificate validation = encrypt nhưng vẫn có thể bị MITM" (RFC 8446 §1) — why it matters: self-signed cert accept blindly vẫn vulnerable MITM
5. wrong: "HTTP keep-alive và HTTP/2 multiplexing là cùng khái niệm" → right: "Keep-alive (HTTP/1.1) reuse TCP connection nhưng vẫn serialize request (1 request/response tại 1 thời điểm); HTTP/2 multiplexing cho phép nhiều stream song song trên 1 TCP connection, không blocking" (RFC 9113 §5) — why it matters: nhầm lẫn dẫn đến không biết khi nào cần upgrade lên H2

## RFC References Needed

| Claim | RFC/ISO |
|-------|---------|
| HTTP request/response message format | RFC 9110 §6, RFC 9112 §3 |
| Status code semantics (2xx/3xx/4xx/5xx) | RFC 9110 §15 |
| 301 vs 302 redirect caching | RFC 9110 §15.4.2–15.4.3 |
| Persistent connections (keep-alive) | RFC 9112 §9.3 |
| HTTP/2 multiplexing, HPACK | RFC 9113, RFC 7541 |
| ALPN protocol negotiation | RFC 7301 |
| TLS 1.3 handshake + ECDHE | RFC 8446 §4 |
| Certificate SAN validation | RFC 9110 §4.3.4 |

## Phase 5 Scope Estimate

- misconceptions: 5 items to draft
- tldr rows to rewrite: 7 / 11 (tldr[0,1,4,7,8,9,10] — add RFC cites; fix "~30-50%" unsourced claim)
- walkthrough steps to rewrite: 3 / 7 (step[1,3,4] — strip HTML tags from why field, add RFC cites)
- Estimated effort: 0.75h
