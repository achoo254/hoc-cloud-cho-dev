#!/bin/bash
# Chạy trên dattqh-nat (192.168.122.171) — cấu hình rsyslog làm SERVER nhận log remote.
# Password sudo đọc từ dòng đầu stdin (tránh nhúng literal). Mỗi sudo dùng -S -p '' để gọn.
set -u
read -r PW
S() { echo "$PW" | sudo -S -p '' "$@"; }

B64='IyBTeXNsb2cgc2VydmVyIOKAlCBuaOG6rW4gbG9nIHJlbW90ZSBxdWEgVURQICsgVENQIGPhu5VuZyA1MTQgKFJGQyA1NDI0IC8gUkZDIDMxNjQpCm1vZHVsZShsb2FkPSJpbXVkcCIpCmlucHV0KHR5cGU9ImltdWRwIiBwb3J0PSI1MTQiKQptb2R1bGUobG9hZD0iaW10Y3AiKQppbnB1dCh0eXBlPSJpbXRjcCIgcG9ydD0iNTE0IikKCiMgTMawdSBtZXNzYWdlIHJlbW90ZSB0aGVvIGPDonk6IC92YXIvbG9nL3JlbW90ZS88aG9zdG5hbWU+Lzxwcm9ncmFtPi5sb2cKdGVtcGxhdGUobmFtZT0iUmVtb3RlSG9zdEZpbGUiIHR5cGU9InN0cmluZyIKICAgICAgICAgc3RyaW5nPSIvdmFyL2xvZy9yZW1vdGUvJUhPU1ROQU1FJS8lUFJPR1JBTU5BTUUlLmxvZyIpCgojIGZyb21ob3N0LWlwICE9IGxvb3BiYWNrID0+IGzDoCBsb2cgdOG7qyBtw6F5IGtow6FjIGfhu61pIHThu5tpCmlmICgkZnJvbWhvc3QtaXAgIT0gIjEyNy4wLjAuMSIpIHRoZW4gewogICAgYWN0aW9uKHR5cGU9Im9tZmlsZSIgZHluYUZpbGU9IlJlbW90ZUhvc3RGaWxlIgogICAgICAgICAgIGZpbGVDcmVhdGVNb2RlPSIwNjQwIiBkaXJDcmVhdGVNb2RlPSIwNzU1IikKICAgIHN0b3AKfQo='

echo "$B64" | base64 -d > /tmp/10-remote-server.conf
S cp /tmp/10-remote-server.conf /etc/rsyslog.d/10-remote-server.conf
S mkdir -p /var/log/remote
echo "=== INSTALLED ==="
echo "=== VALIDATE (rsyslogd -N1) ==="
S rsyslogd -N1 2>&1 | grep -iE "version|error|End of config" | tail -4
echo "=== RESTART ==="
S systemctl restart rsyslog
sleep 1
S systemctl is-active rsyslog
echo "=== PORT 514 LISTEN ==="
S ss -lntup 2>/dev/null | grep ':514'
echo "=== DONE_SERVER ==="
