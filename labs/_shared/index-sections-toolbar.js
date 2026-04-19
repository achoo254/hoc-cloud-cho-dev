// index-sections-toolbar.js — Phase 05: Catalog search/filter/sort toolbar.

const SESSION_KEY = 'labs-toolbar-state';
const FILTERS = [
  { key: 'all',         label: 'All' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
  { key: 'new',         label: 'New' },
  { key: 'todo',        label: 'Todo' },
];
const SORTS = [
  { key: 'default', label: 'Default' },
  { key: 'a-z',     label: 'A-Z' },
  { key: 'progress', label: 'Progress ↓' },
];

function loadState() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') ||
      { query: '', filter: 'all', sort: 'default' };
  } catch { return { query: '', filter: 'all', sort: 'default' }; }
}

function saveState(state) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

export function renderCatalogToolbar(mount, onStateChange) {
  if (!mount) return;
  const state = loadState();

  const chipsHtml = FILTERS.map(f => `
    <button type="button" class="chip${state.filter === f.key ? ' chip-active' : ''}"
      data-filter="${f.key}" role="radio" aria-checked="${state.filter === f.key}"
      aria-label="Filter: ${f.label}">${f.label}</button>`).join('');

  const sortOpts = SORTS.map(s =>
    `<option value="${s.key}"${state.sort === s.key ? ' selected' : ''}>${s.label}</option>`
  ).join('');

  mount.innerHTML = `
    <nav class="catalog-toolbar" aria-label="Lọc và tìm kiếm lab">
      <label class="toolbar-search-label" for="lab-search" aria-label="Tìm lab">
        <span class="toolbar-search-icon" aria-hidden="true">🔍</span>
        <input type="search" id="lab-search" class="toolbar-search"
          placeholder="Tìm lab…" value="${state.query}"
          aria-label="Tìm lab theo tên hoặc ID" autocomplete="off">
      </label>
      <div class="toolbar-chips" role="radiogroup" aria-label="Lọc theo trạng thái">
        ${chipsHtml}
      </div>
      <label class="toolbar-sort-label" aria-label="Sắp xếp">
        <select class="toolbar-sort" aria-label="Sắp xếp lab">${sortOpts}</select>
      </label>
    </nav>`;

  const input  = mount.querySelector('#lab-search');
  const chips  = mount.querySelectorAll('.chip[data-filter]');
  const select = mount.querySelector('.toolbar-sort');

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.query = input.value.trim();
      saveState(state);
      onStateChange({ ...state });
    }, 150);
  });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.filter;
      // Toggle back to 'all' if clicking active chip
      state.filter = state.filter === key && key !== 'all' ? 'all' : key;
      saveState(state);
      chips.forEach(c => {
        const active = c.dataset.filter === state.filter;
        c.classList.toggle('chip-active', active);
        c.setAttribute('aria-checked', String(active));
      });
      onStateChange({ ...state });
    });
  });

  select.addEventListener('change', () => {
    state.sort = select.value;
    saveState(state);
    onStateChange({ ...state });
  });
}

// ===== Filter/sort logic applied to catalog labs =====

export function applyToolbarState(catalog, { query, filter, sort }, getLabSrsState) {
  const q = (query || '').toLowerCase();

  const filteredCatalog = catalog.map(group => {
    let labs = group.labs.filter(lab => {
      // Text search
      if (q && !lab.title.toLowerCase().includes(q) && !lab.id.toLowerCase().includes(q)) {
        return false;
      }
      // Status filter
      if (filter === 'all') return true;
      if (filter === 'todo') return lab.status === 'todo';
      if (lab.status !== 'ready') return false;

      const srs = getLabSrsState(lab); // { due, new }
      const hasQuiz = !!getLabSrsState(lab, 'quiz');

      if (filter === 'new')         return srs.new === (lab.cards || 0) && !hasQuiz;
      if (filter === 'done')        return srs.new === 0 && srs.due === 0 && hasQuiz;
      if (filter === 'in-progress') return srs.new > 0 || srs.due > 0 || !hasQuiz;
      return true;
    });

    if (sort === 'a-z') labs = [...labs].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    if (sort === 'progress') {
      const labPct = l => {
        if (!l.cards) return 0;
        const s = getLabSrsState(l);
        return (l.cards - s.new - s.due) / l.cards;
      };
      labs = [...labs].sort((a, b) => labPct(b) - labPct(a));
    }
    return { ...group, labs };
  }).filter(g => g.labs.length > 0);

  return filteredCatalog;
}
