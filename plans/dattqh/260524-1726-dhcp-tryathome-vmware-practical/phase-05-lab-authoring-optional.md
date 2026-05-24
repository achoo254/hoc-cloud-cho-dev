# Phase 5 — Lab Authoring: 3 Optional Phases

**Status:** pending | **Priority:** low | **Effort:** 2h | **Depends on:** Phase 4
**Skippable:** YES — Core 6 phase đã đáp ứng assignment

## Context

3 optional phase mở rộng (đặc sản SBS-v2-hybrid) — render collapsed accordion. User có thể skip nếu thời gian hạn chế.

## Output structure

```
content-drafts/
├── tryathome-optional-O1-nat-gateway.json
├── tryathome-optional-O2-ping-check-deep.json
└── tryathome-optional-O3-apipa-fallback.json
```

Screenshots vào `app/public/labs/dhcp/screenshots/optional/`.

## 3 Optional Phases — outline

### O1 — NAT Gateway cho Client ra internet (~15', 2 screenshot)
- Server thêm NIC2 (VMnet8 NAT)
- `sysctl net.ipv4.ip_forward=1` permanent
- `iptables -t nat -A POSTROUTING -o ens33 -j MASQUERADE`
- `iptables -A FORWARD ...` cặp
- `netfilter-persistent save`
- Client1: `ping -c 2 8.8.8.8` thành công
- SBS section: §3.3
- Screenshots:
  - `opt1-nat-iptables-list.png` (`iptables -t nat -L -n`)
  - `opt1-client-ping-internet.png` (`ping 8.8.8.8` từ Client1)
- `phaseType: 'optional'`

### O2 — ping-check deep dive (~20', 2 screenshot)
- Bật `ping-check true; ping-timeout 1;` trong dhcpd.conf
- Override systemd unit để dhcpd chạy as root (`CAP_NET_RAW`)
  - `/etc/systemd/system/isc-dhcp-server.service.d/override.conf`
- Verify `cat /proc/$(pidof dhcpd)/status | grep '^Uid\|^CapEff'` → Uid=0, CapEff đầy đủ
- Re-run Case A → giờ thấy log `Abandoning IP address ... pinged before offer`
- SBS section: §3.6 + §7.6
- Screenshots:
  - `opt2-dhcpd-as-root-cap.png` (`/proc/PID/status`)
  - `opt2-log-abandon-pinged.png` (`journalctl` "Abandoning ... pinged before offer")
- `phaseType: 'optional'`

### O3 — APIPA fallback với dhcpcd (~15', 2 screenshot)
- Pre-req: O2 đã setup hoặc Case B đã có 2 IP trùng
- Client1: stop systemd-networkd, dùng `dhcpcd -1 -t 20 ens33`
- Quan sát log dhcpcd: `DAD detected ... declined` → `probing IPv4LL` → `leased 169.254.x.x`
- Server log: `DHCPDECLINE of 192.168.81.100 from <MAC> via ens37: abandoned`
- `ip addr show ens33` → 169.254.x.x/16
- SBS section: §8.6
- Screenshots:
  - `opt3-dhcpcd-decline.png` (stdout dhcpcd)
  - `opt3-ip-addr-apipa-169.png` (`ip addr show` APIPA)
- `phaseType: 'optional'`

## Acceptance criteria

- [ ] 3 JSON draft trong `content-drafts/`
- [ ] 6 ảnh trong `app/public/labs/dhcp/screenshots/optional/`
- [ ] Tất cả item có `phaseType: 'optional'`
- [ ] Renderer hiển thị collapsed accordion với label "Mở rộng (tuỳ chọn) — 3 phase"

## Skip condition

Nếu user quyết định skip phase này:
- Update `plan.md` mark Phase 5 `status: skipped`
- Phase 6 (Mongo update) chỉ insert 6 core item
- Vẫn pass success criteria của brainstorm v2

## Risks

- O2 yêu cầu chmod/chown `/var/lib/dhcp/dhcpd.leases` — nếu sai sẽ break dhcpd
- O3 yêu cầu Client2 phải đang holding `.100` static — phải set up trước
