// lab-template.js — WHY-first learning lab runtime
// Render TL;DR / Walkthrough / Quiz / Flashcards / Try-at-home từ data island.
// SM-2 spaced repetition + progress tracking qua localStorage.

const STORAGE_PREFIX = 'lab:';

// ===== SM-2 algorithm =====
// quality: 0=Again, 1=Hard, 2=Good, 3=Easy
// Trả về: { ef, interval, reps, due }
function sm2(card, quality) {
  const now = Date.now();
  let { ef = 2.5, interval = 0, reps = 0 } = card;
  if (quality === 0) {
    reps = 0; interval = 0;
  } else {
    reps += 1;
    if (reps === 1) interval = quality === 1 ? 1 : quality === 2 ? 1 : 3;
    else if (reps === 2) interval = quality === 1 ? 3 : quality === 2 ? 6 : 10;
    else interval = Math.round(interval * ef);
    const qMap = [0, 3, 4, 5][quality] ?? 4;
    ef = Math.max(1.3, ef + (0.1 - (5 - qMap) * (0.08 + (5 - qMap) * 0.02)));
  }
  const due = now + interval * 86400_000;
  return { ef, interval, reps, due, lastReviewed: now };
}

function daysUntil(due) {
  return Math.round((due - Date.now()) / 86400_000);
}

// ===== Storage helpers =====
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key)); } catch { return null; } },
  set(key, val) { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(STORAGE_PREFIX + key); },
  keys() { return Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX)); },
};

// ===== Seeded PRNG (mulberry32) — same day same shuffle =====
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function hashLabDate(labId, date) { return hashStr(`${date}:${labId}`); }
function seededShuffle(arr, seed) {
  const rand = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Date helpers =====
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a, b) {
  const p = s => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  return Math.round((p(b) - p(a)) / 86400_000);
}

// ===== Global streak (cross-lab) =====
// Call on every lab open: handles miss-day reset + once-per-day bump.
function checkAndBumpStreak() {
  const today = todayStr();
  const last = localStorage.getItem(STORAGE_PREFIX + 'quiz:global:lastActiveDate');
  let streak = +(localStorage.getItem(STORAGE_PREFIX + 'quiz:global:streakDays') || 0);
  if (!last) streak = 1;
  else {
    const gap = daysBetween(last, today);
    if (gap === 0) return streak;        // same day, no-op
    if (gap === 1) streak += 1;          // consecutive
    else streak = 1;                     // miss ≥1 day → reset (today counts as 1)
  }
  localStorage.setItem(STORAGE_PREFIX + 'quiz:global:streakDays', String(streak));
  localStorage.setItem(STORAGE_PREFIX + 'quiz:global:lastActiveDate', today);
  return streak;
}
function getStreakDays() {
  return +(localStorage.getItem(STORAGE_PREFIX + 'quiz:global:streakDays') || 0);
}

// ===== Quiz SRS (per-question, lightweight) =====
// State per qid: { lastSeen, interval (days), wrongCount }
function quizSrsUpdate(prev, correct) {
  const p = prev || { lastSeen: 0, interval: 1, wrongCount: 0 };
  if (correct) return { ...p, lastSeen: Date.now(), interval: Math.min(p.interval * 2, 16) };
  return { ...p, lastSeen: Date.now(), interval: 1, wrongCount: p.wrongCount + 1 };
}

function difficultyTier(streakDays) {
  if (streakDays <= 3) return { easy: 6, medium: 2, hard: 0 };
  if (streakDays <= 7) return { easy: 3, medium: 3, hard: 2 };
  return { easy: 2, medium: 3, hard: 3 };
}

// Pick up to N items from arr using seeded shuffle (non-destructive).
function pickSeeded(arr, n, seed) {
  if (n <= 0 || !arr.length) return [];
  return seededShuffle(arr, seed).slice(0, n);
}

// Daily selector: 8 due + 4 weak + 8 new-by-tier, fill random to 20, seeded-shuffle display order.
function selectDailyQuiz(pool, srsState, streakDays, seed, size = 20) {
  const srs = srsState || {};
  const now = Date.now();
  const DAY = 86400_000;
  const isDue = q => srs[q.id] && srs[q.id].lastSeen && (srs[q.id].lastSeen + (srs[q.id].interval || 1) * DAY) <= now;
  const isWeak = q => (srs[q.id]?.wrongCount ?? 0) >= 2;
  const isSeen = q => !!srs[q.id]?.lastSeen;

  const due = pool.filter(isDue);
  const weak = pool.filter(q => isWeak(q) && !due.includes(q));
  const unseen = pool.filter(q => !isSeen(q));

  const picked = [];
  const pushUnique = items => items.forEach(q => { if (!picked.find(p => p.id === q.id)) picked.push(q); });

  pushUnique(pickSeeded(due, 8, seed ^ 0x01));
  pushUnique(pickSeeded(weak, 4, seed ^ 0x02));

  const tier = difficultyTier(streakDays);
  let tierSeed = seed ^ 0x03;
  for (const diff of ['easy', 'medium', 'hard']) {
    const need = tier[diff] || 0;
    if (!need) continue;
    const bucket = unseen.filter(q => q.difficulty === diff && !picked.find(p => p.id === q.id));
    pushUnique(pickSeeded(bucket, need, tierSeed));
    tierSeed = (tierSeed * 16807) >>> 0;
  }

  // Fill to size with anything remaining
  if (picked.length < size) {
    const rest = pool.filter(q => !picked.find(p => p.id === q.id));
    pushUnique(pickSeeded(rest, size - picked.length, seed ^ 0x04));
  }

  return seededShuffle(picked.slice(0, size), seed ^ 0x05);
}

// Ensure pool items have an id (fallback: hash of question text).
function normalizePool(pool) {
  return (pool || []).map((q, i) => {
    if (q.id) return q;
    const id = `auto_${hashStr(String(q.q || '') + '|' + i).toString(36)}`;
    return { ...q, id, difficulty: q.difficulty || 'medium', tags: q.tags || [] };
  });
}

// ===== Validators — enforce WHY-first =====
function validateData(labId, data) {
  const warn = (msg) => console.warn(`[lab:${labId}] WHY missing — ${msg}`);
  (data.tldr || []).forEach((r, i) => { if (!r.why) warn(`tldr[${i}].why`); });
  (data.walkthrough || []).forEach((s, i) => { if (!s.why) warn(`walkthrough[${i}].why`); });
  (data.quiz || []).forEach((q, i) => {
    if (!q.whyCorrect) warn(`quiz[${i}].whyCorrect`);
    if (!q.whyOthersWrong) warn(`quiz[${i}].whyOthersWrong`);
    if (!q.id) warn(`quiz[${i}].id (auto-generated)`);
    if (q.difficulty && !['easy', 'medium', 'hard'].includes(q.difficulty)) warn(`quiz[${i}].difficulty invalid`);
  });
  (data.flashcards || []).forEach((c, i) => { if (!c.why) warn(`flashcards[${i}].why`); });
  (data.tryAtHome || []).forEach((t, i) => { if (!t.why) warn(`tryAtHome[${i}].why`); });
}

// ===== Renderers =====
function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') n.className = props[k];
    else if (k === 'html') n.innerHTML = props[k];
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), props[k]);
    else n.setAttribute(k, props[k]);
  }
  (Array.isArray(children) ? children : [children]).filter(Boolean).forEach(c =>
    n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}

function renderTldr(root, items) {
  if (!items?.length) return;
  const table = el('table', { class: 'tldr-table' });
  const keys = Object.keys(items[0]).filter(k => k !== 'why');
  const thead = el('thead', {}, [
    el('tr', {}, [
      ...keys.map(k => el('th', {}, k.charAt(0).toUpperCase() + k.slice(1))),
      el('th', {}, 'Why'),
    ]),
  ]);
  const tbody = el('tbody');
  items.forEach(row => {
    const tr = el('tr', {}, [
      ...keys.map(k => el('td', { html: String(row[k] ?? '') })),
      el('td', { class: 'col-why', html: row.why || '' }),
    ]);
    tbody.appendChild(tr);
  });
  table.appendChild(thead); table.appendChild(tbody);
  root.appendChild(table);
}

function renderWalkthrough(root, steps) {
  steps?.forEach((s, i) => {
    const div = el('div', { class: 'walkthrough-step' });
    div.appendChild(el('div', { class: 'step-header' }, [
      el('span', { class: 'step-num' }, String(s.step ?? i + 1)),
      el('span', { class: 'step-what', html: s.what || '' }),
    ]));
    if (s.why) div.appendChild(el('div', { class: 'why-block step-why', html: `<strong>Why:</strong> ${s.why}` }));
    if (s.code) div.appendChild(makeCodeBlock(s.code, s.lang));
    if (s.note) div.appendChild(el('div', { class: 'text-dim mt-8', html: s.note, style: 'font-size:13px' }));
    root.appendChild(div);
  });
}

function makeCodeBlock(code, lang = 'bash') {
  const wrapper = el('pre', { class: 'code-block', 'data-lang': lang });
  const codeEl = el('code', { html: escapeHtml(code).replace(/(^|\n)\s*#([^\n]*)/g, '$1<span class="cmt">#$2</span>') });
  const btn = el('button', {
    class: 'copy-btn',
    onclick: async (e) => {
      await navigator.clipboard.writeText(code);
      btn.textContent = '✓ copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
    },
  }, 'copy');
  wrapper.appendChild(codeEl);
  wrapper.appendChild(btn);
  return wrapper;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Pick today's 20 questions from pool. Cache per (labId, date) so order is stable
// within the day but re-rolls automatically tomorrow.
function getDailyQuiz(pool, labId) {
  const date = todayStr();
  const cacheKey = `quiz:${labId}:daily`;
  const cached = store.get(cacheKey);
  if (cached && cached.date === date && Array.isArray(cached.ids) && cached.ids.length) {
    const byId = new Map(pool.map(q => [q.id, q]));
    const items = cached.ids.map(id => byId.get(id)).filter(Boolean);
    if (items.length) return items;
  }
  const srsState = store.get(`quiz:${labId}:srs`) || {};
  const streak = getStreakDays() || 1;
  const seed = hashLabDate(labId, date);
  const items = selectDailyQuiz(pool, srsState, streak, seed, 20);
  store.set(cacheKey, { date, ids: items.map(q => q.id) });
  return items;
}

function renderQuiz(root, pool, labId) {
  pool = normalizePool(pool);
  const items = getDailyQuiz(pool, labId);
  const stateKey = `quiz:${labId}`;
  const srsKey = `quiz:${labId}:srs`;
  let state = store.get(stateKey) || { answers: {} };
  if (!state.answers) state.answers = {};
  let srs = store.get(srsKey) || {};

  const progress = el('div', { class: 'quiz-progress' });
  const updateProgress = () => {
    const total = items.length;
    const answered = items.filter(q => state.answers[q.id]).length;
    const correct = items.filter(q => state.answers[q.id]?.correct).length;
    progress.innerHTML = `Tiến độ: <span class="score">${correct}/${total}</span> đúng · ${answered}/${total} đã trả lời`;
  };
  root.appendChild(progress);

  items.forEach((q, idx) => {
    const card = el('div', { class: 'quiz-item' });
    const diffChip = q.difficulty ? `<span class="quiz-diff quiz-diff-${q.difficulty}">${q.difficulty}</span> ` : '';
    card.appendChild(el('div', { class: 'quiz-q', html: `Q${idx + 1}. ${diffChip}${q.q}` }));
    const opts = el('div', { class: 'quiz-options' });
    q.options.forEach((text, i) => {
      const opt = el('div', { class: 'quiz-opt', 'data-idx': i, html: text });
      opt.addEventListener('click', () => {
        if (card.classList.contains('answered')) return;
        card.querySelectorAll('.quiz-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const isCorrect = i === q.correct;
        card.classList.add('answered');
        card.querySelectorAll('.quiz-opt').forEach((o, oi) => {
          if (oi === q.correct) o.classList.add('correct');
          else if (oi === i) o.classList.add('wrong');
        });
        state.answers[q.id] = { picked: i, correct: isCorrect, at: Date.now() };
        store.set(stateKey, state);
        srs[q.id] = quizSrsUpdate(srs[q.id], isCorrect);
        store.set(srsKey, srs);
        updateProgress();
      });
      opts.appendChild(opt);
    });
    card.appendChild(opts);

    const reveal = el('div', { class: 'quiz-reveal' });
    reveal.appendChild(el('div', { class: 'why-block why-correct', html: q.whyCorrect || '' }));
    if (q.whyOthersWrong) {
      Object.entries(q.whyOthersWrong).forEach(([k, v]) => {
        reveal.appendChild(el('div', { class: 'why-wrong-item', html: `<em>${q.options[k]}</em> — ${v}` }));
      });
    }
    card.appendChild(reveal);
    root.appendChild(card);

    // restore prior answer (same day)
    if (state.answers[q.id]) {
      const prev = state.answers[q.id];
      card.classList.add('answered');
      card.querySelectorAll('.quiz-opt').forEach((o, oi) => {
        if (oi === q.correct) o.classList.add('correct');
        else if (oi === prev.picked) o.classList.add('wrong');
      });
    }
  });
  updateProgress();
}

function renderFlashcards(root, cards, labId) {
  const area = el('div', { class: 'flashcard-area' });
  const stat = el('div', { class: 'flashcard-stat' });
  const cardBox = el('div');
  area.appendChild(stat);
  area.appendChild(cardBox);
  root.appendChild(area);

  function loadStates() {
    return cards.map((c, i) => store.get(`srs:${labId}:${i}`) || { ef: 2.5, interval: 0, reps: 0, due: 0 });
  }

  function nextCard() {
    const states = loadStates();
    const now = Date.now();
    // prioritize: due (overdue + today) → new (reps=0) → skip done
    const dueIdx = states
      .map((s, i) => ({ i, s }))
      .filter(x => x.s.reps > 0 && x.s.due <= now)
      .sort((a, b) => a.s.due - b.s.due)[0];
    if (dueIdx) return dueIdx.i;
    const newIdx = states.findIndex(s => s.reps === 0);
    return newIdx === -1 ? null : newIdx;
  }

  function updateStat() {
    const states = loadStates();
    const now = Date.now();
    const due = states.filter(s => s.reps > 0 && s.due <= now).length;
    const isNew = states.filter(s => s.reps === 0).length;
    const done = states.filter(s => s.reps > 0 && s.due > now).length;
    stat.innerHTML = `<span class="new">${isNew} mới</span> · <span class="due">${due} cần ôn</span> · <span class="done">${done} đã nhớ (đợi tới ngày)</span>`;
  }

  function render() {
    updateStat();
    const idx = nextCard();
    if (idx === null) {
      cardBox.innerHTML = '';
      cardBox.appendChild(el('div', { class: 'fc-done' }, '🎉 Hết thẻ cần ôn hôm nay. Quay lại sau!'));
      return;
    }
    const c = cards[idx];
    cardBox.innerHTML = '';
    const card = el('div', { class: 'flashcard' });
    card.appendChild(el('div', { class: 'fc-front', html: c.front }));
    const back = el('div', { class: 'fc-back' });
    back.appendChild(el('div', { class: 'fc-answer', html: c.back }));
    if (c.why) back.appendChild(el('div', { class: 'why-block', html: `<strong>Why:</strong> ${c.why}` }));
    card.appendChild(back);
    card.appendChild(el('div', { class: 'fc-hint' }, '(click để lật)'));
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    cardBox.appendChild(card);

    const rating = el('div', { class: 'fc-rating' });
    const state = loadStates()[idx];
    const labels = [
      { q: 0, l: 'Again', cls: 'r-again' },
      { q: 1, l: 'Hard', cls: 'r-hard' },
      { q: 2, l: 'Good', cls: 'r-good' },
      { q: 3, l: 'Easy', cls: 'r-easy' },
    ];
    labels.forEach(({ q, l, cls }) => {
      const preview = sm2(state, q);
      const d = Math.max(0, daysUntil(preview.due));
      const btn = el('button', {
        class: cls,
        onclick: () => {
          const next = sm2(state, q);
          store.set(`srs:${labId}:${idx}`, next);
          render();
        },
      }, [document.createTextNode(l), el('span', { class: 'interval' }, `+${d}d`)]);
      rating.appendChild(btn);
    });
    cardBox.appendChild(rating);
  }
  render();
}

function renderTryAtHome(root, items) {
  const list = el('div', { class: 'try-list' });
  items?.forEach(t => {
    const item = el('div', { class: 'try-item' });
    if (t.why) item.appendChild(el('div', { class: 'try-why', html: t.why }));
    item.appendChild(makeCodeBlock(t.cmd, 'bash'));
    if (t.note) item.appendChild(el('div', { class: 'text-dim mt-8', html: t.note, style: 'font-size:13px' }));
    list.appendChild(item);
  });
  root.appendChild(list);
}

// ===== WHY toggle =====
function mountWhyToggle() {
  const btn = el('button', {
    class: 'why-toggle',
    onclick: () => {
      document.body.classList.toggle('why-hidden');
      btn.textContent = document.body.classList.contains('why-hidden') ? '💡 Hiện WHY' : '💡 Ẩn WHY';
    },
  }, '💡 Ẩn WHY');
  document.body.appendChild(btn);
}

// ===== Progress tracking for dashboard =====
function markVisited(labId, meta) {
  const key = `meta:${labId}`;
  const prev = store.get(key) || {};
  store.set(key, { ...prev, ...meta, lastVisit: Date.now() });
}

export const LabTemplate = {
  sm2, store, daysUntil,
  // quiz engine (exposed for testing + phase 03/04)
  mulberry32, seededShuffle, hashLabDate, hashStr,
  selectDailyQuiz, getDailyQuiz, difficultyTier,
  quizSrsUpdate, checkAndBumpStreak, getStreakDays,
  normalizePool,

  resetLabQuiz(labId) {
    store.remove(`quiz:${labId}`);
    store.remove(`quiz:${labId}:srs`);
    store.remove(`quiz:${labId}:daily`);
  },

  async init({ labId, title }) {
    const dataEl = document.getElementById('lab-data');
    if (!dataEl) { console.error('#lab-data not found'); return; }
    const data = JSON.parse(dataEl.textContent);
    validateData(labId, data);
    markVisited(labId, { title: title || data.title || labId });
    checkAndBumpStreak();

    const mount = (id, fn, payload) => {
      const node = document.getElementById(id);
      if (node && payload) fn(node, payload, labId);
    };
    mount('mount-tldr', renderTldr, data.tldr);
    mount('mount-walkthrough', renderWalkthrough, data.walkthrough);
    mount('mount-quiz', renderQuiz, data.quiz);
    mount('mount-flashcards', renderFlashcards, data.flashcards);
    mount('mount-tryAtHome', renderTryAtHome, data.tryAtHome);

    mountWhyToggle();
  },

  // For dashboard
  getAllLabs() {
    return store.keys()
      .filter(k => k.startsWith(STORAGE_PREFIX + 'meta:'))
      .map(k => ({ labId: k.slice((STORAGE_PREFIX + 'meta:').length), meta: JSON.parse(localStorage.getItem(k)) }));
  },

  getDueCount(labId, totalCards) {
    const now = Date.now();
    let due = 0, newC = 0;
    for (let i = 0; i < totalCards; i++) {
      const s = store.get(`srs:${labId}:${i}`);
      if (!s || s.reps === 0) newC++;
      else if (s.due <= now) due++;
    }
    return { due, new: newC };
  },

  getQuizScore(labId) {
    const q = store.get(`quiz:${labId}`);
    if (!q || !q.answers) return null;
    const daily = store.get(`quiz:${labId}:daily`);
    const ids = daily?.ids || Object.keys(q.answers);
    const total = ids.length;
    const correct = ids.filter(id => q.answers[id]?.correct).length;
    return { total, correct };
  },
};

// Auto-register global
window.LabTemplate = LabTemplate;
