---
phase: 07
title: Logging
status: pending
priority: P1
effort: medium
---

# Phase 07 — Logging

## Why
Metric nói "có vấn đề". Log nói "vấn đề cụ thể là gì". SSH từng server `tail -f` = không scale. Centralized logging bắt buộc khi có ≥3 server hoặc ≥2 service.

## Core
- **Structured log** (JSON) dễ query hơn plain text
- **Shipper** (gom) → **Storage** (lưu + index) → **UI** (search/visualize)
- 3 thành phần tách biệt, dễ thay từng phần

## Stack chọn 1 trong 2:
- **ELK/EFK**: Elasticsearch + Logstash/Fluentd + Kibana (mạnh, nặng)
- **Loki + Promtail + Grafana**: nhẹ, tích hợp sẵn Grafana (khuyến nghị cho lab)

## Topics & Todo

### 1. Log basics trên Linux
- [ ] `/var/log/*` (syslog, auth.log, nginx, mysql)
- [ ] `journalctl` (systemd) — filter theo unit, time, priority
- [ ] Log rotation (`logrotate`)
- **Demo**: Cấu hình logrotate cho 1 app custom

### 2. Structured logging
- [ ] Plain vs JSON log — ví dụ nginx log format custom JSON
- [ ] Field chuẩn: timestamp, level, service, message, request_id
- **Demo**: Đổi nginx sang log JSON, so sánh parse

### 3. Stack Loki (khuyến nghị)
- [ ] Cài Loki + Grafana bằng docker-compose
- [ ] Promtail — agent trên mỗi node, đọc file log → gửi Loki
- [ ] LogQL cơ bản: `{job="nginx"} |= "500"`, `rate(...)` 
- **Demo**: Ship log nginx + syslog 2 VM về Loki, search trên Grafana

### 4. Alert dựa trên log
- [ ] LogQL ra metric (error rate) → alert qua Grafana/Alertmanager
- **Demo**: Alert khi `count_over_time({job="nginx"} |= "500" [5m]) > 10`

### 5. Best practice
- [ ] KHÔNG log secret (password, token, PII)
- [ ] Log level đúng (DEBUG/INFO/WARN/ERROR)
- [ ] Retention policy (cost) — hot/warm/cold
- [ ] Correlation: `request_id` xuyên service

## Checklist qua phase
- [ ] Log từ 2+ VM tập trung về 1 chỗ query được
- [ ] Tìm nhanh error trong 10K log bằng LogQL/KQL
- [ ] Log app format JSON có field chuẩn
- [ ] Alert log-based chạy thật
