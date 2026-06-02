#!/bin/bash
# Chạy trên dattqh-client (192.168.122.172) — cấu hình rsyslog FORWARD log tới server 171.
set -u
read -r PW
S() { echo "$PW" | sudo -S -p '' "$@"; }

B64='IyBTeXNsb2cgY2xpZW50IOKAlCBmb3J3YXJkIHRvw6BuIGLhu5kgbG9nIHThu5tpIHN5c2xvZyBzZXJ2ZXIgMTkyLjE2OC4xMjIuMTcxOjUxNCBxdWEgVENQLgojIFF1ZXVlIGxpbmtlZExpc3QgKyByZXN1bWVSZXRyeUNvdW50OiBu4bq/dSBzZXJ2ZXIgdOG6oW0gZG93biwgbG9nIGdp4buvIHRyb25nIFJBTSBxdWV1ZQojIHbDoCBn4butaSBs4bqhaSBraGkgc2VydmVyIGzDqm4gKGtow7RuZyBt4bqldCBsb2csIGtow7RuZyBibG9jayBqb3VybmFsZCkuCiouKiBhY3Rpb24odHlwZT0ib21md2QiCiAgICAgICAgICAgdGFyZ2V0PSIxOTIuMTY4LjEyMi4xNzEiCiAgICAgICAgICAgcG9ydD0iNTE0IgogICAgICAgICAgIHByb3RvY29sPSJ0Y3AiCiAgICAgICAgICAgYWN0aW9uLnJlc3VtZVJldHJ5Q291bnQ9IjEwMCIKICAgICAgICAgICBxdWV1ZS50eXBlPSJsaW5rZWRMaXN0IgogICAgICAgICAgIHF1ZXVlLnNpemU9IjEwMDAwIikK'

echo "$B64" | base64 -d > /tmp/90-forward.conf
S cp /tmp/90-forward.conf /etc/rsyslog.d/90-forward.conf
echo "=== INSTALLED_CLIENT ==="
echo "=== VALIDATE ==="
S rsyslogd -N1 2>&1 | grep -iE "version|error|End of config" | tail -3
echo "=== RESTART ==="
S systemctl restart rsyslog && sleep 1 && S systemctl is-active rsyslog
echo "=== TCP CONNECTION TO SERVER 171:514 ==="
S ss -tnp 2>/dev/null | grep ':514' || echo "no-tcp-514-yet"
echo "=== SEND TEST LOG ==="
logger -p user.notice "LAB-SYSLOG-TEST tu client $(hostname) luc $(date +%H:%M:%S)"
echo "sent test message via logger"
echo "=== DONE_CLIENT ==="
