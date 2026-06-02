read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-nat@dattqh-nat:~$ systemctl --failed'
S systemctl --failed --no-legend 2>/dev/null
echo 'dattqh-nat@dattqh-nat:~$ sudo journalctl -b -u systemd-networkd-wait-online | tail -3'
S journalctl -b -u systemd-networkd-wait-online --no-pager 2>/dev/null | tail -3
echo '# wait-online timeout 120s -> FAILED -> keo userspace len 2 phut'
