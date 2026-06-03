read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-nat@dattqh-nat:~$ sudo chown syslog:syslog /var/log/remote && sudo systemctl restart rsyslog'
echo 'dattqh-nat@dattqh-nat:~$ sudo find /var/log/remote -type f'
S find /var/log/remote -type f 2>/dev/null | head -5
echo 'dattqh-nat@dattqh-nat:~$ sudo grep -rh LAB-SYSLOG-OK /var/log/remote'
S grep -rh "LAB-SYSLOG-OK" /var/log/remote 2>/dev/null | tail -2
