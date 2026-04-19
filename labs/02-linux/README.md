# Lab 02 — Linux

## Files
- `netplan-static.yaml` — netplan với static IP + 2 NIC
- `sshd-hardened.conf` — disable password auth
- `backup-mysql.sh` — script backup DB + xoá file cũ
- `vimrc-minimal` — cấu hình vim tối thiểu

## Chạy thử

### Static IP
```bash
sudo cp netplan-static.yaml /etc/netplan/01-static.yaml
sudo netplan apply
```

### SSH hardening
```bash
# Sinh key trên client
ssh-keygen -t ed25519 -C "dev@lab"
ssh-copy-id user@<vm>

# Disable password
sudo cp sshd-hardened.conf /etc/ssh/sshd_config.d/99-hardened.conf
sudo systemctl reload ssh
```

### Backup
```bash
chmod +x backup-mysql.sh
./backup-mysql.sh
# Cron
echo "0 2 * * * /path/to/backup-mysql.sh" | crontab -
```
