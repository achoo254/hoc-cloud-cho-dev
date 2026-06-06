# Phase 1 — Archive Source Artifacts

**Status**: pending
**Effort**: 0.5h
**Blocker**: None

## Goal

Lưu toàn bộ artifacts của session lab gốc (Agent đồng nghiệp đã chạy trên VM `.128`) vào `source/` của plan dir để có nguồn tham chiếu khi codify và recover nếu cần.

## Files to Modify / Create

```
plans/dattqh/260524-1055-dhcp-lab-codify/source/
├── STEP-BY-STEP.md        # move từ plans/dattqh/reports/dhcp-lab-step-by-step.md
└── REPORT.md              # fetch mới từ VM .128:~/dhcp-lab/REPORT.md
```

## Implementation Steps

### 1. Move STEP-BY-STEP.md vào plan source dir
```bash
mkdir -p plans/dattqh/260524-1055-dhcp-lab-codify/source
mv plans/dattqh/reports/dhcp-lab-step-by-step.md \
   plans/dattqh/260524-1055-dhcp-lab-codify/source/STEP-BY-STEP.md
```

### 2. Fetch REPORT.md từ VM (chưa fetch ở session brainstorm)
```bash
# Từ Windows host (PowerShell hoặc Git Bash):
scp dhcp-username@192.168.81.128:~/dhcp-lab/REPORT.md \
    "plans/dattqh/260524-1055-dhcp-lab-codify/source/REPORT.md"
# Pass: 7335140 (interactive)
```

Hoặc dùng paramiko script (theo pattern session trước):
```python
# Set env: LAB_HOST=192.168.81.128 LAB_USER=dhcp-username LAB_SECRET=7335140
# Source: REPORT.md từ ~/dhcp-lab/
# Target: plans/dattqh/260524-1055-dhcp-lab-codify/source/REPORT.md
```

### 3. Verify checksums (optional)
```bash
ls -la plans/dattqh/260524-1055-dhcp-lab-codify/source/
# Mong đợi: STEP-BY-STEP.md (~23 KB), REPORT.md (~7 KB)
```

## Acceptance Criteria

- [ ] `source/STEP-BY-STEP.md` tồn tại, ≥600 dòng
- [ ] `source/REPORT.md` tồn tại, ≥150 dòng (theo metadata Agent kia)
- [ ] `plans/dattqh/reports/dhcp-lab-step-by-step.md` đã được moved (không còn duplicate)

## Notes

- KHÔNG fetch screenshots/scripts khác trong `~/dhcp-lab/` của VM (chỉ 2 file MD trọng yếu)
- KHÔNG sao chép gì từ peer PR INET-Support/cloud-labs#3 (xác nhận của user)
- Source archive là **read-only reference**, không edit trực tiếp; mọi codify diễn ra trong Phase 3+
