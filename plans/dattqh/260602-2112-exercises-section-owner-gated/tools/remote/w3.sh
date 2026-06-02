read PW; S(){ echo "$PW"|sudo -S -p '' "$@"; }
echo 'dattqh-client@dattqh-client:~$ sudo sysctl vm.swappiness=10'
S sysctl vm.swappiness=10
echo 'dattqh-client@dattqh-client:~$ sudo sysctl vm.swappiness=60'
S sysctl vm.swappiness=60
echo 'dattqh-client@dattqh-client:~$ vmstat 1 2'
vmstat 1 2 | tail -3
echo '# si/so = 0 (khong thrash); swappiness chinh runtime, ghi /etc/sysctl.d de ben'
S swapoff /swapfile-demo 2>/dev/null; S rm -f /swapfile-demo
