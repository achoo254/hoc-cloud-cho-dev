# DHCP Lab — Reference Screenshots

Baseline: **VMware Workstation Pro 25H2** trên Windows 11. Guest OS: **Ubuntu Server 24.04 LTS**.

## Naming convention

```
phase{N}-{idx}-{slug}.png
```

Ví dụ:
- `core/phase1-01-vmnet1-dhcp-off.png` — VMware Network Editor, VMnet1 tắt DHCP
- `core/phase4-02-server-log-after-discover.png` — `journalctl -u isc-dhcp-server`
- `optional/opt2-log-abandon-pinged.png` — log "Abandoning IP ... pinged before offer"

## Folder layout

```
core/        # 6 core phase (~17 ảnh) — bám yêu cầu bài tập
optional/    # 3 optional phase (~6 ảnh) — mở rộng SBS-v2-hybrid
```

## Privacy checklist (pre-commit)

- [ ] Crop taskbar Windows (giấu hostname, tên user)
- [ ] Blur/mosaic public IP nếu lộ
- [ ] Không hiển thị token, password, SSH key trong terminal
- [ ] Không lộ thông tin nội bộ công ty (nếu có)

## Format guideline

- PNG, width ~1200px (max 1600px)
- Target size ~150KB/ảnh, tối đa 300KB
- Crop sát nội dung, bỏ whitespace thừa
- Nếu ảnh quá lớn → optimize qua https://squoosh.app (lossless PNG hoặc WebP)

## URL serving

Vite serve `app/public/` ở root. URL pattern:

```
/labs/dhcp/screenshots/core/<file>.png
/labs/dhcp/screenshots/optional/<file>.png
```

Reference trong `tryAtHome[].steps[].screenshot.src` luôn dùng absolute path bắt đầu từ `/labs/`.

## Re-capture trigger

Re-capture screenshot khi:
- VMware Workstation upgrade major version (UI thay đổi đáng kể)
- Ubuntu 24.04 → version mới
- Lệnh trong SBS thay đổi output format
