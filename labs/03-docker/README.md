# Lab 03 — Docker

## Files
- `Dockerfile.node-multistage` — Node.js multi-stage
- `docker-compose.yml` — stack nginx + app + mysql
- `.env.example` — biến môi trường mẫu

## Chạy
```bash
cp .env.example .env
# sửa .env
docker compose up -d
docker compose logs -f
docker compose down
```

## So sánh size
```bash
docker build -f Dockerfile.node-multistage -t myapp:multi .
docker images | grep myapp
```
