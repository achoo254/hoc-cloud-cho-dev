---
phase: 7
status: pending
priority: high
estimated_hours: 1
depends_on: [6]
---

# Phase 07 — MongoDB Content Update Script

## Goal

Cập nhật content 2 lab `icmp-ping` & `http` trong MongoDB: thêm `try_at_home`, `misconceptions`, `tldr`, `walkthrough`, `quiz`, `flashcards` về tcpdump. Post-save hook tự sync Meilisearch.

## Files Created

- `server/scripts/update-lab-tcpdump.js`

## Files Read (no modify)

- `server/db/models/lab-model.js` — confirm post-save hook sync Meilisearch
- `server/db/mongo-client.js` — connection helper

## Script Skeleton

```js
// server/scripts/update-lab-tcpdump.js
import 'dotenv/config'
import { connectMongo } from '../db/mongo-client.js'
import { LabModel } from '../db/models/lab-model.js'

const ICMP_ADDITIONS = {
  try_at_home: [
    { cmd: 'tcpdump -i any -n icmp', why: 'Bắt mọi gói ICMP trên mọi interface, không resolve DNS', observeWith: 'Chạy `ping 8.8.8.8` ở terminal khác' },
    { cmd: 'tcpdump -i any -n -X icmp', why: '`-X` in payload dạng hex+ASCII, thấy data ping', observeWith: 'Quan sát pattern timestamp trong payload' },
    { cmd: "tcpdump -i any -n 'icmp and host 8.8.8.8'", why: 'Filter BPF combine: chỉ ICMP đi/đến 8.8.8.8', observeWith: 'Verify request → reply chạy đúng cặp' },
  ],
  misconceptions: [
    { wrong: 'tcpdump tự bắt mọi interface', right: 'Mặc định 1 interface đầu; cần `-i any` để bắt tất cả', why: 'libpcap cần explicit interface, `any` là pseudo-device Linux' },
    { wrong: 'tcpdump bắt được loopback ngay', right: 'Loopback cần `-i lo` hoặc `-i any`; `-i eth0` không thấy ping 127.0.0.1', why: 'Traffic loopback đi qua interface `lo`, không qua NIC vật lý' },
  ],
  tldr_append: [
    { term: 'tcpdump', short: 'CLI sniffer dùng BPF filter (`icmp`, `tcp port 80`); cờ phổ biến `-i`, `-n`, `-X`, `-w`, `-r`', why: 'Tool chuẩn debug network Linux; output cột timestamp/proto/src→dst' },
  ],
  walkthrough_append: [
    { step: 'Quan sát ping bằng tcpdump', detail: 'Chạy `tcpdump -i any -n icmp` rồi `ping -c 1 8.8.8.8`. Mapping cột tcpdump ↔ field IP/ICMP header (timestamp, src, dst, type, id, seq)' },
  ],
  quiz_append: [
    {
      question: 'Filter BPF nào bắt được CẢ ICMP echo request và echo reply?',
      options: ['icmp', 'icmp[icmptype] == 8', 'icmp[icmptype] == 0', "host 8.8.8.8 and tcp"],
      correct: 0,
      why: '`icmp` không filter type → bắt cả request (type 8) lẫn reply (type 0)',
    },
  ],
  flashcards_append: [
    { front: 'Cờ `-X` trong tcpdump làm gì?', back: 'In payload dạng hex + ASCII bên cạnh header summary' },
  ],
}

const HTTP_ADDITIONS = {
  try_at_home: [
    { cmd: "tcpdump -i any -n -A 'tcp port 80'", why: '`-A` in payload ASCII → đọc HTTP request/response thô', observeWith: '`curl http://example.com` ở terminal khác' },
    { cmd: "tcpdump -i any -n -s0 -w /tmp/http.pcap 'tcp port 80'", why: '`-s0` capture full packet (không truncate), `-w` ghi ra file để mở Wireshark', observeWith: 'Sau đó `tcpdump -r /tmp/http.pcap` đọc lại' },
    { cmd: "tcpdump -i any -n 'tcp[tcpflags] & tcp-syn != 0'", why: 'Filter SYN packet để debug 3-way handshake', observeWith: 'Đếm số SYN khi browser load 1 trang' },
  ],
  misconceptions: [
    { wrong: 'tcpdump thấy được HTTPS plaintext', right: 'HTTPS encrypted với TLS; tcpdump chỉ thấy TLS records, không thấy GET/POST', why: 'Cần SSLKEYLOGFILE + Wireshark để decrypt; tcpdump không decrypt' },
    { wrong: '`tcp port 80` đủ bắt mọi HTTP', right: 'HTTP có thể trên port 8080, 8000, 3000…; cần filter port cụ thể', why: 'Port 80 là default nhưng app dev thường dùng port khác' },
  ],
  tldr_append: [
    { term: 'tcpdump + HTTP', short: 'Dùng `-A` để in ASCII payload, `tcp port 80` filter chính, kết hợp `-w` lưu pcap mở Wireshark', why: 'HTTP plaintext nên đọc được trực tiếp; HTTPS thì không' },
  ],
  walkthrough_append: [
    { step: 'Bắt 1 HTTP GET với tcpdump', detail: '`tcpdump -i any -n -A "tcp port 80"` + `curl http://example.com`. Mapping: 3-way handshake (SYN, SYN-ACK, ACK) → GET request → 200 OK response → FIN' },
  ],
  quiz_append: [
    {
      question: 'Vì sao tcpdump KHÔNG thấy được HTTP body khi truy cập https://example.com?',
      options: ['Vì HTTPS dùng UDP', 'Vì payload mã hoá TLS', 'Vì tcpdump chặn HTTPS', 'Vì port 443 không hỗ trợ'],
      correct: 1,
      why: 'TLS mã hoá toàn bộ application data; tcpdump chỉ thấy TLS handshake + ciphertext',
    },
  ],
  flashcards_append: [
    { front: 'Filter BPF chỉ bắt SYN packet?', back: '`tcp[tcpflags] & tcp-syn != 0`' },
  ],
}

async function main() {
  await connectMongo()
  for (const slug of ['icmp-ping', 'http']) {
    const lab = await LabModel.findOne({ slug })
    if (!lab) { console.error(`Lab ${slug} not found`); continue }
    const additions = slug === 'icmp-ping' ? ICMP_ADDITIONS : HTTP_ADDITIONS

    // Idempotent: skip if already merged (check sentinel)
    if (lab.try_at_home.some(t => t.cmd?.startsWith('tcpdump'))) {
      console.log(`${slug}: tcpdump content already present, skipping`)
      continue
    }

    lab.try_at_home.push(...additions.try_at_home)
    lab.misconceptions.push(...additions.misconceptions)
    lab.tldr.push(...additions.tldr_append)
    lab.walkthrough.push(...additions.walkthrough_append)
    lab.quiz.push(...additions.quiz_append)
    lab.flashcards.push(...additions.flashcards_append)
    lab.updated_at = Math.floor(Date.now() / 1000)
    // content_hash sẽ tự update qua pre-save hook nếu có; nếu không, set thủ công

    await lab.save() // post-save hook auto-sync Meilisearch
    console.log(`${slug}: updated`)
  }
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
```

## Implementation Steps

1. Read `server/db/models/lab-model.js` — verify field names khớp với schema v3 (đặc biệt `tldr` shape: `{ term, short, why }` đúng không, `quiz` có dùng `options/correct/why` đúng không)
2. Adjust ICMP_ADDITIONS/HTTP_ADDITIONS shape theo Mongoose schema thật (KHÔNG đoán)
3. Test connection: `node server/scripts/update-lab-tcpdump.js` trên local Mongo
4. Verify trong Mongo shell: `db.labs.findOne({slug: 'icmp-ping'}, {try_at_home: 1})`
5. Verify Meilisearch: `curl 'http://localhost:7700/indexes/labs/search?q=tcpdump'`

## Idempotency

Sentinel check: nếu lab đã có entry `try_at_home` start với "tcpdump" → skip. Cho phép re-run an toàn.

## Success Criteria

- [ ] Script chạy không error
- [ ] `db.labs.findOne({slug: 'icmp-ping'}).try_at_home.length` tăng đúng 3
- [ ] Meilisearch search "tcpdump" trả 2 lab (icmp-ping, http)
- [ ] FE catalog page render lab vẫn OK (không break do schema mismatch)
- [ ] Re-run script → "already present, skipping"

## Risks

- Schema field mismatch (vd `tldr_append` shape sai) → MUST read lab-model.js trước khi run
- `content_hash` cần regenerate → check pre-save hook trong model; nếu không có, tính bằng `crypto.createHash('sha256').update(JSON.stringify(...))`
- Mongo connection string env: `.env` chứa `MONGO_URI` — verify trước khi chạy
