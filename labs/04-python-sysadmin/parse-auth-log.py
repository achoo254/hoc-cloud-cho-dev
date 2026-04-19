#!/usr/bin/env python3
"""Đếm failed SSH login theo IP từ /var/log/auth.log, xuất JSON."""
from __future__ import annotations
import json
import re
import sys
from collections import Counter
from pathlib import Path

FAILED_RE = re.compile(r"Failed password for .* from (\d+\.\d+\.\d+\.\d+)")


def parse(path: Path) -> dict[str, int]:
    counter: Counter[str] = Counter()
    with path.open(encoding="utf-8", errors="replace") as f:
        for line in f:
            if m := FAILED_RE.search(line):
                counter[m.group(1)] += 1
    return dict(counter.most_common())


if __name__ == "__main__":
    log_path = Path(sys.argv[1] if len(sys.argv) > 1 else "/var/log/auth.log")
    print(json.dumps(parse(log_path), indent=2))
