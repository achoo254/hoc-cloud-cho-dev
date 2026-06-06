/**
 * migrate-linux-labs-to-exercises.js
 *
 * MOVE 3 lab Linux (syslog, linux-boot-process, linux-swap) từ collection `labs`
 * sang collection `exercises` (mục Bài Tập owner-gated), rồi XÓA khỏi `labs`.
 *
 * Map: brief (đề bài, hardcoded per-slug) + guide (từ tryAtHome phase: title+why+cmd+observeWith)
 *      + demo (từ tryAtHome steps do/expect + analysis). Bỏ misconceptions/quiz/flashcards/tldr/walkthrough.
 *
 * An toàn: upsert exercise + verify TRƯỚC khi xóa lab. Backup lab JSON ra disk trước khi xóa.
 * (Content lab cũng còn nguyên trong plans/.../260602-2027/content-drafts/.)
 *
 * Usage:
 *   node --env-file=.env.development server/scripts/migrate-linux-labs-to-exercises.js
 */

import crypto from 'crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connectMongo, disconnectMongo } from '../db/mongo-client.js';
import { Lab, Exercise } from '../db/models/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backupDir = join(
  __dirname, '..', '..', 'plans', 'dattqh',
  '260602-2112-exercises-section-owner-gated', 'backup',
);

// Đề bài (yêu cầu giảng viên) cho từng bài — phần KHÔNG suy ra được từ lab content.
const BRIEFS = {
  syslog: {
    topic: 'linux',
    tags: ['syslog', 'rsyslog', 'logging'],
    brief:
      'Triển khai hệ thống log tập trung với <strong>rsyslog</strong> trên 2 node Linux: ' +
      'một node làm <strong>syslog server</strong> nhận log qua cổng 514, một node làm ' +
      '<strong>client</strong> forward toàn bộ log về server và lưu tách theo host/program ' +
      '(<code>/var/log/remote/&lt;host&gt;/&lt;program&gt;.log</code>). Verify log client xuất hiện ' +
      'trên server; xử lý lỗi quyền ghi của rsyslog.',
  },
  'linux-boot-process': {
    topic: 'linux',
    tags: ['boot', 'systemd', 'systemd-analyze'],
    brief:
      'Phân tích quá trình khởi động Linux: đo thời gian boot và <strong>xác định service làm ' +
      'chậm boot</strong> bằng <code>systemd-analyze</code> (blame / critical-chain / --failed), ' +
      'giải thích 5 tầng boot (firmware → GRUB → kernel → initramfs → systemd) và đề xuất cách ' +
      'khắc phục boot chậm.',
  },
  'linux-swap': {
    topic: 'linux',
    tags: ['swap', 'memory', 'swappiness'],
    brief:
      'Tìm hiểu và cấu hình <strong>swap</strong> trên Linux: đọc trạng thái swap hiện tại, ' +
      'tạo/bật swapfile phụ, điều chỉnh <code>vm.swappiness</code>, theo dõi paging (<code>vmstat</code>), ' +
      'và trình bày khi nào nên / không nên dùng swap.',
  },
};

const stripTags = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const firstSentence = (s) => {
  const t = stripTags(s);
  const m = t.match(/^.*?[.。](\s|$)/);
  return (m ? m[0] : t).trim();
};

function labToExercise(lab, meta) {
  const guide = [];
  const demo = [];
  let g = 0, d = 0;

  for (const phase of lab.tryAtHome || []) {
    g++;
    const intro = firstSentence(phase.why);
    guide.push({
      step: g,
      instruction:
        `<strong>${phase.title || `Bước ${g}`}</strong>` + (intro ? ` — ${intro}` : ''),
      ...(phase.cmd ? { command: phase.cmd } : {}),
      ...(phase.observeWith ? { note: `Quan sát: ${phase.observeWith}` } : {}),
    });

    for (const s of phase.steps || []) {
      d++;
      demo.push({ step: d, what: s.do, output: s.expect });
    }
    if (phase.analysis) {
      d++;
      demo.push({
        step: d,
        what: `<strong>Phân tích — ${stripTags(phase.title)}</strong>: ${phase.analysis.observation}`,
        output: phase.analysis.mechanism,
        note: `Bài học: ${phase.analysis.lesson}`,
      });
    }
  }

  return {
    slug: lab.slug,
    title: lab.title,
    topic: meta.topic,
    tags: meta.tags,
    source: 'Bài tập thực hành',
    brief: meta.brief,
    estimatedMinutes: lab.estimatedMinutes,
    guide,
    demo,
    references: [],
  };
}

function contentHash(ex) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ brief: ex.brief, guide: ex.guide, demo: ex.demo }))
    .digest('hex');
}

async function upsertExercise(data) {
  const existing = await Exercise.findOne({ slug: data.slug });
  const doc = existing ?? new Exercise({ slug: data.slug });
  doc.title = data.title;
  doc.topic = data.topic;
  doc.tags = data.tags;
  doc.source = data.source;
  doc.brief = data.brief;
  doc.estimatedMinutes = data.estimatedMinutes;
  doc.guide = data.guide;
  doc.demo = data.demo;
  doc.references = data.references;
  doc.contentHash = contentHash(data);
  for (const f of ['tags', 'guide', 'demo', 'references']) doc.markModified(f);
  await doc.save();
  return doc;
}

async function main() {
  mkdirSync(backupDir, { recursive: true });
  await connectMongo();
  try {
    for (const slug of Object.keys(BRIEFS)) {
      console.log(`\n=== ${slug} ===`);
      const lab = await Lab.findOne({ slug }).lean();
      if (!lab) {
        console.log(`  [skip] lab "${slug}" không tồn tại trong collection labs`);
        continue;
      }
      // 1) backup lab JSON
      const backupPath = join(backupDir, `lab-${slug}-pre-move.json`);
      writeFileSync(backupPath, JSON.stringify(lab, null, 2));
      console.log('  [backup]', backupPath);

      // 2) transform + upsert exercise
      const ex = labToExercise(lab, BRIEFS[slug]);
      const saved = await upsertExercise(ex);
      console.log(`  [exercise] saved guide=${ex.guide.length} demo=${ex.demo.length} hash=${saved.contentHash.slice(0, 12)}`);

      // 3) verify exercise tồn tại TRƯỚC khi xóa lab
      const check = await Exercise.findOne({ slug }).lean();
      if (!check || !check.guide?.length) {
        console.error(`  [ABORT] exercise "${slug}" chưa lưu đúng — KHÔNG xóa lab`);
        continue;
      }

      // 4) xóa lab (findOneAndDelete → trigger removeFromMeili nếu Meili reachable)
      await Lab.findOneAndDelete({ slug });
      console.log(`  [moved] lab "${slug}" đã xóa khỏi labs collection`);
    }

    const exCount = await Exercise.countDocuments();
    const labCount = await Lab.countDocuments();
    console.log(`\n[done] exercises=${exCount} labs=${labCount}`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
