// Progress sync — multi-device progress via anonymous cookie UUID.
// Fetches server state, merges with localStorage (server wins on last_updated),
// posts updates on lab open / quiz submit / reading-complete.
// Queues writes when offline; flushes on `online` event.

(function () {
  const API = '/api/progress';
  const QUEUE_KEY = 'lab:progress:queue';
  const MIGRATED_KEY = 'lab:progress:migrated';
  let inFlight = null;
  let debounceTimer = null;
  const pendingFields = {};

  function readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } }
  function writeQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

  async function flushQueue() {
    const q = readQueue();
    if (!q.length) return;
    const remaining = [];
    for (const item of q) {
      try {
        const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item), credentials: 'same-origin' });
        if (!res.ok) remaining.push(item);
      } catch { remaining.push(item); }
    }
    writeQueue(remaining);
  }

  async function postProgress(payload) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('http ' + res.status);
    } catch {
      const q = readQueue();
      q.push(payload);
      writeQueue(q);
    }
  }

  // Public: schedule a progress update for current lab (debounced).
  function update(labSlug, fields) {
    if (!labSlug) return;
    Object.assign(pendingFields, fields, { lab_slug: labSlug });
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const payload = { ...pendingFields };
      Object.keys(pendingFields).forEach(k => delete pendingFields[k]);
      postProgress(payload);
    }, 500);
  }

  // Public: fetch server state (resolves to { uuid, progress: [...] }).
  async function fetchAll() {
    if (inFlight) return inFlight;
    inFlight = fetch(API, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : { uuid: null, progress: [] })
      .catch(() => ({ uuid: null, progress: [] }))
      .finally(() => { inFlight = null; });
    return inFlight;
  }

  // Migrate legacy localStorage (lab:meta:*, lab:quiz:*) → server once.
  async function migrateLocalStorageOnce() {
    if (localStorage.getItem(MIGRATED_KEY) === '1') return;
    const items = [];
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('lab:meta:')) continue;
      const slug = key.slice('lab:meta:'.length);
      let meta = null; try { meta = JSON.parse(localStorage.getItem(key)); } catch {}
      if (!meta) continue;
      let quizScore = null;
      try {
        const q = JSON.parse(localStorage.getItem(`lab:quiz:${slug}`));
        const daily = JSON.parse(localStorage.getItem(`lab:quiz:${slug}:daily`));
        const ids = daily?.ids || Object.keys(q?.answers || {});
        if (ids.length) {
          const correct = ids.filter(id => q?.answers?.[id]?.correct).length;
          quizScore = Math.round((correct / ids.length) * 100);
        }
      } catch {}
      items.push({
        lab_slug: slug.replace(/^\d+-/, ''),
        opened_at: meta.lastVisit ? Math.floor(meta.lastVisit / 1000) : null,
        completed_at: null,
        quiz_score: quizScore,
      });
    }
    if (!items.length) { localStorage.setItem(MIGRATED_KEY, '1'); return; }
    try {
      const res = await fetch(API + '/migrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }), credentials: 'same-origin' });
      if (res.ok) localStorage.setItem(MIGRATED_KEY, '1');
    } catch { /* retry next session */ }
  }

  // Reading-complete heuristic: >90% scroll AND ≥120s elapsed since open.
  function installCompletionWatcher(labSlug) {
    const openedAt = Date.now();
    let done = false;
    const onScroll = () => {
      if (done) return;
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? (scrollY / docH) * 100 : 0;
      if (pct >= 90 && (Date.now() - openedAt) >= 120000) {
        done = true;
        window.removeEventListener('scroll', onScroll);
        update(labSlug, { completed_at: Math.floor(Date.now() / 1000) });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  window.addEventListener('online', () => { flushQueue(); });
  // Flush on every page load too (in case queued writes from prior session).
  flushQueue();

  window.ProgressSync = {
    update,
    fetchAll,
    migrateLocalStorageOnce,
    installCompletionWatcher,
    markOpened(labSlug) { update(labSlug, { opened_at: Math.floor(Date.now() / 1000) }); },
    markQuizScore(labSlug, pct) { update(labSlug, { quiz_score: Math.max(0, Math.min(100, pct | 0)) }); },
  };
})();
