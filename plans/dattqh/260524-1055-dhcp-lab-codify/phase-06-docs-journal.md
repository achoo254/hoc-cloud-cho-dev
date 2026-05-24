# Phase 6 — Docs + Journal + Smoke Test

**Status**: pending
**Effort**: 1h
**Blocker**: Phase 4 + Phase 5

## Goal

Cập nhật docs project-level, viết journal entry, chạy smoke test FE để đảm bảo `lab.dhcp` render đúng + 2 sample button work end-to-end.

## Files to Modify / Create

```
docs/
├── project-changelog.md        # MODIFY — thêm entry 2026-05-24
├── project-roadmap.md          # MODIFY — đánh dấu DHCP lab codify done
└── journals/
    └── 2026-05-24-dhcp-vmware-lab-codify.md   # NEW
```

## Implementation Steps

### 1. Smoke Test FE

```bash
# Terminal 1: backend
pnpm run dev:server  # :8387

# Terminal 2: frontend
pnpm --dir app run dev  # :5173
```

Browser checks:
- Mở `http://localhost:5173/labs/dhcp` — page render không error
- THINK section: tldr 7 dòng (không đổi), 9 misconceptions (5 cũ + 4 mới)
- SEE section: 9 walkthrough steps, step 8 + 9 có code block hiển thị đúng
- TRY IT section: 9 try-at-home commands, copy-button work
- Playground: 2 sample button "Case A" + "Case B" hiển thị; click từng button load pcap + render packet list
- Drag-drop manual pcap từ `source/pcaps/` vào upload zone — verify parse work
- DevTools Console: không có Zod parse error, không có 404 cho `/sample-pcaps/*.pcap`

### 2. Typecheck + lint (toàn project)

```bash
pnpm --dir app run typecheck
# Optional nếu có lint script
pnpm --dir app run lint 2>/dev/null || true
```

### 3. Update `docs/project-changelog.md`

Append entry mới ở top (reverse-chronological):

```markdown
## 2026-05-24 — DHCP lab codify (VMware 2-client scenario)

**What**: Append 4 tryAtHome + 2 walkthrough steps + 4 misconceptions vào lab `dhcp`. Tích hợp 2 sample pcap (`case-a.pcap`, `case-b.pcap`) vào `DhcpPlayground` qua `PcapUploadZone`.

**Why**: Bổ sung kịch bản conflict 2-client thực tế (Case A=manual TRƯỚC + Case B=manual SAU) vào lab content. Học viên explore packet-level qua FE mà không cần dựng VM.

**Impact**:
- `lab.dhcp.tryAtHome` 5 → 9
- `lab.dhcp.walkthrough` 7 → 9
- `lab.dhcp.misconceptions` 5 → 9
- `app/public/sample-pcaps/dhcp-case-{a,b}.pcap` mới
- `dhcp-playground.tsx` integrate `<PcapUploadZone />`

**Refs**: `plans/dattqh/260524-1055-dhcp-lab-codify/`, `server/scripts/update-lab-dhcp-vmware-content.js`
```

### 4. Update `docs/project-roadmap.md`

Tìm section content/lab progress, đánh dấu DHCP lab enhancement done:

```markdown
## Content roadmap

| Lab | Status | Notes |
|---|---|---|
| dhcp | ✅ enhanced 2026-05-24 | 2-client conflict scenario + pcap samples |
| icmp-ping | ✅ tcpdump enhanced 2026-05-09 | sample pcap inline |
| http | ✅ tcpdump enhanced 2026-05-09 | sample pcap inline |
| ... | | |
```

(Format thực tế phụ thuộc roadmap hiện có; đọc trước khi edit)

### 5. Tạo journal entry

`docs/journals/2026-05-24-dhcp-vmware-lab-codify.md`:

```markdown
# DHCP VMware Lab Codify — 2-Client Conflict Scenario

**Date**: 2026-05-24
**Severity**: Low (content addition, no infra change)
**Component**: lab `dhcp` content + DhcpPlayground
**Status**: Resolved

---

## What Happened

3-phase brainstorm:
1. SSH lab kiểm tra hạ tầng 3 VM, thấy server `.128` setup OK (isc-dhcp-server active, dhcpd.conf range `.200-.201`, ping-check on, lease 120s/300s với systemd drop-in chạy as root). 2 client VM `.129/.130` đang OFFLINE — user boot lại.
2. So sánh với peer PR INET-Support/cloud-labs#3 (MinhVuDinh23): peer lab dnsmasq + 1 client + Server tự claim Gratuitous ARP → đáp ứng yêu cầu INET kém hơn (yêu cầu "+1 node client manual trùng IP"). User's lab có 2 client thực + ping-check + ARP flap → chính xác hơn.
3. Codify user's lab content vào app `dhcp` slug: +4 tryAtHome (systemd-run tcpdump, dhcpcd ép DISCOVER, Case A flow, Case B arping), +2 walkthrough steps (ping-check + ARP flap, full snippet), +4 misconceptions (CAP_NET_RAW silent fail, AF_PACKET bypass iptables, INIT-REBOOT cache, Linux netplan static không DAD).

Re-captured 2 pcap trong session sạch (case-A: ping-check ICMP probe → abandon IP → cấp IP khác; case-B: 2 MAC cùng claim IP, arping flap). Integrate sample buttons + `<PcapUploadZone />` vào DhcpPlayground.

---

## Key Decisions

- **2-client scenario của user → giữ nguyên** thay vì pull peer's 1-client + Gratuitous ARP. Lý do: đáp ứng yêu cầu nguyên văn INET "+1 node client set IP manual trùng IP với client DHCP trước đó".
- **Re-capture pcap** thay vì dùng `/tmp/case-*.pcap` từ session Agent kia. Lý do: tránh SSH noise, lease abandoned cũ trong DB.
- **Field name camelCase `tryAtHome`** trong update script — match Mongo schema. Defer fix mismatch với Zod `try_at_home` cho session sau.
- **Out-of-scope**: DHCP field-by-field protocol analysis (peer mạnh hơn ở mặt này — có thể bổ sung trong session tách riêng).

---

## The Brutal Truth

User's lab có 7 bẫy real-world debug (CAP_NET_RAW, AF_PACKET vs iptables, nftables netdev/ingress, INIT-REBOOT lease cache, networkd-dispatcher re-apply filter, sudo+heredoc, pool teo dần) — đây là điểm GIÁ TRỊ CỐT LÕI hiếm thấy trong lab content. Phải đảm bảo phần này không bị mất khi codify (đặc biệt CAP_NET_RAW vì rất subtle và silent fail).

Field-name mismatch `tryAtHome` (Mongo) vs `try_at_home` (Zod) là tech debt cũ — phát hiện lại trong session này. Nếu converter `toLabContent()` ở `server/api/labs-routes.js` không xử lý đúng → FE Zod parse fail im lặng. Phải verify smoke test browse `/labs/dhcp` trong Phase 6.

---

## Refs

- Plan: `plans/dattqh/260524-1055-dhcp-lab-codify/`
- Brainstorm: `plans/dattqh/reports/brainstorm-260524-1055-dhcp-lab-codify.md`
- Peer comparison: `plans/dattqh/reports/comparison-260524-1055-dhcp-lab-vs-peer-pr3.md`
- Update script: `server/scripts/update-lab-dhcp-vmware-content.js`
- Source archive: `plans/dattqh/260524-1055-dhcp-lab-codify/source/`
```

### 6. Update plan status

Sau khi 6 phases hoàn tất, edit `plans/dattqh/260524-1055-dhcp-lab-codify/plan.md`:
```yaml
status: completed   # was: pending
```

Mỗi phase file cũng cập nhật `Status: completed`.

## Acceptance Criteria

- [ ] Browse `/labs/dhcp` trên FE render không error, DevTools Console clean
- [ ] 9 tryAtHome / 9 walkthrough / 9 misconceptions hiển thị đúng
- [ ] 2 sample button load pcap thành công, packet decoder render
- [ ] `pnpm --dir app run typecheck` pass
- [ ] `docs/project-changelog.md` có entry 2026-05-24
- [ ] `docs/project-roadmap.md` đánh dấu DHCP lab enhanced
- [ ] `docs/journals/2026-05-24-dhcp-vmware-lab-codify.md` exists
- [ ] Plan status updated → `completed`

## Notes

- KHÔNG commit nếu user chưa explicit yêu cầu (xem CLAUDE.md "Only create commits when requested")
- Nếu smoke test phát hiện Zod parse error → debug `toLabContent()` ở `server/api/labs-routes.js`; có thể cần thêm `tryAtHome → try_at_home` map cho dhcp specifically
- Journal entry áp dụng style "brutal truth" của các journal hiện có trong `docs/journals/`
