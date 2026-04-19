# Schema v2 Design — WHY + WHEN-IT-BREAKS + SEE-IT-ON-VPS

## 1. Schema đầy đủ

```jsonc
{
  "title": "DNS — Domain Name System",
  "module": "01-networking",
  "estimatedMinutes": 45,
  "prerequisites": ["udp", "ip-addressing"],

  // MỚI — ở đầu lab, trước TL;DR
  "misconceptions": [
    "Nghĩ DNS = A record (thực ra còn CNAME/MX/TXT/NS/PTR — mỗi loại giải quyết use-case khác)",
    "Nghĩ resolver = authoritative (hai vai hoàn toàn khác)",
    "Nghĩ TTL là 'thời gian domain sống' (không — là thời gian resolver được cache record)"
  ],

  // MỚI — neo concept vào stack
  "dependsOn": ["udp", "ip-routing"],
  "enables": ["http-browsing", "email-delivery", "tls-sni"],

  "tldr": [
    {
      "what": "Recursive resolver",
      "why": "Là 'thám tử DNS' — tự đi hỏi Root → TLD → Authoritative thay bạn.",
      "whyBreaks": "Resolver chết → mọi domain fail dù mạng OK. Triệu chứng: `ping 8.8.8.8` OK nhưng `ping google.com` báo 'name resolution failed'. Hay nhầm với stub resolver — stub chỉ forward, không tự recurse."
    }
    // ... mỗi row TL;DR BẮT BUỘC có cả why và whyBreaks
  ],

  "walkthrough": [
    {
      "step": 1,
      "what": "dig cơ bản",
      "why": "dig là công cụ debug DNS số 1 — hiểu output = đọc được DNS response thật.",
      "whyBreaks": "Không có dig → debug DNS = đoán mò. `nslookup` thiếu timing + flags chi tiết.",
      "code": "dig example.com",
      "observeWith": {
        "cmd": "dig example.com",
        "lookAt": "Dòng 'Query time: Xms' (latency thật), cột TTL trong ANSWER SECTION (giảm dần mỗi lần hỏi lại = cache đang work), flag 'aa' (authoritative answer) có xuất hiện không"
      }
    }
    // ... mỗi walkthrough step BẮT BUỘC có observeWith
  ],

  "quiz": [
    {
      "q": "...",
      "options": ["..."],
      "correct": 0,
      "whyCorrect": "...",
      "whyOthersWrong": { "1": "...", "2": "...", "3": "..." }
    }
  ],

  "flashcards": [
    { "front": "...", "back": "...", "why": "..." }
  ],

  "tryAtHome": [
    {
      "why": "...",
      "cmd": "...",
      "observeWith": "Nhìn vào ... — nếu thấy X nghĩa là ..., nếu thấy Y nghĩa là ..."
    }
  ],

  // MỚI — chỉ ở lab CUỐI module (ví dụ 08-dns.html là lab cuối module networking)
  "vpsExercise": {
    "title": "Trace DNS end-to-end trên VPS",
    "steps": ["..."],
    "deliverable": "Trả lời 3 câu hỏi cuối bài"
  }
}
```

## 2. So sánh v1 vs v2

| Trường | v1 | v2 |
|--------|----|----|
| `why` | ✅ bắt buộc | ✅ giữ nguyên |
| `whyBreaks` | ❌ | ✅ **bắt buộc** ở TL;DR + walkthrough |
| `observeWith` | ❌ | ✅ **bắt buộc** ở walkthrough + tryAtHome |
| `misconceptions` | ❌ | ⭕ optional nhưng khuyến khích (lab mở đầu) |
| `dependsOn` / `enables` | ❌ | ⭕ optional (1 dòng) |
| `estimatedMinutes` | ❌ | ⭕ optional |
| `prerequisites` | ❌ | ⭕ optional |
| `vpsExercise` | ❌ | ⭕ chỉ có ở lab cuối module |
| `quiz.whyCorrect/whyOthersWrong` | ✅ | ✅ giữ nguyên |
| `flashcards.why` | ✅ | ✅ giữ nguyên |

**Warn logic ở `lab-template.js`:**
- Thiếu `why` → warn (như hiện tại)
- Thiếu `whyBreaks` ở TL;DR row → warn
- Thiếu `observeWith` ở walkthrough step → warn
- Không có `observeWith` ở tryAtHome → warn (vì gõ lệnh mà không biết nhìn đâu = vô ích)

## 3. Chiến lược single-VPS

Vì chỉ có 1 VPS, mọi bài tập "multi-host" phải giả lập. Ba công cụ chính:

### 3.1. `ip netns` — network namespace của Linux kernel

Tạo "máy ảo network" chỉ dùng kernel, rất nhẹ (<1 MB/namespace):

```bash
# Tạo 2 "host" giả lập
sudo ip netns add host-a
sudo ip netns add host-b

# Tạo veth pair nối 2 host
sudo ip link add veth-a type veth peer name veth-b
sudo ip link set veth-a netns host-a
sudo ip link set veth-b netns host-b

# Gán IP, bật interface
sudo ip netns exec host-a ip addr add 10.0.0.1/24 dev veth-a
sudo ip netns exec host-a ip link set veth-a up
# ... tương tự host-b

# Chạy lệnh trong "host-a"
sudo ip netns exec host-a ping 10.0.0.2
```

**Dùng được cho**: ARP, ICMP, routing, TCP/UDP flow, DHCP server giả, site-to-site VPN demo.

### 3.2. Docker bridge network

Đơn giản hơn netns, phù hợp topic Docker/app-level:

```bash
docker network create --subnet=172.20.0.0/16 lab-net
docker run --net=lab-net --ip=172.20.0.10 --name=alice alpine sleep infinity
docker run --net=lab-net --ip=172.20.0.20 --name=bob alpine sleep infinity

docker exec alice ping 172.20.0.20
```

**Dùng được cho**: HTTP flow, reverse proxy, service discovery, Prometheus scraping, Loki log pipeline.

### 3.3. Loopback tricks + `tcpdump -i any`

Nhiều concept (DNS resolver, HTTP server, TLS) chỉ cần 1 process → quan sát bằng `tcpdump` trên loopback:

```bash
# Chạy DNS server local
dnsmasq -d --port=5353 &
# Quan sát query
sudo tcpdump -i lo port 5353 -vv
# Gửi query
dig @127.0.0.1 -p 5353 google.com
```

### 3.4. Gợi ý mapping module → công cụ

| Module | Công cụ chính | Ví dụ vps-exercise |
|--------|---------------|---------------------|
| 01 Networking | `ip netns` + `tcpdump` | 2 netns ping qua veth, ARP table, DNS trace |
| 02 Linux | VPS thật trực tiếp | sshd harden + fail2ban, netplan, cron |
| 03 Docker | Docker network | 2 container cùng net, nslookup service name |
| 04 Python sysadmin | VPS thật | chạy disk-alert.py + parse-auth-log.py |
| 05 Ansible | `localhost` + docker containers làm target | playbook apply vào 3 container |
| 06 Monitoring | Docker compose | Prometheus scrape 2 container metric endpoint |
| 07 Logging | Docker compose | Loki + Promtail trên 3 container log khác nhau |
| 08 CI/CD | GitHub Actions + VPS deploy target | pipeline build → push image → SSH deploy |

## 4. Strict warning rules (lab-template.js thay đổi)

```js
// Pseudo — cần implement trong lab-template.js
function validateLabData(data) {
  const warnings = [];

  data.tldr.forEach((row, i) => {
    if (!row.why) warnings.push(`tldr[${i}] missing 'why'`);
    if (!row.whyBreaks) warnings.push(`tldr[${i}] missing 'whyBreaks'`);
  });

  data.walkthrough.forEach((step, i) => {
    if (!step.why) warnings.push(`walkthrough[${i}] missing 'why'`);
    if (!step.whyBreaks) warnings.push(`walkthrough[${i}] missing 'whyBreaks'`);
    if (!step.observeWith) warnings.push(`walkthrough[${i}] missing 'observeWith'`);
  });

  data.tryAtHome.forEach((item, i) => {
    if (!item.observeWith) warnings.push(`tryAtHome[${i}] missing 'observeWith'`);
  });

  // Quiz + flashcards giữ rule cũ
  warnings.forEach(w => console.warn(`[lab] ${w}`));
}
```

## 5. UI rendering (gợi ý cho lab-template.css)

- `whyBreaks` hiển thị dạng callout đỏ nhạt (như warning), icon ⚠️
- `observeWith` hiển thị dạng callout xanh (info), icon 👁️ — ngay dưới code block
- `misconceptions` ở đầu lab, dạng numbered list, background vàng nhạt — "Đọc trước khi học"
- `dependsOn` / `enables` — 2 badge nhỏ ở hero section: "← cần biết: udp" / "→ dùng cho: http"
- Toggle **💡 Ẩn WHY** hiện tại nên mở rộng: "💡 Ẩn WHY/BREAKS/OBSERVE" — 3 nút độc lập để test từng lớp

## 6. Open questions

1. `whyBreaks` có nên tách thành 2 trường con (`whenFails` — triệu chứng + `whyConfused` — hay nhầm với gì) không? Hiện gộp làm 1 để đỡ nặng viết lab, nhưng có thể cần tách nếu thực tế dùng thấy lẫn lộn.
2. `observeWith` ở mỗi walkthrough step — có trùng với `tryAtHome` không? Ranh giới: `observeWith` ở walkthrough = "quan sát ngay trong lab để confirm lý thuyết", `tryAtHome` = "bài tập rộng hơn, tự làm trên VPS".
3. Lab UI: có cần thêm **panel "Giả lập trên VPS"** riêng (show snippet copy-paste `ip netns` hoặc `docker run`) không? Hay để trong `vpsExercise` cuối module là đủ?
