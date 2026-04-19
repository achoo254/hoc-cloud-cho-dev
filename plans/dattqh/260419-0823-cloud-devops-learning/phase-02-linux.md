---
phase: 02
title: Linux cơ bản & Server
status: pending
priority: P1
effort: large
---

# Phase 02 — Linux & Server

## Why
Cloud/DevOps = Linux. Không lướt qua được bước này. Mục tiêu: tự dựng, quản trị, debug được 1 Linux server.

## Topics & Todo

### 1. Distro landscape
- [ ] Debian/Ubuntu vs RHEL/Rocky/CentOS — khác package manager (apt/yum-dnf), triết lý release
- [ ] Tại sao enterprise thường RHEL-based; dev lab thường Ubuntu
- **Output**: Chọn Ubuntu Server 22.04 làm chuẩn lab

### 2. VMware Workstation
- [ ] Tạo VM, snapshot (linked/full clone khác gì)
- [ ] Network mode: **Bridged** (cùng LAN host), **NAT** (share IP host), **Host-only** (lab kín)
- **Demo**: Tạo 2 VM Ubuntu, mỗi VM 2 NIC: 1 NAT (ra internet), 1 Host-only (2 VM nói chuyện nhau)

### 3. Cài đặt OS
- [ ] Cài Ubuntu Server 22.04 x2 (node1, node2)
- [ ] Partitioning cơ bản (/, /boot, swap, LVM)
- [ ] Static IP via netplan

### 4. SSH & MobaXterm
- [ ] Password vs key auth (sinh keypair, copy public key)
- [ ] `~/.ssh/config` — alias, ProxyJump
- [ ] MobaXterm session, saved terminal
- **Demo**: Login key-only, disable password auth trong sshd_config

### 5. Vim
- [ ] Modes: normal/insert/visual/command
- [ ] Essential: `i a o`, `dd yy p`, `:w :q :wq`, `/search`, `:%s/a/b/g`
- [ ] `.vimrc` tối thiểu
- **Goal**: Edit config file không bị kẹt

### 6. Command Line cơ bản
- [ ] Filesystem: `ls cd pwd cp mv rm mkdir find`
- [ ] Text: `cat less grep awk sed cut sort uniq wc head tail`
- [ ] Process: `ps top htop kill systemctl journalctl`
- [ ] Network: `ip ss netstat ping curl wget dig`
- [ ] Permission: `chmod chown`, rwx, sudo
- [ ] Package: `apt update/install/remove`
- **Demo**: Viết pipeline `journalctl | grep sshd | awk ... | sort | uniq -c` đếm login attempts

### 7. Wireshark / tcpdump
- [ ] tcpdump filter: `host`, `port`, `tcp`, `and/or/not`
- [ ] Save pcap → mở bằng Wireshark
- **Demo**: `tcpdump -i eth0 -w /tmp/a.pcap port 80`, truy cập web, phân tích pcap trên Wireshark

### 8. Nginx / Apache
- [ ] Vai trò: reverse proxy, static server, load balancer
- [ ] Virtual host / server block
- [ ] `nginx -t`, reload vs restart
- **Demo**: Nginx serve static HTML + reverse proxy tới backend port 3000; enable HTTPS self-signed

### 9. MySQL / MariaDB
- [ ] Cài đặt, `mysql_secure_installation`
- [ ] User/grant, database/table cơ bản
- [ ] Backup/restore `mysqldump`
- **Demo**: Tạo db + user dành riêng cho 1 app, app connect từ VM khác (bind-address, firewall)

### 10. Bash Script
- [ ] Variables, if/for/while, functions
- [ ] `$?`, `set -e`, trap
- [ ] Shebang, chmod +x, cron
- **Demo**: Script backup MySQL + nén + xóa file > 7 ngày, cron hằng ngày 2h sáng

## Checklist qua phase
- [ ] Dựng 2 VM thông nhau + ra internet
- [ ] SSH key-only
- [ ] Vim đủ edit config không cần thoát ra
- [ ] Nginx reverse proxy hoạt động
- [ ] MySQL accessible từ VM khác
- [ ] Script backup chạy qua cron
