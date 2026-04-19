---
phase: 05
title: Ansible Automation
status: pending
priority: P1
effort: medium
---

# Phase 05 — Ansible

## Why
SSH + bash script cho 2 server thì OK. 20 server thì drift, lệch cấu hình, không reproducible. Ansible = config as code, idempotent, agentless.

## Core
- **Agentless** — chỉ cần SSH + Python trên target
- **Idempotent** — chạy 10 lần kết quả vẫn như 1 lần
- **Declarative** — mô tả trạng thái mong muốn, không mô tả bước

## Topics & Todo

### 1. Install & Inventory
- [ ] Cài ansible trên control node
- [ ] Inventory INI vs YAML, group, group_vars, host_vars
- [ ] `ansible all -m ping`
- **Demo**: Inventory cho node1 + node2, ping cả 2

### 2. Ad-hoc commands
- [ ] `ansible <group> -m <module> -a "<args>"`
- [ ] Module cơ bản: `ping`, `command`, `shell`, `copy`, `file`, `apt`, `service`, `user`
- **Demo**: Cài nginx trên tất cả webserver bằng 1 lệnh ad-hoc

### 3. Playbook
- [ ] YAML structure: play, tasks, handlers, vars, tags
- [ ] `become` (sudo), `when`, `loop`, `register`
- [ ] Handler (notify on change)
- **Demo**: Playbook cài + cấu hình nginx, serve 1 trang HTML, handler reload khi config đổi

### 4. Variables & Templates
- [ ] Precedence của vars (playbook > host_vars > group_vars > role default)
- [ ] Jinja2 template (`template` module)
- [ ] `ansible-vault` — mã hóa secret
- **Demo**: Generate nginx.conf từ template, vars khác nhau giữa group web_prod vs web_dev

### 5. Roles
- [ ] Cấu trúc role chuẩn (tasks/handlers/templates/defaults/vars/meta)
- [ ] `ansible-galaxy init`
- [ ] Import role vs include role
- **Demo**: Refactor playbook nginx thành role, apply cho 2 group khác nhau

### 6. Best practice
- [ ] Idempotency — luôn prefer module thay `shell`/`command`
- [ ] `--check` (dry-run), `--diff`
- [ ] Tag để chạy partial
- [ ] Git-track toàn bộ playbook/role

## Checklist qua phase
- [ ] Playbook dựng được full stack web (nginx + mysql + app) từ VM sạch
- [ ] Dùng role + vars + vault
- [ ] Chạy 2 lần không thay đổi gì (idempotent)
- [ ] `--check --diff` trước khi apply prod
