// index-stats.js — Phase 03: Compute aggregated user stats from SRS localStorage + ProgressSync.
// Returns shape consumed by renderResume, renderStats, renderHeatmap.

import { LabTemplate } from './lab-template.js';

// ===== Heatmap bucket =====

export function bucketHeatmapLevel(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

// ===== Build 84-day heatmap from SRS localStorage (srs:* keys, lastReviewed field) =====

function buildHeatmap() {
  const countMap = new Map();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('srs:')) continue;
      const e = JSON.parse(localStorage.getItem(k) || 'null');
      const ts = e?.lastReviewed || e?.ts || e?.last;
      if (!ts) continue;
      const d = new Date(ts).toISOString().slice(0, 10);
      countMap.set(d, (countMap.get(d) || 0) + 1);
    }
  } catch { /* localStorage unavailable */ }
  const today = new Date();
  return Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: countMap.get(key) || 0 };
  });
}

// ===== SRS helpers =====

function countMasteredCards() {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('srs:')) continue;
      const e = JSON.parse(localStorage.getItem(k) || 'null');
      if (!e) continue;
      n += Array.isArray(e) ? e.filter(c => (c.interval || 0) >= 21).length
                            : (e.interval >= 21 ? 1 : 0);
    }
  } catch { /* ignore */ }
  return n;
}

function findLastBookmark(catalog) {
  let best = null;
  catalog.flatMap(g => g.labs).forEach(lab => {
    if (lab.status !== 'ready') return;
    const pos = LabTemplate.getPosition(lab.id);
    if (!pos?.section) return;
    if (!best || (pos.ts || 0) > (best.pos.ts || 0)) best = { lab, pos };
  });
  return best;
}

function computeTotalDue(catalog) {
  return catalog.flatMap(g => g.labs)
    .filter(l => l.status === 'ready' && l.cards)
    .reduce((s, l) => s + LabTemplate.getDueCount(l.id, l.cards).due, 0);
}

function computeQuizAvg(catalog) {
  const scores = catalog.flatMap(g => g.labs)
    .filter(l => l.status === 'ready')
    .map(l => LabTemplate.getQuizScore(l.id))
    .filter(q => q?.total > 0)
    .map(q => (q.correct / q.total) * 100);
  return scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
}

// ===== Main export =====

export async function computeUserStats(catalog) {
  // 1. Local SRS data
  const heatmap        = buildHeatmap();
  const cardsMastered  = countMasteredCards();
  const streak         = LabTemplate.getStreakDays ? LabTemplate.getStreakDays() : 0;
  const lastBookmark   = findLastBookmark(catalog);
  const dueTotal       = computeTotalDue(catalog);
  const quizAvg        = computeQuizAvg(catalog);

  // 2. Server progress (optional, may fail)
  let serverProgress = [];
  let labsDone = 0;
  let totalMin = 0;

  try {
    if (window.ProgressSync) {
      const { progress } = await window.ProgressSync.fetchAll();
      serverProgress = progress || [];
      labsDone = serverProgress.filter(p => p.completed_at).length;
      // Estimate: 30 min per opened lab (no estimatedMinutes in server response)
      totalMin = serverProgress.filter(p => p.opened_at).length * 30;
    }
  } catch { /* server unavailable — graceful degrade */ }

  const hasData = cardsMastered > 0 || labsDone > 0 || dueTotal > 0
    || streak > 0 || !!lastBookmark || heatmap.some(d => d.count > 0);

  return {
    labsDone,
    cardsMastered,
    quizAvg,
    totalMin,
    dueTotal,
    streak,
    lastBookmark,
    heatmap,
    hasData,
    _serverProgress: serverProgress, // internal — consumed by renderRoadmap
  };
}
