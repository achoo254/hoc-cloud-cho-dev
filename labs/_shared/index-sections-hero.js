// index-sections-hero.js — Phase 02: Hero, How It Works, Features renderers.
// Vanilla JS, no dependencies. Design tokens from lab-template.css.

import { escapeHtml } from './index-sections-utils.js';

// ===== Hero =====

export function renderHero(mount, catalog) {
  if (!mount) return;

  const allLabs = catalog.flatMap(g => g.labs);
  const firstReady = allLabs.find(l => l.status === 'ready');
  const labsReady = allLabs.filter(l => l.status === 'ready').length;
  const totalCards = allLabs.reduce((s, l) => s + (l.cards || 0), 0);

  mount.innerHTML = `
    <section class="hero-section" aria-labelledby="hero-h1">
      <div class="hero-text">
        <h1 id="hero-h1">Học DevOps kiểu WHY-first</h1>
        <p class="hero-sub">1 lab = 1 buổi · quiz + flashcard SM-2 · offline-first</p>
        <div class="hero-ctas">
          <button
            class="btn-primary"
            onclick="document.querySelector('#roadmap-mount')?.scrollIntoView({behavior:'smooth',block:'start'})"
            aria-label="Xem learning roadmap"
          >Xem roadmap ↓</button>
          ${firstReady
            ? `<a class="btn-secondary" href="${escapeHtml(firstReady.href)}" aria-label="Bắt đầu lab đầu tiên">Bắt đầu ngay</a>`
            : ''}
        </div>
      </div>
      <div class="hero-metric">
        <div class="metric-row">
          <span class="metric-chip">${labsReady} labs</span>
          <span class="metric-chip">${totalCards} flashcards</span>
        </div>
        <div class="code-block hero-npm">
          npm install &amp;&amp; npm start
          <button
            class="copy-btn"
            onclick="navigator.clipboard.writeText('npm install &amp;&amp; npm start');this.textContent='✓ copied';setTimeout(()=>this.textContent='copy',1800)"
            aria-label="Copy lệnh npm install && npm start"
          >copy</button>
        </div>
      </div>
    </section>`;
}

// ===== How It Works =====

const HOW_STEPS = [
  { num: '01', title: 'Đọc WHY-first', desc: 'Hiểu lý do tồn tại trước khi xem cú pháp.' },
  { num: '02', title: 'Làm Quiz',       desc: 'Kiểm tra nhanh ngay cuối bài đọc.' },
  { num: '03', title: 'Ôn Flashcard SM-2', desc: 'Thuật toán chọn đúng thẻ cần ôn hôm nay.' },
  { num: '04', title: 'Revisit',        desc: 'Quay lại lab bất cứ lúc nào, bookmark tự lưu.' },
];

export function renderHowItWorks(mount) {
  if (!mount) return;
  const steps = HOW_STEPS.map((s, i) => `
    <li class="how-step">
      <span class="how-num" aria-hidden="true">${s.num}</span>
      <strong class="how-title">${s.title}</strong>
      <span class="how-desc">${s.desc}</span>
    </li>
    ${i < HOW_STEPS.length - 1 ? '<li class="how-arrow" aria-hidden="true">→</li>' : ''}
  `).join('');
  mount.innerHTML = `
    <section class="how-section" aria-labelledby="how-h2">
      <h2 id="how-h2" class="section-title">Cách học</h2>
      <ol class="how-list" role="list">${steps}</ol>
    </section>`;
}

// ===== Features =====

const FEATURES = [
  { icon: '🧠', title: 'WHY-first',         desc: 'Hiểu vì sao trước khi học cách làm.' },
  { icon: '🔁', title: 'Spaced Repetition', desc: 'SM-2 algorithm chọn thẻ cần ôn đúng lúc.' },
  { icon: '📴', title: 'Offline-first',     desc: 'localStorage sync, không mất tiến độ.' },
  { icon: '🌐', title: 'Multi-device',      desc: 'Cookie UUID đồng bộ progress cross-device.' },
];

export function renderFeatures(mount) {
  if (!mount) return;
  const tiles = FEATURES.map(f => `
    <div class="feature-tile">
      <span class="feature-icon" aria-hidden="true">${f.icon}</span>
      <strong class="feature-title">${f.title}</strong>
      <span class="feature-desc">${f.desc}</span>
    </div>`).join('');
  mount.innerHTML = `
    <section class="features-section" aria-labelledby="features-h2">
      <h2 id="features-h2" class="section-title">Tính năng</h2>
      <div class="features-grid" role="list">${tiles}</div>
    </section>`;
}
