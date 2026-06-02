read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
S chown syslog:syslog /var/log/remote; S systemctl restart rsyslog
