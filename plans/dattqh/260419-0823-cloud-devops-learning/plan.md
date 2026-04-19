---
title: Chương trình học Cloud/DevOps cho Dev
status: in-progress
priority: P1
effort: large
branch: master
tags: [learning, devops, cloud, networking, linux, docker, ansible]
created: 2026-04-19
---

# Cloud/DevOps Learning Program

## Mục tiêu
Lộ trình học cloud/devops cho dev: không hàn lâm, tập trung **core concept + thực hành demo**. Mỗi chủ đề có ví dụ thực tế + lab demo chạy được.

## Nguyên tắc
- **Hiểu bản chất trước, công cụ sau** — Vì sao cần, không chỉ cách dùng
- **Lab-first** — Mỗi khái niệm đi kèm demo chạy được (VM, Docker, script)
- **Ngắn gọn, đúng trọng tâm** — Tránh lý thuyết thừa
- **Artifact thực tế** — Tool/script/config giữ lại để tham chiếu

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 01 | Networking & OSI | in-progress | [phase-01-networking.md](phase-01-networking.md) |
| 02 | Linux cơ bản & Server | pending | [phase-02-linux.md](phase-02-linux.md) |
| 03 | Docker & Containerization | pending | [phase-03-docker.md](phase-03-docker.md) |
| 04 | Python cho Sysadmin | pending | [phase-04-python-sysadmin.md](phase-04-python-sysadmin.md) |
| 05 | Ansible Automation | pending | [phase-05-ansible.md](phase-05-ansible.md) |
| 06 | Monitoring | pending | [phase-06-monitoring.md](phase-06-monitoring.md) |
| 07 | Logging | pending | [phase-07-logging.md](phase-07-logging.md) |
| 08 | CI/CD | pending | [phase-08-cicd.md](phase-08-cicd.md) |

## Artifacts đã có
- `subnet-calculator.html` — IPv4 subnet calculator (dùng cho phase 01)

## Cấu trúc học mỗi chủ đề
1. **Why** — Vấn đề nó giải quyết
2. **Core** — Khái niệm lõi (1-2 paragraph, không hàn lâm)
3. **Demo** — Lab thực hành có thể chạy lại
4. **Checklist** — Biết gì là đủ để qua chủ đề

## Môi trường thực hành
- **Hypervisor**: VMware Workstation
- **OS lab**: Ubuntu Server 22.04 (2 VM)
- **SSH client**: MobaXterm
- **Capture**: Wireshark + tcpdump
