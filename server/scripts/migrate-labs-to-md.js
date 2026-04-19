#!/usr/bin/env node
// One-time migration: labs/<phase>/*.html → DB (topics + sections as markdown).
//
// Usage:
//   node server/scripts/migrate-labs-to-md.js --dry-run    # preview
//   node server/scripts/migrate-labs-to-md.js              # write DB + backup quiz JSON
//   node server/scripts/migrate-labs-to-md.js --archive    # also move HTML → labs/_archive/

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const labsRoot = resolve(projectRoot, 'labs');
const archiveRoot = resolve(labsRoot, '_archive');
const quizBackupRoot = resolve(projectRoot, 'data', 'quiz-backup');

const DRY = process.argv.includes('--dry-run');
const ARCHIVE = process.argv.includes('--archive');

const PHASES = [
  { dir: '01-networking',     slug: 'networking',       title: 'Networking' },
  { dir: '02-linux',          slug: 'linux',            title: 'Linux' },
  { dir: '03-docker',         slug: 'docker',           title: 'Docker' },
  { dir: '04-python-sysadmin',slug: 'python-sysadmin',  title: 'Python cho Sysadmin' },
  { dir: '05-ansible',        slug: 'ansible',          title: 'Ansible' },
  { dir: '06-monitoring',     slug: 'monitoring',       title: 'Monitoring' },
  { dir: '07-logging',        slug: 'logging',          title: 'Logging' },
  { dir: '08-cicd',           slug: 'cicd',             title: 'CI/CD' },
];

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

// Preserve language class on fenced code blocks.
turndown.addRule('fencedCodeLang', {
  filter: (node) =>
    node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE',
  replacement: (_content, node) => {
    const code = node.firstChild;
    const cls = code.getAttribute('class') || '';
    const lang = cls.match(/language-(\w+)/)?.[1] || '';
    const text = code.textContent || '';
    return `\n\n\`\`\`${lang}\n${text.replace(/\n+$/, '')}\n\`\`\`\n\n`;
  },
});

// Drop nav/script/style/interactive widget containers from MD output.
turndown.remove(['script', 'style', 'nav', 'noscript']);

function extractQuizJson(html, phaseSlug, fileSlug) {
  const m = html.match(/data\.quiz\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return null;
  try {
    // eslint-disable-next-line no-new-func
    const quiz = new Function(`return ${m[1]}`)();
    if (!DRY) {
      mkdirSync(quizBackupRoot, { recursive: true });
      writeFileSync(
        resolve(quizBackupRoot, `${phaseSlug}__${fileSlug}.json`),
        JSON.stringify(quiz, null, 2),
        'utf8'
      );
    }
    return quiz;
  } catch {
    return null;
  }
}

function htmlToSection(html, phaseSlug, fileSlug) {
  const $ = cheerio.load(html);

  $('.lab-footer, .lab-nav, .reading-bookmark, .lab-scroll-progress').remove();
  $('script[src], link').remove();

  const title = ($('h1').first().text() || fileSlug).trim();

  let $root = $('main, article, .lab-container');
  if (!$root.length) $root = $('body');

  $root.find('h1').first().remove(); // title goes to section.title

  // Strip inline styles since they don't translate to markdown.
  $root.find('[style]').removeAttr('style');

  const bodyHtml = $root.html() || '';
  let bodyMd = turndown.turndown(bodyHtml)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const quiz = extractQuizJson(html, phaseSlug, fileSlug);
  if (quiz?.length) {
    bodyMd +=
      `\n\n<!-- Quiz backed up to data/quiz-backup/${phaseSlug}__${fileSlug}.json -->\n` +
      '```quiz\n' +
      quiz.map((q) => `Q: ${q.question || q.q || ''}\nA: ${q.answer || q.a || ''}`).join('\n\n') +
      '\n```\n';
  }

  return { title, body_md: bodyMd, quiz_count: quiz?.length || 0 };
}

async function run() {
  const { default: db } = await import('../db/sqlite-client.js');

  const upsertTopic = db.prepare(`
    INSERT INTO topics (slug, title, order_idx)
    VALUES (?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET title=excluded.title, order_idx=excluded.order_idx
    RETURNING id
  `);
  const upsertSection = db.transaction((args) => {
    const existing = db.prepare('SELECT id FROM sections WHERE topic_id=? AND slug=?')
      .get(args.topic_id, args.slug);
    if (existing) {
      db.prepare('UPDATE sections SET title=?, body_md=?, order_idx=?, updated_at=? WHERE id=?')
        .run(args.title, args.body_md, args.order_idx, Math.floor(Date.now() / 1000), existing.id);
      return existing.id;
    }
    return db.prepare(
      'INSERT INTO sections (topic_id, slug, title, body_md, order_idx, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(
      args.topic_id, args.slug, args.title, args.body_md, args.order_idx,
      Math.floor(Date.now() / 1000)
    ).lastInsertRowid;
  });

  const report = [];

  for (let phaseIdx = 0; phaseIdx < PHASES.length; phaseIdx++) {
    const phase = PHASES[phaseIdx];
    const phaseDir = resolve(labsRoot, phase.dir);
    if (!existsSync(phaseDir)) {
      console.log(`[skip] ${phase.dir} (not found)`);
      continue;
    }

    let topicId;
    if (!DRY) {
      topicId = upsertTopic.get(phase.slug, phase.title, phaseIdx).id;
    } else {
      topicId = -1;
    }

    const files = readdirSync(phaseDir)
      .filter((f) => f.endsWith('.html'))
      .sort();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = resolve(phaseDir, file);
      const html = readFileSync(filePath, 'utf8');
      const fileSlug = basename(file, '.html').replace(/^\d+-/, '');
      const { title, body_md, quiz_count } = htmlToSection(html, phase.slug, fileSlug);

      if (DRY) {
        console.log(`\n--- [DRY] ${phase.slug}/${fileSlug} (${title}) — ${body_md.length} chars, ${quiz_count} quiz ---`);
        console.log(body_md.slice(0, 400) + (body_md.length > 400 ? '\n...' : ''));
      } else {
        upsertSection({
          topic_id: topicId,
          slug: fileSlug,
          title,
          body_md,
          order_idx: i,
        });
        console.log(`✓ ${phase.slug}/${fileSlug}  (${body_md.length} chars, quiz=${quiz_count})`);
      }
      report.push({ phase: phase.slug, slug: fileSlug, title, bytes: body_md.length, quiz: quiz_count });
    }
  }

  console.log(`\nTotal sections processed: ${report.length}`);

  if (!DRY && ARCHIVE) {
    mkdirSync(archiveRoot, { recursive: true });
    for (const phase of PHASES) {
      const src = resolve(labsRoot, phase.dir);
      const dst = resolve(archiveRoot, phase.dir);
      if (existsSync(src) && !existsSync(dst)) {
        renameSync(src, dst);
        console.log(`✓ archived ${phase.dir} → _archive/`);
      }
    }
  } else if (!DRY) {
    console.log('Skipped archive step. Re-run with --archive to move HTML into labs/_archive/.');
  }
}

run().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
