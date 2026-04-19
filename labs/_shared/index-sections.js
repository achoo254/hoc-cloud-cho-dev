// index-sections.js — Central coordinator: wires all section renderers + bootIndex.
// Phases 02-06: hero, how, features, resume, stats, heatmap, roadmap, toolbar, footer.

import { LabTemplate } from './lab-template.js';
import { computeUserStats } from './index-stats.js';
import { renderDueToday } from './index-sections-due.js';
import { renderResume, renderStats, renderHeatmap } from './index-sections-stats.js';
import { renderRoadmap } from './index-sections-roadmap.js';
import { renderCatalogToolbar, applyToolbarState } from './index-sections-toolbar.js';
import { renderFooter } from './index-sections-footer.js';
import { escapeHtml, formatRelTime } from './index-sections-utils.js';

// ===== Card menu wiring =====

function wireCardMenu(card, lab) {
  const btn = card.querySelector('.card-menu-btn');
  const pop = card.querySelector('.card-menu-pop');
  if (!btn || !pop) return;
  const closeAll = () => document.querySelectorAll('.card-menu-pop.open').forEach(p => p.classList.remove('open'));
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  btn.addEventListener('click', e => { stop(e); const o = pop.classList.contains('open'); closeAll(); if (!o) pop.classList.add('open'); });
  pop.addEventListener('click', stop);
  pop.querySelectorAll('button[data-act]').forEach(b => {
    b.addEventListener('click', e => {
      stop(e);
      const labels = { 'reset-quiz': 'quiz', 'reset-flash': 'flashcards', 'reset-all': 'TOÀN BỘ tiến độ' };
      if (!confirm(`Reset ${labels[b.dataset.act]} của "${lab.title}"?`)) return;
      if (b.dataset.act === 'reset-quiz')       LabTemplate.resetLabQuiz(lab.id);
      else if (b.dataset.act === 'reset-flash') LabTemplate.resetLabFlashcards(lab.id);
      else                                      LabTemplate.resetLabAll(lab.id);
      closeAll(); location.reload();
    });
  });
}

// ===== Lab card builder =====

function buildLabCard(lab) {
  const srs  = lab.cards > 0 ? LabTemplate.getDueCount(lab.id, lab.cards) : { due: 0, new: lab.cards };
  const quiz = LabTemplate.getQuizScore(lab.id);
  const pos  = LabTemplate.getPosition(lab.id);
  let badge  = '';
  if (lab.status === 'ready') {
    if (srs.new === lab.cards && !quiz)            badge = '<span class="lab-status status-new">NEW</span>';
    else if (srs.new > 0 || srs.due > 0 || !quiz) badge = '<span class="lab-status status-wip">IN PROGRESS</span>';
    else                                           badge = '<span class="lab-status status-done">DONE</span>';
  } else if (lab.status === 'legacy') {
    badge = '<span class="lab-status" style="background:var(--bg-input);color:var(--text-dim)">LEGACY</span>';
  } else {
    badge = '<span class="lab-status" style="background:var(--bg-input);color:var(--text-muted)">TODO</span>';
  }
  const pct = lab.cards > 0 ? Math.round(((lab.cards - srs.new - srs.due) / lab.cards) * 100) : 0;
  const bm  = (lab.status === 'ready' && pos?.section)
    ? `<div class="lab-bookmark" data-resume="1" title="Mở lab và cuộn tới đây">
         <div class="bm-head"><span>📍 đang đọc · ${pos.pct}%</span><span class="bm-pct">${formatRelTime(pos.ts)}</span></div>
         <div class="bm-section">${escapeHtml(pos.section)}</div>
         ${pos.snippet ? `<div class="bm-snippet">${escapeHtml(pos.snippet)}</div>` : ''}
         <div class="bm-resume">↵ click để tiếp tục</div></div>` : '';
  const menu = lab.status === 'ready'
    ? `<button type="button" class="card-menu-btn" aria-label="Tùy chọn">⋯</button>
       <div class="card-menu-pop" role="menu">
         <button type="button" data-act="reset-quiz"><span>Reset quiz</span><span class="menu-hint">câu hỏi hôm nay</span></button>
         <button type="button" data-act="reset-flash"><span>Reset flashcards</span><span class="menu-hint">SM-2 state</span></button>
         <div class="menu-sep"></div>
         <button type="button" class="danger" data-act="reset-all"><span>Reset tất cả</span><span class="menu-hint">+ vị trí đọc</span></button>
       </div>` : '';
  return { srs, quiz, pos, badge, pct, bm, menu };
}

// ===== Phase groups renderer =====

function renderPhaseGroups(root, catalog) {
  root.innerHTML = '';
  if (!catalog.length) {
    root.innerHTML = `<div class="toolbar-empty">Không tìm thấy lab phù hợp. <button class="link-btn" onclick="clearToolbar()">Clear filter</button></div>`;
    return;
  }
  catalog.forEach(group => {
    const div  = document.createElement('div');
    div.className = 'phase-group';
    if (group.id) div.setAttribute('data-phase-id', group.id);
    const ready = group.labs.filter(l => l.status === 'ready').length;
    div.innerHTML = `<h3 class="phase-title">${group.phase} · <span class="count">${ready}</span>/${group.labs.length} lab</h3>`;
    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    group.labs.forEach(lab => {
      const a = document.createElement('a');
      a.className = 'lab-card';
      a.href = lab.status === 'todo' ? '#' : lab.href;
      a.setAttribute('data-lab-slug', lab.id);
      if (lab.status === 'todo') { a.style.opacity = '0.5'; a.style.pointerEvents = 'none'; }
      const { srs, quiz, pos, badge, pct, bm, menu } = buildLabCard(lab);
      a.innerHTML = `
        ${menu}<div>${badge}</div>
        <div class="lab-title">${lab.title}</div>
        <div class="lab-meta">
          ${lab.cards > 0 ? `<span>${srs.new} mới · ${srs.due} cần ôn</span>` : ''}
          ${quiz ? ` · <span>quiz ${quiz.correct}/${quiz.total}</span>` : ''}
          ${lab.note ? `<div class="mt-8">${lab.note}</div>` : ''}
        </div>
        ${lab.cards > 0 ? `<div class="progress-bar"><div class="fill" style="width:${pct}%"></div></div>` : ''}
        ${bm}`;
      if (lab.status === 'ready') {
        wireCardMenu(a, lab);
        const bmEl = a.querySelector('.lab-bookmark[data-resume]');
        if (bmEl && pos?.anchor) {
          bmEl.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); location.href = `${lab.href}#${encodeURIComponent(pos.anchor)}`; });
        }
      }
      grid.appendChild(a);
    });
    div.appendChild(grid);
    root.appendChild(div);
  });
}

// ===== Server progress badge hydration =====

async function hydrateServerProgress() {
  if (!window.ProgressSync) return;
  try {
    const { progress } = await window.ProgressSync.fetchAll();
    const map = new Map((progress || []).map(p => [p.lab_slug, p]));
    document.querySelectorAll('[data-lab-slug]').forEach(el => {
      const p = map.get(el.getAttribute('data-lab-slug'));
      if (!p) return;
      const badge = document.createElement('span');
      badge.className = 'progress-badge';
      if (p.completed_at)       badge.textContent = '✅ đã đọc';
      else if (p.opened_at)     badge.textContent = '🔵 đang đọc';
      if (p.quiz_score != null) badge.textContent += ` · 📝 ${p.quiz_score}%`;
      el.appendChild(badge);
    });
  } catch { /* server optional */ }
}

// ===== SRS state helper for toolbar =====

function getLabSrsState(lab, field) {
  if (field === 'quiz') return LabTemplate.getQuizScore(lab.id);
  return lab.cards > 0 ? LabTemplate.getDueCount(lab.id, lab.cards) : { due: 0, new: lab.cards || 0 };
}

// ===== Skip-to-content (a11y) =====

function injectSkipLink() {
  const a = document.createElement('a');
  a.href = '#main-content'; a.className = 'skip-to-content';
  a.textContent = 'Bỏ qua tới nội dung chính';
  document.body.insertBefore(a, document.body.firstChild);
}

// ===== Bootstrap =====

export async function bootIndex(catalog) {
  injectSkipLink();

  renderDueToday(document.getElementById('due-mount'), catalog, null);
  renderRoadmap(document.getElementById('roadmap-mount'), catalog, null);

  // Skeleton while stats load
  const statIds = ['resume-mount', 'stats-mount', 'heatmap-mount'];
  statIds.forEach(id => { const m = document.getElementById(id); if (m) m.innerHTML = '<div class="skel-strip" aria-hidden="true"></div>'; });

  const stats = await computeUserStats(catalog);

  renderDueToday(document.getElementById('due-mount'), catalog, stats);

  if (!stats.hasData) {
    // Keep resume-mount visible with empty state; hide stats/heatmap when no activity
    renderResume(document.getElementById('resume-mount'), stats);
    ['stats-mount', 'heatmap-mount'].forEach(id => { const m = document.getElementById(id); if (m) m.hidden = true; });
  } else {
    renderResume(document.getElementById('resume-mount'), stats);
    renderStats(document.getElementById('stats-mount'), stats, catalog);
    renderHeatmap(document.getElementById('heatmap-mount'), stats);
    renderRoadmap(document.getElementById('roadmap-mount'), catalog, stats);
  }

  const phasesMount  = document.getElementById('phases-mount');
  const toolbarMount = document.getElementById('catalog-toolbar-mount');

  window.clearToolbar = () => {
    renderCatalogToolbar(toolbarMount, onToolbarChange);
    renderPhaseGroups(phasesMount, catalog);
  };

  function onToolbarChange(state) {
    renderPhaseGroups(phasesMount, applyToolbarState(catalog, state, getLabSrsState));
  }

  renderCatalogToolbar(toolbarMount, onToolbarChange);
  if (phasesMount) renderPhaseGroups(phasesMount, catalog);

  renderFooter(document.getElementById('footer-mount'));

  document.addEventListener('click', () =>
    document.querySelectorAll('.card-menu-pop.open').forEach(p => p.classList.remove('open'))
  );
  window.addEventListener('load', hydrateServerProgress);
}
