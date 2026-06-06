---
phase: 8
status: completed-partial
priority: high
estimated_hours: 0.5
depends_on: [7]
---

# Phase 08 — Smoke Test + Typecheck + Build

## Goal

Validation gate cuối: typecheck + build xanh, manual smoke test desktop + mobile + upload pcap.

## Steps

### 1. Static checks

```bash
pnpm --dir app run typecheck
pnpm --dir app run build
```

Both must exit 0. Fix lỗi trước khi tiếp tục.

### 2. Dev server smoke

```bash
pnpm run dev:server          # terminal 1
pnpm --dir app run dev       # terminal 2
```

Open `http://localhost:5173`.

### 3. Manual smoke checklist

**Lab `icmp-ping`:**
- [ ] Navigate `/lab/icmp-ping`
- [ ] Tab THINK: misconceptions section render mới (2 item tcpdump-related)
- [ ] Tab THINK: TLDR có entry tcpdump
- [ ] Tab SEE: visualizer cũ vẫn render
- [ ] Tab SEE: section "tcpdump capture" hiển thị PacketDecoder
- [ ] Click packet 0 → layer tree show Ethernet/IPv4/ICMP
- [ ] Click field "Source IP" → bytes highlight đúng range trong hex
- [ ] Switch tab "Upload .pcap" → drop zone visible
- [ ] Drag file pcap thật từ Linux (`tcpdump -c 2 icmp -w x.pcap`) → render OK
- [ ] Drag file .txt → toast "Không phải file PCAP hợp lệ"
- [ ] Tab TRY IT: 3 commands tcpdump hiển thị trong try_at_home
- [ ] Quiz: câu hỏi BPF filter có trong list

**Lab `http`:**
- [ ] Navigate `/lab/http`
- [ ] Tab SEE: PacketDecoder render với 5 packets
- [ ] Click packet HTTP GET → expand TCP + HTTP layer
- [ ] Click field HTTP request line → highlight payload bytes
- [ ] Tab TRY IT: command `-w /tmp/http.pcap` có
- [ ] Quiz tcpdump+HTTPS có

**Mobile (Chrome DevTools 375px iPhone SE):**
- [ ] Layout 3 panel stack vertical
- [ ] Hex view collapsed default, click `<details>` mở
- [ ] Summary list scrollable max-h-48
- [ ] Không scroll horizontal layout (hex view OK overflow nhỏ)

**Search (Meilisearch):**
- [ ] Top bar search "tcpdump" → 2 lab hiện
- [ ] Search "BPF filter" → ít nhất icmp-ping hoặc http xuất hiện

### 4. Bundle size check

```bash
pnpm --dir app run build
ls -la app/dist/assets/*.js | sort -k5 -n
```

Compare với baseline trước khi implement. Phình thêm < 30 KB acceptable.

### 5. Sanity DB

```bash
mongosh hoccloud --eval 'db.labs.findOne({slug:"icmp-ping"},{try_at_home:1, misconceptions:1}).try_at_home'
```

Verify entries tcpdump có.

## Failure Recovery

| Symptom | Action |
|---------|--------|
| Typecheck fail | Fix types ở component vi phạm; KHÔNG cast `as any` |
| Build fail | Đọc Vite error stack; thường thiếu import |
| Decoder không render | Check console error; verify `defaultPackets` không empty |
| Upload không work | Check FileReader API support, blob size guard |
| Mobile overflow | Adjust grid `grid-cols-1 md:grid-cols-3` |
| Mongo content không sync Meilisearch | Check post-save hook trong `lab-model.js`; rerun `server/db/sync-search-index.js` |

## Success Criteria

- [ ] Typecheck + build xanh
- [ ] Tất cả smoke checklist pass
- [ ] Bundle delta < 30 KB
- [ ] Không regression UI lab khác (spot check 1 lab khác như `dns`, `arp`)

## Sign-off

Khi tất cả pass → update `plan.md` status `pending` → `completed`. Run `/ck:journal` để ghi nhận.
