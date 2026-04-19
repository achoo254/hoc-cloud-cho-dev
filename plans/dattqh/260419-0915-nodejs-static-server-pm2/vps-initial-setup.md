# VPS Initial Setup — CentOS 9

One-time setup before the first CI deploy. Run as the SSH user that GitHub Actions will use (must have `sudo` for packages + nginx).

## 1. Install Node.js 20 LTS + PM2

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v   # should print v20.x
sudo npm install -g pm2
pm2 -v
```

## 2. Create app directories

```bash
sudo mkdir -p /var/www/hoc-cloud-cho-dev/releases
sudo chown -R $USER:$USER /var/www/hoc-cloud-cho-dev
```

## 3. SSH deploy key (GitHub Actions → VPS)

On your local machine (or GitHub Actions will generate one — simpler to make locally):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hoc-cloud-deploy -C "gh-actions-hoc-cloud" -N ""
```

- Copy the **private key** content → GitHub repo Settings → Secrets → Actions → `VPS_SSH_KEY`
- Copy the **public key** content → append to VPS `~/.ssh/authorized_keys` of the deploy user:

```bash
# on VPS
echo 'ssh-ed25519 AAAA... gh-actions-hoc-cloud' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Also add these GitHub secrets:
- `VPS_HOST` — VPS IP or hostname
- `VPS_USER` — the SSH username (the existing user you'll use)
- `VPS_SSH_PORT` — typically `22`

## 4. Firewall (firewalld)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
# Port 8387 stays internal (127.0.0.1 only) — do NOT open it publicly
```

## 5. SELinux — allow nginx to proxy to localhost

CentOS 9 has SELinux enforcing by default. Nginx proxy_pass to localhost is blocked unless:

```bash
sudo setsebool -P httpd_can_network_connect 1
```

Verify: `getsebool httpd_can_network_connect` → should be `on`.

## 6. Nginx site config

```bash
sudo cp /tmp/nginx.conf.example /etc/nginx/conf.d/hoc-cloud.conf
# (or upload deploy/nginx.conf.example manually)
sudo nginx -t
sudo systemctl reload nginx
```

Test HTTP first: `curl -H "Host: hoc-cloud.inetdev.io.vn" http://localhost/` should reach the Node app once a release is deployed (step 8).

## 7. DNS

Point `hoc-cloud.inetdev.io.vn` A record → VPS IP. Wait for propagation (`dig hoc-cloud.inetdev.io.vn`).

## 8. First deploy — trigger workflow

From GitHub: Actions → Deploy to VPS → Run workflow (or push a commit to `master`).

After success, verify on VPS:

```bash
ls /var/www/hoc-cloud-cho-dev/releases/        # one timestamp dir
readlink /var/www/hoc-cloud-cho-dev/current    # -> releases/<timestamp>
pm2 list                                        # hoc-cloud-labs online
curl http://127.0.0.1:8387/                     # returns labs/index.html
curl -H "Host: hoc-cloud.inetdev.io.vn" http://localhost/   # via nginx
```

## 9. Enable PM2 auto-start on boot

```bash
pm2 startup
# follow the sudo command it prints, then:
pm2 save
```

## 10. HTTPS via Certbot

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hoc-cloud.inetdev.io.vn
# Pick "redirect HTTP -> HTTPS" when asked.
```

Cert auto-renew is handled by the `certbot-renew.timer` systemd unit (check: `systemctl list-timers | grep certbot`).

## Rollback

```bash
cd /var/www/hoc-cloud-cho-dev
ls -1t releases/                         # pick previous release
ln -sfn releases/<PREVIOUS> current
pm2 reload hoc-cloud-labs
```

## Troubleshooting

| Symptom | Check |
|---|---|
| 502 Bad Gateway from nginx | `pm2 logs hoc-cloud-labs`; `curl http://127.0.0.1:8387/` |
| SELinux denial in `/var/log/audit/audit.log` | `setsebool -P httpd_can_network_connect 1` |
| `pm2` not found after reboot | `pm2 startup` was not run; run it + `pm2 save` |
| CI SSH fails | Verify `VPS_SSH_KEY` is the **private** key (full `-----BEGIN...` block) |
