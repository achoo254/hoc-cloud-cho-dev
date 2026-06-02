read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-client@dattqh-client:~$ cat /etc/rsyslog.d/90-forward.conf'
grep -vE '^\s*#' /etc/rsyslog.d/90-forward.conf | sed '/^$/d'
echo 'dattqh-client@dattqh-client:~$ ss -tnp | grep :514'
S ss -tnp 2>/dev/null | grep ':514'
echo 'dattqh-client@dattqh-client:~$ logger -p user.notice "LAB-SYSLOG-OK demo"'
logger -p user.notice "LAB-SYSLOG-OK demo $(date +%H:%M:%S)"
echo '# client forward toan bo log qua TCP 514 toi server .171 (ESTAB)'
