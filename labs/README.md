# Labs — Thực hành theo phase

Mỗi thư mục tương ứng 1 phase trong `plans/dattqh/260419-0823-cloud-devops-learning/`.

| Phase | Thư mục | Nội dung chính |
|-------|---------|----------------|
| 01 | `01-networking/` | Wireshark filter, subnet calc, capture scripts |
| 02 | `02-linux/` | Netplan, sshd config, bash scripts, vimrc |
| 03 | `03-docker/` | Dockerfile, docker-compose.yml |
| 04 | `04-python-sysadmin/` | CLI tool, log parser, API caller |
| 05 | `05-ansible/` | Inventory, playbook, role |
| 06 | `06-monitoring/` | Prometheus + Grafana stack, exporters, alert rules |
| 07 | `07-logging/` | Loki + Promtail stack, LogQL examples |
| 08 | `08-cicd/` | GitHub Actions workflows |

## Quy ước
- Mỗi lab có `README.md` mô tả: mục tiêu, prerequisite, cách chạy, expected output
- Script bash: shebang + `set -euo pipefail`
- Compose stack: `docker compose up -d` chạy được ngay trên VM sạch
- Secret: dùng `.env.example` + gitignore `.env`
