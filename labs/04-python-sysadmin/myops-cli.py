#!/usr/bin/env python3
"""CLI mẫu: myops {backup|restore|status}."""
from __future__ import annotations
import argparse
import sys


def cmd_backup(args: argparse.Namespace) -> int:
    print(f"[backup] target={args.target}")
    return 0


def cmd_restore(args: argparse.Namespace) -> int:
    print(f"[restore] from={args.source}")
    return 0


def cmd_status(_: argparse.Namespace) -> int:
    print("[status] ok")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="myops")
    sub = p.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("backup")
    b.add_argument("--target", default="/var/backups")
    b.set_defaults(func=cmd_backup)

    r = sub.add_parser("restore")
    r.add_argument("--source", required=True)
    r.set_defaults(func=cmd_restore)

    s = sub.add_parser("status")
    s.set_defaults(func=cmd_status)

    return p


if __name__ == "__main__":
    args = build_parser().parse_args()
    sys.exit(args.func(args))
