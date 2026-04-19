// index-sections-roadmap.js — Phase 04: Learning roadmap timeline renderer.

// ===== Roadmap =====

export function renderRoadmap(mount, catalog, stats) {
  if (!mount) return;

  const phases = catalog.map(g => {
    const totalLabs = g.labs.length;
    const readyLabs = g.labs.filter(l => l.status === 'ready').length;
    const doneLabs  = g.labs.filter(l => isLabDone(l.id, stats)).length;
    const pct = totalLabs > 0 ? Math.round((doneLabs / totalLabs) * 100) : 0;
    const num = (g.id || 'phase-00').replace('phase-', '');
    const name = g.phase.replace(/^Phase \d+ — /, '').replace(/^Phase \d+: /, '');
    const isActive = readyLabs > 0;
    const isDone   = doneLabs > 0 && doneLabs === totalLabs;

    return { id: g.id || `phase-${num}`, num, name, duration: g.duration || '—',
             prereq: g.prereq || [], totalLabs, readyLabs, doneLabs, pct,
             isActive, isDone, isPlaceholder: totalLabs === 0 };
  });

  const nodes = phases.map((p, i) => {
    const stateClass = p.isDone ? 'node-done' : p.isActive ? 'node-active' : 'node-todo';
    const badgeClass = p.isDone ? 'badge-done' : p.isActive ? 'badge-active' : '';
    const connector = i < phases.length - 1
      ? `<span class="roadmap-arrow" aria-hidden="true">→</span>` : '';
    const progressBar = !p.isPlaceholder
      ? `<div class="roadmap-progress-bar"><div class="roadmap-progress-fill" style="width:${p.pct}%"></div></div>` : '';
    const subline = p.isPlaceholder
      ? `<span class="roadmap-sub">Em sắp…</span>`
      : `<span class="roadmap-sub">${p.readyLabs}/${p.totalLabs} lab · ${p.duration}</span>`;

    return `
      <li class="roadmap-node ${stateClass}" data-phase-id-nav="${p.id}">
        <button class="roadmap-btn" onclick="scrollToPhase('${p.id}')"
          aria-label="Đến ${p.name} phase">
          <span class="roadmap-badge ${badgeClass}" aria-hidden="true">${p.num.padStart(2,'0')}</span>
          <span class="roadmap-name">${p.name}</span>
          ${subline}
          ${progressBar}
        </button>
        ${connector}
      </li>`;
  }).join('');

  mount.innerHTML = `
    <section class="roadmap-section" aria-labelledby="roadmap-h2">
      <h2 id="roadmap-h2" class="section-title">Learning Roadmap</h2>
      <ol class="roadmap-timeline" aria-label="Learning roadmap">${nodes}</ol>
    </section>`;

  // Expose scroll helper on window so inline onclick can reach it
  window.scrollToPhase = function(phaseId) {
    const target = document.querySelector(`[data-phase-id="${phaseId}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

function isLabDone(labId, stats) {
  // A lab is considered done when it appears in server progress with completed_at
  if (!stats || !stats._serverProgress) return false;
  return stats._serverProgress.some(p => p.lab_slug === labId && p.completed_at);
}
