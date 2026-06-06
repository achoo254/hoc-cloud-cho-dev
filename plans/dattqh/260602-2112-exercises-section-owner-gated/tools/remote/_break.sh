read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
S rm -rf /var/log/remote; S mkdir -p /var/log/remote; S chown root:root /var/log/remote; S systemctl restart rsyslog
