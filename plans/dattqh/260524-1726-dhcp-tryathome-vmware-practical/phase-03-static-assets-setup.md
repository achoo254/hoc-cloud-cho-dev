# Phase 3 — Static Assets Folder + Vite Serve Verify

**Status:** pending | **Priority:** medium | **Effort:** 0.5h | **Depends on:** none (có thể song song Phase 1-2)

## Context

Reference screenshot lưu tại `app/public/labs/dhcp/screenshots/{core,optional}/`. Vite serve `public/` ở root path → URL `/labs/dhcp/screenshots/...`.

## Requirements

- Tạo folder `core/` + `optional/`
- `.gitkeep` để track folder rỗng
- 1 placeholder PNG để verify Vite serve trước khi Phase 4 commit ảnh thật
- Optional: thêm `README.md` mô tả naming convention

## Files / folders

```
app/public/labs/dhcp/screenshots/
├── README.md               (naming + version note)
├── core/
│   └── .gitkeep
└── optional/
    └── .gitkeep
```

## Implementation

### `app/public/labs/dhcp/screenshots/README.md`

```markdown
# DHCP Lab — Reference Screenshots

VMware Workstation Pro 25H2 baseline. Ubuntu Server 24.04 LTS.

Naming: `phase{N}-{idx}-{slug}.png`
  - phase1-01-vmnet1-dhcp-off.png
  - phase4-02-server-log-after-discover.png

Privacy: crop taskbar, blur hostname/MAC nếu lộ.
Size target: ~150KB PNG, width ~1200px. Optimize WebP có thể làm sau.

URL: served at `/labs/dhcp/screenshots/{core|optional}/<file>.png`
```

### Verify Vite serve

```bash
# Đặt 1 placeholder PNG (1x1 trắng)
# Sau khi dev server start:
curl -I http://localhost:5173/labs/dhcp/screenshots/core/placeholder.png
# Mong đợi: HTTP/1.1 200 OK, Content-Type: image/png
```

Sau verify OK → xóa placeholder.

## Risks

- `.gitkeep` không track folder nếu git config nào đó — verify `git status` thấy folder
- Bundle: `public/` không vào JS bundle, chỉ copy 1:1 sang `dist/` khi build. Verify build output có ảnh.

## Deliverable

- Folder structure tạo xong
- README mô tả naming + privacy
- Vite dev serve verify pass
