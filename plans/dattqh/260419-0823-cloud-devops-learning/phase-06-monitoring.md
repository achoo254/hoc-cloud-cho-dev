---
phase: 06
title: Monitoring
status: pending
priority: P1
effort: medium
---

# Phase 06 — Monitoring

## Why
Không monitor = không biết hỏng, biết trễ, không root-cause được. Monitor trả lời: **Có đang chạy? Có đủ nhanh? Có sắp hỏng?**

## Core
- **Metric** (số) — CPU, RAM, QPS, latency → time-series
- **Log** (text) — event chi tiết (phase 07)
- **Trace** (span) — 1 request đi qua service nào (nâng cao, có thể bỏ qua)
- Golden signals: **Latency, Traffic, Errors, Saturation** (LTES)

## Stack chuẩn: Prometheus + Grafana + Alertmanager

## Topics & Todo

### 1. Khái niệm
- [ ] Push vs Pull model — Prometheus là pull
- [ ] Time-series DB, label-based
- [ ] PromQL cơ bản (rate, sum by, avg)

### 2. Prometheus
- [ ] Cài Prometheus (docker-compose hoặc native)
- [ ] `prometheus.yml` — scrape config, target, job
- [ ] Web UI `:9090`, tab Targets / Graph
- **Demo**: Prometheus scrape chính nó, query `up`

### 3. Exporters
- [ ] **node_exporter** — metric OS (CPU, RAM, disk, net)
- [ ] **blackbox_exporter** — probe HTTP/TCP/ICMP ngoài
- [ ] App-level: nginx-exporter, mysqld-exporter
- **Demo**: Cài node_exporter 2 VM, Prometheus scrape, query `node_load1`

### 4. Grafana
- [ ] Add Prometheus data source
- [ ] Import dashboard ID (Node Exporter Full — 1860)
- [ ] Tự tạo panel đơn giản (graph, stat, gauge)
- **Demo**: Dashboard show CPU/RAM/disk 2 VM real-time

### 5. Alerting
- [ ] Alert rule trong Prometheus (`rules.yml`)
- [ ] Alertmanager — route, group, receiver (Telegram/Email/Slack)
- [ ] Severity: warning vs critical
- **Demo**: Alert khi CPU > 80% trong 5 phút → gửi Telegram

### 6. USE & RED methodology
- [ ] USE (Utilization/Saturation/Errors) — resource
- [ ] RED (Rate/Errors/Duration) — service
- [ ] Biết áp dụng khi thiết kế dashboard

## Checklist qua phase
- [ ] Prometheus scrape 2+ node ổn định
- [ ] Grafana dashboard có golden signals
- [ ] Alert gửi thật đến Telegram/Email
- [ ] Viết được 3 PromQL query tự tin
