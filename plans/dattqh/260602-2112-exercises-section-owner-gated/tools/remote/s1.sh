read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-nat@dattqh-nat:~$ sudo rsyslogd -N1'
S rsyslogd -N1 2>&1 | grep -iE 'version|End of config'
echo 'dattqh-nat@dattqh-nat:~$ sudo ss -lntup | grep :514'
S ss -lntup 2>/dev/null | grep ':514'
