/**
 * patch-exercise-demo-screenshots.js
 *
 * Thay demo[] của 3 exercise (syslog, linux-boot-process, linux-swap) thành dạng
 * per-phase: ảnh terminal THẬT (src full URL để copy markdown sang hệ khác vẫn xem
 * được) + caption ngắn. Bỏ text output dài (ảnh đã thể hiện). guide[] giữ nguyên.
 *
 * Ảnh tĩnh: app/public/exercises/<slug>/screenshots/*.png (deploy theo FE bundle).
 *
 * Usage: node --env-file=.env.development server/scripts/patch-exercise-demo-screenshots.js
 */

import crypto from 'crypto';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Exercise } from '../db/models/index.js';

const BASE = 'https://hoc-cloud.inetdev.io.vn';
const img = (slug, file) => `${BASE}/exercises/${slug}/screenshots/${file}`;

const DEMOS = {
  syslog: [
    { step: 1, what: '<strong>Server lắng nghe cổng 514</strong>',
      screenshot: { src: img('syslog', 'syslog-1-server-listen.png'),
        alt: 'rsyslogd -N1 validate ok; ss thấy LISTEN UDP+TCP 514',
        caption: 'Validate config + <code>ss -lntup</code>: rsyslog server nghe cả UDP lẫn TCP cổng 514.' } },
    { step: 2, what: '<strong>Client forward log qua TCP</strong>',
      screenshot: { src: img('syslog', 'syslog-2-client-forward.png'),
        alt: 'cat 90-forward.conf; ss ESTAB tới 171:514; logger test',
        caption: '<code>omfwd</code> TCP tới <code>192.168.122.171:514</code> (ESTAB) + <code>logger</code> gửi message mốc.' } },
    { step: 3, what: '<strong>FAIL — permission denied (lỗi 2207)</strong>',
      screenshot: { src: img('syslog', 'syslog-3-fail-permission.png'),
        alt: 'journal: Could not open dynamic file ... discarding message; find rỗng',
        caption: 'Thư mục <code>/var/log/remote</code> thuộc <code>root</code> → user <code>syslog</code> không tạo subdir → message bị discard.' } },
    { step: 4, what: '<strong>FIX — chown syslog → log nhận được</strong>',
      screenshot: { src: img('syslog', 'syslog-4-fix-received.png'),
        alt: 'sau chown syslog:syslog, find ra file, grep thấy LAB-SYSLOG-OK',
        caption: 'Sau <code>chown syslog:syslog</code>: log client lưu theo cây <code>/var/log/remote/&lt;host&gt;/&lt;prog&gt;.log</code>.' } },
    { step: 5, what: '<strong>Demo thực tế — SSH vào client 172, server 171 nhận log sshd</strong>',
      screenshot: { src: img('syslog', 'syslog-5-ssh-auth.png'),
        alt: 'grep sshd.log trên server 171: Failed/Accepted/Invalid user forward từ client 172',
        caption: 'SSH vào <code>192.168.122.172</code> (1 đăng nhập đúng + 1 sai mật khẩu): sự kiện <code>sshd</code> trên client forward TCP 514 về server, lưu tại <code>/var/log/remote/dattqh-client/sshd.log</code> — log tập trung bắt được cả <code>Accepted</code> hợp lệ lẫn <code>Failed/Invalid user</code> (dò mật khẩu), không cần đăng nhập vào từng máy.' } },
  ],
  'linux-boot-process': [
    { step: 1, what: '<strong>Đo boot + tìm thủ phạm (VM chậm 171)</strong>',
      screenshot: { src: img('linux-boot-process', 'boot-1-analyze-blame.png'),
        alt: 'systemd-analyze 2min; blame đứng đầu networkd-wait-online',
        caption: '<code>systemd-analyze</code>: userspace 2 phút; <code>blame</code> đứng đầu = <code>systemd-networkd-wait-online</code>.' } },
    { step: 2, what: '<strong>Unit FAILED + lý do (journal)</strong>',
      screenshot: { src: img('linux-boot-process', 'boot-2-failed-journal.png'),
        alt: 'systemctl --failed liệt kê wait-online; journal Timeout 120s',
        caption: '<code>systemctl --failed</code> + journal: wait-online timeout 120s → <code>status=1/FAILURE</code>.' } },
    { step: 3, what: '<strong>So sánh VM boot nhanh (172)</strong>',
      screenshot: { src: img('linux-boot-process', 'boot-3-fast-compare.png'),
        alt: 'systemd-analyze 9s; wait-online 1.1s; no failed unit',
        caption: 'Cùng image: boot <strong>9s</strong>, wait-online xong 1.1s, không unit nào FAILED → thủ phạm là service treo, không phải phần cứng.' } },
  ],
  'linux-swap': [
    { step: 1, what: '<strong>Trạng thái swap hiện tại</strong>',
      screenshot: { src: img('linux-swap', 'swap-1-baseline.png'),
        alt: 'swapon --show /swap.img 2G; free -h; swappiness 60',
        caption: '<code>swapon --show</code>: swap = file <code>/swap.img</code> 2G, priority -2; swappiness 60.' } },
    { step: 2, what: '<strong>Tạo + bật swapfile phụ</strong>',
      screenshot: { src: img('linux-swap', 'swap-2-add-swapfile.png'),
        alt: 'fallocate+mkswap+swapon; swapon --show 2 swap; free 2.5Gi',
        caption: 'Swapfile phụ 512M nhận priority <code>-3</code>; tổng swap 2.0Gi → 2.5Gi.' } },
    { step: 3, what: '<strong>swappiness + theo dõi paging</strong>',
      screenshot: { src: img('linux-swap', 'swap-3-swappiness-vmstat.png'),
        alt: 'sysctl vm.swappiness 10 rồi 60; vmstat si/so 0',
        caption: '<code>sysctl</code> đổi swappiness runtime; <code>vmstat</code> <code>si/so=0</code> (không thrash).' } },
  ],
};

function hash(slug, demo) {
  return crypto.createHash('sha256').update(JSON.stringify({ slug, demo })).digest('hex');
}

async function main() {
  await connectMongo();
  try {
    for (const [slug, demo] of Object.entries(DEMOS)) {
      const ex = await Exercise.findOne({ slug });
      if (!ex) { console.log(`[skip] ${slug} không tồn tại`); continue; }
      ex.demo = demo;
      ex.markModified('demo');
      ex.contentHash = hash(slug, demo);
      await ex.save();
      console.log(`[ok] ${slug}: demo → ${demo.length} ảnh (full-URL src)`);
    }
    console.log('[done] patched demo screenshots');
  } finally {
    await disconnectMongo();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
