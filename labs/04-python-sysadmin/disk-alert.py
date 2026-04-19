#!/usr/bin/env python3
"""Check disk usage, bắn webhook nếu vượt ngưỡng."""
from __future__ import annotations
import os
import shutil
import sys

import requests

THRESHOLD = int(os.environ.get("DISK_THRESHOLD", "80"))
WEBHOOK = os.environ.get("WEBHOOK_URL")
MOUNT = os.environ.get("DISK_MOUNT", "/")


def main() -> int:
    usage = shutil.disk_usage(MOUNT)
    percent = usage.used * 100 // usage.total
    print(f"{MOUNT}: {percent}% used")
    if percent >= THRESHOLD and WEBHOOK:
        requests.post(
            WEBHOOK,
            json={"text": f"[WARN] disk {MOUNT} = {percent}% (>= {THRESHOLD}%)"},
            timeout=10,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
