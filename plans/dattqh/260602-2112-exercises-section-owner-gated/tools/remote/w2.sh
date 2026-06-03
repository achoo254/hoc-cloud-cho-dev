read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-client@dattqh-client:~$ sudo fallocate -l 512M /swapfile-demo && sudo chmod 600 /swapfile-demo'
S fallocate -l 512M /swapfile-demo; S chmod 600 /swapfile-demo
echo 'dattqh-client@dattqh-client:~$ sudo mkswap /swapfile-demo'
S mkswap /swapfile-demo 2>&1 | head -2
echo 'dattqh-client@dattqh-client:~$ sudo swapon /swapfile-demo && swapon --show'
S swapon /swapfile-demo; swapon --show
