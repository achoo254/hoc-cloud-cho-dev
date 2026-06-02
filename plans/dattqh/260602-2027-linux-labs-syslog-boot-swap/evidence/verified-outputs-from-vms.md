# Evidence thật từ 2 VM — dùng cho code block + steps.expect trong 3 lab

> Thu thập 2026-06-02 qua SSH (plink) tới `dattqh-nat@192.168.122.171` (server/NAT) và
> `dattqh-client@192.168.122.172` (client). Cả 2: Ubuntu 24.04 LTS, systemd-networkd + netplan
> (cloud-init), rsyslog 8.2312.0, 4 GB RAM, 2 vCPU, `/swap.img` 2 GB.

## LAB 1 — SYSLOG (rsyslog server ↔ client) — ĐÃ VERIFY END-TO-END

### Server 171: /etc/rsyslog.d/10-remote-server.conf
```
module(load="imudp")
input(type="imudp" port="514")
module(load="imtcp")
input(type="imtcp" port="514")
template(name="RemoteHostFile" type="string"
         string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")
if ($fromhost-ip != "127.0.0.1") then {
    action(type="omfile" dynaFile="RemoteHostFile"
           fileCreateMode="0640" dirCreateMode="0755")
    stop
}
```

### Client 172: /etc/rsyslog.d/90-forward.conf
```
*.* action(type="omfwd" target="192.168.122.171" port="514" protocol="tcp"
           action.resumeRetryCount="100"
           queue.type="linkedList" queue.size="10000")
```

### Verify outputs (thật)
- `rsyslogd -N1` → `version 8.2312.0, config validation run (level 1) ... End of config validation run. Bye.`
- Server `ss -lntup | grep :514`:
  - `udp UNCONN 0.0.0.0:514` + `[::]:514` (imudp)
  - `tcp LISTEN 0.0.0.0:514` + `[::]:514` (imtcp)
- Client `ss -tnp | grep :514` → `ESTAB 192.168.122.172:59454 192.168.122.171:514 users:(("rsyslogd",...))`
- `/var/log/remote/dattqh-client/` sau khi forward: `systemd.log dattqh-client.log rsyslogd.log systemd-logind.log sshd.log` (owner syslog:syslog, mode 0640)
- Message nhận được: `2026-06-02T13:45:26+00:00 dattqh-client dattqh-client: LAB-SYSLOG-OK marker test1 from dattqh-client`

### FAIL/FIX thật (bắt được trong lúc làm)
- Triệu chứng: TCP ESTAB nhưng `/var/log/remote` rỗng, không có file.
- journal server: `omfile: creating parent directories for file '/var/log/remote/dattqh-client/CRON.log' failed: Permission denied [try https://www.rsyslog.com/e/2207]` → `Could not open dynamic file ... discarding message`.
- Nguyên nhân: rsyslog drop privilege xuống user `syslog` (`$PrivDropToUser syslog` trong /etc/rsyslog.conf), nhưng `/var/log/remote` do root tạo (mode 755) → user syslog không tạo subdir được.
- Fix: `sudo chown syslog:syslog /var/log/remote && sudo systemctl restart rsyslog`.

## LAB 2 — BOOT PROCESS — so sánh 2 VM cùng image

### NAT 171 (boot CHẬM)
- `systemd-analyze` → `Startup finished in 4.065s (kernel) + 2min 2.993s (userspace) = 2min 7.059s`
- `systemd-analyze blame` (top): `2min 131ms systemd-networkd-wait-online.service` · `17.836s apt-daily.service` · `4.490s apt-daily-upgrade.service` · `1.439s motd-news.service` · `1.287s pollinate.service`
- `systemctl --failed` → `systemd-networkd-wait-online.service loaded failed failed Wait for Network to be Configured`
- journal: `systemd-networkd-wait-online[821]: Timeout occurred while waiting for network connectivity.` → `Main process exited, code=exited, status=1/FAILURE` (timeout mặc định 120s)

### CLIENT 172 (boot NHANH)
- `systemd-analyze` → `4.322s (kernel) + 4.663s (userspace) = 8.985s`
- `systemd-analyze blame` (top): `1.140s systemd-networkd-wait-online.service` · `1.085s systemd-networkd.service` · `1.062s snapd.seeded.service`
- `systemctl --failed` → (rỗng, không unit nào fail)
- journal: `Finished systemd-networkd-wait-online.service` (xong ~1s)

### Chung 2 VM
- `cat /proc/cmdline` → `BOOT_IMAGE=/vmlinuz-6.8.0-... root=/dev/mapper/ubuntu--vg-ubuntu--lv ro`
- `systemctl get-default` → `graphical.target`
- GRUB: `/boot/grub/grub.cfg` tồn tại; `/etc/default/grub`: `GRUB_TIMEOUT_STYLE=hidden`, `GRUB_TIMEOUT=0`
- initramfs: `/boot/initrd.img-6.8.0-31-generic` = 73M
- netplan (cloud-init generated): ens160 `dhcp4: true` + static `192.168.122.x/24` + routes/nameservers
- `networkctl`: ens160 `routable configured`; lo `unmanaged`

### Fix boot chậm (documented)
- Netplan: thêm `optional: true` cho interface để wait-online không chặn (netplan.io ref), hoặc bỏ `dhcp4: true` nếu chỉ dùng static.
- Hoặc `systemctl disable systemd-networkd-wait-online.service` (chỉ khi không cần "network online" gate trước multi-user).

## LAB 3 — SWAP — cả 2 VM

- `swapon --show` → `NAME=/swap.img TYPE=file SIZE=2G PRIO=-2`; USED: 171=268K, 172=0B
- `free -h` 171: `Mem total 3.8Gi used 501Mi free 1.0Gi buff/cache 2.6Gi available 3.3Gi` · `Swap total 2.0Gi used 268Ki`
- `free -h` 172: `Mem available 3.4Gi` · `Swap used 0B`
- `/proc/swaps` → `/swap.img file 2044924 <used> -2`
- `/proc/sys/vm/swappiness` = `60`; `vfs_cache_pressure` = `100`
- `/proc/meminfo`: `SwapTotal 2044924 kB`, `SwapFree 2044656 kB` (171), `SwapCached 92 kB` (171) / `0` (172)
- `/etc/fstab`: `/swap.img none swap sw 0 0`
- `vmstat 1 2` cột `si`/`so` = 0 (không paging active lúc đo)
- RAM 4 GB, swap 2 GB (file, không phải partition)
