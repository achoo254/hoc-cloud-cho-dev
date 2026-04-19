---
phase: 08
title: CI/CD
status: pending
priority: P1
effort: medium
---

# Phase 08 — CI/CD

## Why
Deploy tay = chậm, dễ sai, không trace. CI/CD = mỗi commit tự build/test/deploy, rollback nhanh, audit được ai push gì lúc nào.

## Core
- **CI** (Continuous Integration) — mỗi commit tự lint/test/build
- **CD** (Continuous Delivery/Deployment) — artifact tự deploy staging (Delivery) hoặc prod (Deployment)
- **Pipeline** = tập hợp **job** chạy theo **stage**
- **Runner/Agent** = máy thực thi job

## Stack chọn: GitHub Actions (chính) + GitLab CI (tham khảo)

## Topics & Todo

### 1. Concept
- [ ] CI vs CD vs Continuous Deployment — khác nhau ở điểm nào
- [ ] Pipeline, stage, job, step, artifact, cache
- [ ] Trigger: push, PR, tag, schedule, manual
- [ ] Secret management — KHÔNG hardcode trong yaml

### 2. Git flow đi kèm
- [ ] Branch strategy: trunk-based vs gitflow (ưu tiên trunk + short-lived branch)
- [ ] Protected branch, required check, PR review
- **Demo**: Protect `main`, bắt buộc pass CI mới merge

### 3. GitHub Actions cơ bản
- [ ] `.github/workflows/*.yml` structure
- [ ] `on:`, `jobs:`, `runs-on:`, `steps:`, `uses:` vs `run:`
- [ ] Matrix build (test nhiều version Node/Python)
- [ ] Secrets + Environment
- **Demo**: Workflow cho repo Node.js: install → lint → test → build, chạy trên PR

### 4. Build & Publish Docker
- [ ] `docker/build-push-action` — build multi-arch, push registry
- [ ] Tag theo git: `sha-xxx`, `v1.2.0`, `latest` (careful)
- [ ] Cache layer giữa build (GHA cache)
- **Demo**: Push image lên GHCR (GitHub Container Registry) mỗi khi tag `v*`

### 5. Deploy thực tế
- [ ] Self-hosted runner hoặc SSH từ GHA vào VM
- [ ] Deploy strategy: `docker compose pull && up -d`, Ansible playbook, hoặc webhook
- **Demo**: Pipeline: PR merge `main` → build image → SSH VM → pull + restart stack

### 6. Quality gates
- [ ] Lint (eslint, shellcheck, ansible-lint)
- [ ] Test + coverage threshold
- [ ] Security scan: `trivy` (image), `gitleaks` (secret)
- **Demo**: Thêm trivy scan vào workflow, fail nếu có CVE critical

### 7. GitLab CI (nhận biết)
- [ ] `.gitlab-ci.yml` — stages, jobs
- [ ] Khác GHA: runner tự host phổ biến, built-in registry
- So sánh nhanh với GHA để dễ chuyển qua lại

## Checklist qua phase
- [ ] 1 repo có CI chạy lint + test mỗi PR
- [ ] Tag release tự build + push Docker image
- [ ] Auto-deploy vào VM lab khi merge main
- [ ] Secret bằng GitHub Secrets, không hardcode
- [ ] Trivy scan trong pipeline
