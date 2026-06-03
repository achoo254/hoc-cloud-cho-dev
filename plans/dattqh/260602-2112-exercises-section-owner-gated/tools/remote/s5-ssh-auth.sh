read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-nat@dattqh-nat:~$ sudo ls -l /var/log/remote/dattqh-client/sshd.log'
S ls -l /var/log/remote/dattqh-client/sshd.log
echo 'dattqh-nat@dattqh-nat:~$ sudo grep -E "Accepted|Failed|Invalid user" /var/log/remote/dattqh-client/sshd.log | tail -4'
S grep -E "Accepted|Failed|Invalid user" /var/log/remote/dattqh-client/sshd.log 2>/dev/null | tail -4
