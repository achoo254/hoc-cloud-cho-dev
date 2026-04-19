# Lab 08 — CI/CD (GitHub Actions)

## Files
- `workflows/ci-node.yml` — CI Node.js: install → lint → test → build
- `workflows/build-push-image.yml` — build + push Docker image lên GHCR khi tag `v*`
- `workflows/deploy-ssh.yml` — SSH vào VM, `docker compose pull && up -d`
- `workflows/security-scan.yml` — trivy + gitleaks

## Cách dùng
Copy file trong `workflows/` vào `.github/workflows/` ở repo thật.

## Secrets cần set (Settings → Secrets → Actions)
| Name | Mục đích |
|------|----------|
| `GHCR_TOKEN` | PAT với scope `write:packages` (nếu không dùng `GITHUB_TOKEN`) |
| `SSH_HOST` | IP/domain VM deploy |
| `SSH_USER` | user SSH |
| `SSH_KEY` | private key (PEM) |
