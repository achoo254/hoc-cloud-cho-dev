# Lab 04 — Python cho Sysadmin

## Setup
```bash
python3 -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

## Scripts
- `parse-auth-log.py` — đếm failed SSH login theo IP, xuất JSON
- `disk-alert.py` — check disk, alert webhook nếu >80%
- `myops-cli.py` — CLI argparse mẫu (backup/restore/status)
