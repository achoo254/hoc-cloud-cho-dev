# Positioning Shift — "Dev Deploy-Ready"

> Addendum bổ sung vào schema v2 sau khi chốt positioning chính xác: **dev học đủ sâu để triển khai dịch vụ trên cloud, không thay thế sysadmin/devops**.

## 1. Phổ positioning

```
[dev muốn hiểu]           [dev DEPLOY-READY]           [devops fulltime]
  "biết là gì"       →      "deploy + vận hành          →   "thiết kế infra,
                             cơ bản, gọi tên               tune kernel,
                             vấn đề với ops"              build HA cluster"
```

**Chúng ta ở đây: deploy-ready (cột giữa).** Nghĩa là dev học xong có thể:

- ✅ Tự tay đưa 1 app (backend/frontend) lên VPS hoặc managed service (Cloud Run, Fly.io, Render, Railway).
- ✅ Cấu hình DNS (A/CNAME/MX/TXT) ở registrar/Cloudflare cho domain thật.
- ✅ Dựng reverse proxy (Nginx/Caddy) + TLS (Let's Encrypt) trước app.
- ✅ Đọc log, xem metric cơ bản (Prometheus hoặc managed tương đương), biết app khoẻ hay không.
- ✅ Dựng CI/CD đơn giản (GitHub Actions → build → deploy).
- ✅ Khi gặp sự cố: phân biệt "lỗi app" vs "lỗi infra" vs "lỗi network" — biết gọi đúng tên và đủ vocabulary để làm việc với sysadmin nếu vấn đề vượt tầm.

Và **KHÔNG cần**:

- ❌ Tự chạy authoritative DNS server BIND9 cho company.
- ❌ Viết Ansible collection + role phức tạp, quản lý 50 server.
- ❌ Thiết kế mạng VPC multi-region, BGP peering, network policy sâu.
- ❌ Tune kernel (`sysctl`), viết systemd unit file phức tạp, build HA cluster from scratch.
- ❌ On-call 24/7, SLA 99.99%, chaos engineering.

## 2. Triết lý điều chỉnh

Ba chân kiềng cũ vẫn đúng, nhưng **thêm chân thứ 4: DEPLOY-READY**.

| Chân | Câu hỏi | Ví dụ (DNS) |
|------|---------|-------------|
| WHY | Tại sao tồn tại? | Dịch tên → IP để người nhớ được |
| WHEN-IT-BREAKS | Triệu chứng hỏng ở góc độ **người deploy**? | Đổi A record rồi nhưng user vẫn vào IP cũ → TTL cache |
| SEE-IT-ON-VPS | Verify bằng cách nào? | `dig @1.1.1.1 domain` + `dig @8.8.8.8 domain` so sánh |
| **DEPLOY-READY** | Khi triển khai thật, dev chạm concept ở đâu? | Set A record ở panel Cloudflare trỏ về VPS IP; set CNAME `www` → `@`; set MX cho email provider; set TXT SPF/DKIM/DMARC |

### Khác biệt quan trọng so với v2 cũ

**`whyBreaks` v2 cũ** có thể rơi vào bẫy "lỗi ops sâu" (BGP hijack, DNS amplification attack). Scope lại: **ưu tiên triệu chứng dev sẽ gặp khi deploy app**:
- App trả 502 Bad Gateway
- HTTPS cert không cấp được (Let's Encrypt rate limit, DNS-01 fail)
- Docker container restart loop
- Reverse proxy không forward đúng host
- Cron không chạy
- Disk đầy → service crash

Lỗi kernel panic, BGP, DNSSEC — mention nếu phù hợp nhưng không bắt buộc.

**`observeWith` v2 cũ** tập trung "quan sát concept". Mở rộng thêm **"verify sau deploy"**:
- Sau khi set A record → `dig +short domain` trả IP đúng chưa?
- Sau khi deploy container → `curl -I https://domain` trả 200 chưa?
- Sau khi cài cron → `sudo tail -f /var/log/syslog | grep CRON` có thấy chạy không?

Tức là `observeWith` không chỉ "xem concept hoạt động" mà còn "verify deployment đúng".

## 3. Trường JSON mới cần thêm

### `deploymentUse` — bắt buộc ở TL;DR

Mỗi concept TL;DR **phải** trả lời: "Khi deploy 1 app lên cloud, dev chạm concept này ở đâu, thao tác gì?"

```json
{
  "what": "TTL (Time To Live)",
  "why": "Thời gian resolver được cache record trước khi hỏi lại authoritative.",
  "whyBreaks": "Đổi IP rồi nhưng user vẫn vào IP cũ → TTL cache chưa hết. Nếu TTL=86400 thì phải chờ tới 24h.",
  "deploymentUse": "Trước khi migrate server (đổi A record), hạ TTL xuống 300s (5 phút) **ít nhất 24h trước migration**. Sau migration xong và ổn định, đặt lại 3600s để giảm DNS query."
}
```

### `cloudEquivalent` — optional nhưng khuyến khích

Mỗi concept "hạ tầng" có managed service tương đương trên cloud. Dev deploy-ready nên biết để chọn:

```json
{
  "what": "Authoritative DNS server (BIND9, PowerDNS)",
  "why": "Server cuối giữ record thật của domain.",
  "cloudEquivalent": {
    "selfHost": "BIND9 / PowerDNS (cần kinh nghiệm ops, rủi ro cao nếu sai config)",
    "managed": "Cloudflare DNS (free, nhanh nhất), Route53 (AWS, $0.50/zone), Google Cloud DNS",
    "recommendation": "Dev 99% nên dùng managed — tự host authoritative chỉ khi có lý do compliance đặc biệt."
  }
}
```

### `deployChecklist` — optional, ở `vpsExercise`

`vpsExercise` cuối module không chỉ là bài quan sát, mà phải **đi đến deployable outcome thật**. Thêm checklist:

```json
"vpsExercise": {
  "title": "Deploy 1 subdomain trỏ về VPS + verify",
  "deployChecklist": [
    "[ ] Đăng ký 1 domain thật (hoặc dùng sẵn)",
    "[ ] Set A record lab.yourdomain.com → VPS IP ở Cloudflare",
    "[ ] Verify bằng `dig +short lab.yourdomain.com @1.1.1.1` — phải trả đúng IP trong <5 phút",
    "[ ] Cài Caddy trên VPS, tạo config auto-TLS cho lab.yourdomain.com",
    "[ ] Verify `curl -I https://lab.yourdomain.com` trả 200 + cert Let's Encrypt hợp lệ",
    "[ ] Giải thích: tại sao Caddy tự xin được cert? DNS-01 hay HTTP-01 challenge?"
  ]
}
```

## 4. Impact lên các file đã viết

### `schema-v2-design.md`
Cần update bảng schema: thêm `deploymentUse` vào TL;DR (bắt buộc), `cloudEquivalent` (optional), `deployChecklist` vào vpsExercise.

### `sample-lab-dns-refactored.md`
Các block before/after vẫn đúng nhưng **chưa có `deploymentUse`**. Sample DNS cần thêm:
- `deploymentUse` cho 3-4 TL;DR row quan trọng (A record, TTL, CNAME, TXT)
- `cloudEquivalent` cho 1-2 concept (authoritative server, recursive resolver managed)
- `vpsExercise` reframe: không chỉ "giả lập 2 resolver bằng dnsmasq", mà **đi đến deploy 1 subdomain thật + auto-TLS**.

### `lab-template.js` warn rules
Thêm:
- TL;DR row thiếu `deploymentUse` → warn
- `vpsExercise` thiếu `deployChecklist` → warn (chỉ ở lab cuối module)

### Top-level `README.md`
Mục 4 "Triết lý WHY-first" → đổi title "WHY-first → Deploy-ready mindset" với 4 chân kiềng. Mục "Gợi ý cách học" thêm: *"Cuối mỗi module, làm được `vpsExercise` = bạn đã có kỹ năng deploy concept đó thật trên cloud."*

## 5. Ranh giới vẫn phải giữ

Để không trượt sang "devops fulltime", ràng buộc:

- **Không có lab Kubernetes sâu** — mention K8s concept nhưng không bắt dựng cluster. Nếu cần orchestration, dùng Docker Compose + reverse proxy là đủ cho dev deploy-ready.
- **Không có lab Terraform/IaC phức tạp** — Ansible module 05 đã chạm IaC cơ bản là đủ. Terraform để cho ai thực sự cần quản lý nhiều cloud resource.
- **Không có lab HA / replication** — PostgreSQL streaming replication, Redis Sentinel, multi-AZ = không.
- **Không có lab security hardening sâu** — SELinux policy, apparmor profile = không. Chỉ dừng ở firewall basic, SSH key, fail2ban, TLS — đủ cho deploy an toàn cơ bản.

## 6. Module roadmap re-evaluate

| Module | Điều chỉnh theo deploy-ready |
|--------|-------------------------------|
| 01 Networking | Giữ nguyên lý thuyết, thêm `deploymentUse` cho DNS/DHCP/HTTP. TCP/IP deep-dive giữ nhưng ghi rõ "hiểu để debug, không phải để implement". |
| 02 Linux | Giữ. Thêm nhấn mạnh: SSH key, sshd_config harden, systemd service đơn giản, cron — đủ dùng. |
| 03 Docker | Giữ, đây là module **cốt lõi** của deploy-ready — hầu hết dev deploy qua Docker. |
| 04 Python sysadmin | Giữ nhưng tinh giản — dev deploy-ready không cần viết CLI phức tạp, chỉ cần đọc/sửa script monitor/alert. |
| 05 Ansible | **Cân nhắc giảm scope** — giữ 1 playbook đủ triển khai stack (app + nginx + firewall) thay vì role/inventory phức tạp. Hoặc thay bằng chương "Shell script deploy" đơn giản hơn. |
| 06 Monitoring | Giữ, nhưng thêm cloud equivalent: Grafana Cloud free tier, Better Uptime, Sentry — nhiều dev deploy-ready dùng managed, không tự host. |
| 07 Logging | Giữ nhưng tương tự: thêm Loki Cloud, Datadog free tier, Papertrail. |
| 08 CI/CD | **Module quan trọng nhất cho deploy-ready.** Mở rộng thêm: deploy strategy (recreate vs rolling vs blue-green), rollback, secret management (GitHub Secrets, SOPS). |

## 7. Next step đề xuất sau khi chốt

1. Bạn xác nhận positioning này → mình update:
   - `schema-v2-design.md` thêm `deploymentUse` + `cloudEquivalent` vào schema chính
   - `sample-lab-dns-refactored.md` thêm block `deploymentUse` cho DNS lab (trước khi refactor HTML thật)
   - Cập nhật warn rules tương ứng
2. Review module roadmap (mục 6) — module 05 Ansible có giảm scope không? Hay giữ nguyên?
3. Sau khi chốt, mới bắt đầu implement code (`lab-template.js` + refactor lab DNS thật).

## 8. Open questions

1. **Managed vs self-host** — trong mỗi lab, nên dạy self-host trước rồi mention managed, hay song song? (Đề xuất: self-host trước để hiểu bản chất, managed cuối mục để biết khi nào dùng.)
2. **Lab có nên có bài "khi nào KHÔNG cần hiểu"** — ví dụ "Bạn không cần tự chạy authoritative DNS nếu đã dùng Cloudflare — chương này chỉ để hiểu cái họ làm giúp"? Giúp dev tiết kiệm thời gian, không bị overwhelm.
3. Domain thật cho `vpsExercise` — giả định user có sẵn domain hay cần hướng dẫn mua? Nên có 1 file `00-prerequisites.md` ở labs/ liệt kê: VPS + domain + Cloudflare account + Docker → mua/đăng ký 1 lần, dùng xuyên suốt.
