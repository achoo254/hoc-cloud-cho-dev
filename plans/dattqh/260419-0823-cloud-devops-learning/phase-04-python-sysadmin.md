---
phase: 04
title: Python cho Sysadmin
status: pending
priority: P2
effort: medium
---

# Phase 04 — Python cho Sysadmin

## Why
Bash đủ cho script nhỏ. Python mạnh hơn khi cần: parse JSON/YAML, gọi API, xử lý log phức tạp, tool CLI. Ansible cũng chạy trên Python.

## Topics & Todo

### 1. Python basics cho ops
- [ ] Syntax tối thiểu: var, if, for, function, list/dict
- [ ] venv + pip (tuyệt đối không `pip install` system Python)
- **Demo**: Tạo venv, cài `requests`, gọi 1 public API, parse JSON

### 2. File & Text
- [ ] Đọc/ghi file, context manager (`with open`)
- [ ] `re` — regex cho log parsing
- [ ] `json`, `yaml` (PyYAML) — đọc config
- **Demo**: Script parse `/var/log/auth.log`, đếm failed login theo IP, xuất JSON

### 3. Subprocess & OS
- [ ] `subprocess.run` — gọi shell an toàn
- [ ] `os`, `pathlib`, `shutil` — thao tác file/dir
- **Demo**: Script check disk usage, nếu >80% gửi notification (webhook)

### 4. HTTP & API
- [ ] `requests` — GET/POST, header, auth, timeout
- [ ] Retry + error handling
- **Demo**: Script call Cloudflare/DigitalOcean API update DNS record, hoặc gửi alert Telegram

### 5. CLI tool
- [ ] `argparse` — flag, subcommand
- [ ] Packaging đơn giản (script + shebang, chmod +x)
- **Demo**: CLI `./myops backup|restore|status` wrap các script bash hiện có

### 6. Thư viện ops phổ biến (nhận biết)
- [ ] `paramiko` / `fabric` — SSH automation
- [ ] `psutil` — metric hệ thống
- [ ] `click` / `typer` — CLI pro
- [ ] `jinja2` — template config

## Checklist qua phase
- [ ] Viết CLI Python có subcommand
- [ ] Parse log + xuất report JSON
- [ ] Gọi API có auth + retry
- [ ] Biết khi nào dùng Python thay Bash
