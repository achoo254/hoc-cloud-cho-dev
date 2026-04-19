# Lab 07 — Logging (Loki + Promtail + Grafana)

## Stack
- Loki `:3100` — log storage
- Promtail — agent đọc file log → push Loki
- Grafana `:3000` — query UI

## Chạy
```bash
docker compose up -d
```

## Setup Grafana
1. http://localhost:3000 (admin/admin)
2. Add data source **Loki** → URL `http://loki:3100`
3. Explore → label `job`

## LogQL examples
```
{job="varlogs"}
{job="varlogs"} |= "error"
{job="nginx"} | json | status="500"
rate({job="nginx"} |= "500" [5m])
count_over_time({job="varlogs"} |= "Failed password" [1h])
```

## Ship log từ VM thật
Cài Promtail native trên node1/node2, trỏ `clients.url` về `http://<host>:3100/loki/api/v1/push`, config scrape `/var/log/*.log` + `/var/log/nginx/*.log`.

## Alert log-based
Grafana → Alerting → tạo rule với query LogQL, VD:
```
count_over_time({job="nginx"} |= "500" [5m]) > 10
```
