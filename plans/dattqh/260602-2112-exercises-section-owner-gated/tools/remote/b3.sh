read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-client@dattqh-client:~$ systemd-analyze'
systemd-analyze
echo 'dattqh-client@dattqh-client:~$ systemd-analyze blame | head -5'
systemd-analyze blame | head -5
echo 'dattqh-client@dattqh-client:~$ systemctl --failed'
S systemctl --failed --no-legend 2>/dev/null
echo '# cung image: boot 9s, wait-online xong ~1s, khong unit FAILED'
