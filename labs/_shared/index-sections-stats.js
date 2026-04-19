// index-sections-stats.js — Phase 03: Resume strip, Stats tiles, Heatmap SVG renderers.

import { escapeHtml, formatRelTime, formatTime } from './index-sections-utils.js';

// ===== Resume strip (3 cards) =====

export function renderResume(mount, stats) {
  if (!mount) return;
  const cards = [];

  if (stats.lastBookmark) {
    const { lab, pos } = stats.lastBookmark;
    const href = pos?.anchor
      ? `${escapeHtml(lab.href)}#${encodeURIComponent(pos.anchor)}`
      : escapeHtml(lab.href);
    cards.push(`
      <a class="resume-card" href="${href}" aria-label="Tiếp tục đọc ${escapeHtml(lab.title)}">
        <span class="resume-icon" aria-hidden="true">📍</span>
        <div class="resume-body">
          <strong class="resume-label">Tiếp tục đọc</strong>
          <span class="resume-val">${escapeHtml(lab.title)}</span>
          <span class="resume-sub">${pos?.pct ?? 0}% · ${formatRelTime(pos?.ts)}</span>
        </div>
      </a>`);
  }

  if (stats.dueTotal > 0) {
    cards.push(`
      <button class="resume-card" onclick="document.querySelector('#phases-mount')?.scrollIntoView({behavior:'smooth'})"
        aria-label="${stats.dueTotal} thẻ cần ôn hôm nay">
        <span class="resume-icon" aria-hidden="true">🔥</span>
        <div class="resume-body">
          <strong class="resume-label">Cần ôn hôm nay</strong>
          <span class="resume-val">${stats.dueTotal} thẻ</span>
          <span class="resume-sub">Cuộn xuống catalog để ôn</span>
        </div>
      </button>`);
  }

  if (stats.streak > 0) {
    cards.push(`
      <button class="resume-card" onclick="document.querySelector('#stats-mount')?.scrollIntoView({behavior:'smooth'})"
        aria-label="${stats.streak} ngày streak">
        <span class="resume-icon" aria-hidden="true">⚡</span>
        <div class="resume-body">
          <strong class="resume-label">Streak</strong>
          <span class="resume-val">${stats.streak} ngày</span>
          <span class="resume-sub">Duy trì mỗi ngày ôn ít nhất 1 thẻ</span>
        </div>
      </button>`);
  }

  if (cards.length === 0) { mount.hidden = true; return; }

  mount.innerHTML = `
    <section class="resume-section" aria-label="Resume your progress">
      <div class="resume-strip">${cards.join('')}</div>
    </section>`;
}

// ===== Stats tiles =====

export function renderStats(mount, stats, catalog) {
  if (!mount) return;
  const totalLabs = catalog ? catalog.flatMap(g => g.labs).length : 0;
  const quizDisplay = stats.quizAvg > 0 ? `${Math.round(stats.quizAvg)}%` : '—';
  const tiles = [
    { label: 'Labs done', value: `${stats.labsDone}`, sub: `/ ${totalLabs} labs` },
    { label: 'Cards mastered', value: `${stats.cardsMastered}`, sub: 'interval ≥ 21d' },
    { label: 'Quiz avg', value: quizDisplay, sub: 'điểm trung bình' },
    { label: 'Tổng thời gian', value: formatTime(stats.totalMin), sub: 'ước tính đọc + ôn' },
  ];
  const tilesHtml = tiles.map(t => `
    <div class="stat-tile">
      <span class="stat-label">${t.label}</span>
      <span class="stat-value">${t.value}</span>
      <span class="stat-sub">${t.sub}</span>
    </div>`).join('');

  mount.innerHTML = `
    <section class="stats-section" aria-labelledby="stats-h2">
      <h2 id="stats-h2" class="section-title">Tiến độ của bạn</h2>
      <div class="stats-grid">${tilesHtml}</div>
    </section>`;
}

// ===== Heatmap SVG =====

const CELL = 12; // px, desktop
const GAP = 2;
const COLS = 12; // weeks
const ROWS = 7;  // days

export function renderHeatmap(mount, stats) {
  if (!mount) return;
  // Build 84-cell map keyed by YYYY-MM-DD
  const dateMap = new Map((stats.heatmap || []).map(d => [d.date, d.count]));

  // Generate last 84 days starting from oldest
  const today = new Date();
  const cells = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: dateMap.get(key) || 0 });
  }

  // SVG: 12 columns (weeks) × 7 rows (Mon-Sun)
  // Cells arranged: col = week index, row = day-of-week (0=Mon)
  const W = COLS * (CELL + GAP) - GAP;
  const H = ROWS * (CELL + GAP) - GAP;

  const rects = cells.map((c, idx) => {
    const col = Math.floor(idx / ROWS);
    const row = idx % ROWS;
    const x = col * (CELL + GAP);
    const y = row * (CELL + GAP);
    const level = bucketLevel(c.count);
    return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"
      class="hm-cell hm-${level}"
      data-date="${c.date}" data-count="${c.count}"
      aria-label="${c.date}: ${c.count} reviews"/>`;
  }).join('');

  const tooltip = `<div class="hm-tooltip" id="hm-tooltip" role="tooltip" aria-hidden="true"></div>`;
  const legend = `
    <div class="hm-legend" aria-hidden="true">
      <span class="hm-legend-label">ít</span>
      ${[0,1,2,3,4].map(l => `<span class="hm-cell hm-${l} hm-legend-cell"></span>`).join('')}
      <span class="hm-legend-label">nhiều</span>
    </div>`;

  mount.innerHTML = `
    <section class="heatmap-section" aria-labelledby="heatmap-h2">
      <h2 id="heatmap-h2" class="section-title">Hoạt động 12 tuần</h2>
      <div class="hm-wrap">
        <div class="hm-scroll" role="img" aria-label="Activity heatmap last 12 weeks">
          <svg class="hm-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rects}</svg>
          ${tooltip}
        </div>
        ${legend}
      </div>
    </section>`;

  wireHeatmapTooltip(mount);
}

function bucketLevel(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function wireHeatmapTooltip(mount) {
  const tip = mount.querySelector('#hm-tooltip');
  if (!tip) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  mount.querySelectorAll('.hm-cell[data-date]').forEach(cell => {
    cell.addEventListener('mouseenter', e => {
      const date = cell.dataset.date;
      const count = cell.dataset.count;
      tip.textContent = `${date}: ${count} reviews`;
      tip.removeAttribute('aria-hidden');
      tip.style.display = 'block';
      positionTip(e, tip);
    });
    cell.addEventListener('mousemove', e => positionTip(e, tip));
    cell.addEventListener('mouseleave', () => {
      tip.style.display = 'none';
      tip.setAttribute('aria-hidden', 'true');
    });
  });

  function positionTip(e, tip) {
    if (prefersReduced) return;
    const rect = mount.getBoundingClientRect();
    tip.style.left = `${e.clientX - rect.left + 8}px`;
    tip.style.top = `${e.clientY - rect.top - 28}px`;
  }
}
