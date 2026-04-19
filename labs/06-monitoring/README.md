# Lab 06 — Monitoring (Prometheus + Grafana)

## Stack
- Prometheus `:9090`
- Grafana `:3000` (admin/admin)
- node_exporter `:9100` (cài riêng trên VM target)
- Alertmanager `:9093`

## Chạy
```bash
docker compose up -d
```

## Access
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093

## Bước tiếp
1. Cài node_exporter trên node1/node2 (ansible-galaxy role `cloudalchemy.node_exporter` hoặc tay)
2. Sửa `prometheus/prometheus.yml` thêm target
3. Grafana → Add datasource Prometheus (`http://prometheus:9090`)
4. Import dashboard ID **1860** (Node Exporter Full)
5. Cấu hình Alertmanager receiver (`alertmanager/alertmanager.yml`) với Telegram bot token

## PromQL examples
```
up
node_load1
rate(node_cpu_seconds_total{mode="idle"}[1m])
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
