read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-nat@dattqh-nat:~$ sudo ls -ld /var/log/remote'
S ls -ld /var/log/remote
echo 'dattqh-nat@dattqh-nat:~$ sudo journalctl -u rsyslog | grep "could not open" | tail -1'
S journalctl -u rsyslog --no-pager 2>/dev/null | grep -i "could not open" | tail -1
echo 'dattqh-nat@dattqh-nat:~$ sudo find /var/log/remote -type f'
S find /var/log/remote -type f
echo '# LOI 2207: thu muc thuoc root, user syslog khong tao subdir -> discard message'
