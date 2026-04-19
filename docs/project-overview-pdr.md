# Project Overview — Cloud/DevOps Learning

## Mục đích
Repo cá nhân phục vụ lộ trình học Cloud/DevOps cho developer. Nội dung **core + thực hành**, không hàn lâm.

## Đối tượng
Developer muốn nắm hạ tầng: mạng, Linux, container, automation, observability.

## Phạm vi
7 phase chính: Networking → Linux → Docker → Python sysadmin → Ansible → Monitoring → Logging.

Chi tiết: `plans/dattqh/260419-0823-cloud-devops-learning/plan.md`

## Cấu trúc repo
```
hoc-cloud-cho-dev/
├── subnet-calculator.html      # tool IPv4 subnet (phase 01)
├── docs/                       # tài liệu tổng
├── plans/dattqh/               # lộ trình học chi tiết
└── labs/ (sẽ tạo)              # script/config/demo theo phase
```

## Nguyên tắc học
1. **Why trước How** — hiểu vấn đề trước khi học công cụ
2. **Demo chạy được** — mỗi concept có lab reproducible
3. **Artifact giữ lại** — script/config version trong repo
4. **Checklist** — tự đánh giá qua phase

## Môi trường chuẩn
- Host: Windows 11 + VMware Workstation
- VM: Ubuntu Server 22.04 (×2)
- SSH client: MobaXterm
- Stack: Docker, Prometheus/Grafana, Loki, Ansible
