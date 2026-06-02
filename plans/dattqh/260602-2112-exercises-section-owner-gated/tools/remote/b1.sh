read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-nat@dattqh-nat:~$ systemd-analyze'
systemd-analyze
echo 'dattqh-nat@dattqh-nat:~$ systemd-analyze blame | head -5'
systemd-analyze blame | head -5
echo '# userspace 2 phut -- thu pham dung dau: systemd-networkd-wait-online'
