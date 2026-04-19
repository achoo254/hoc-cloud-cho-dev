// Global search widget — injects floating search box + dropdown on any page.
// Keyboard: `/` to focus, Esc to close, ↑/↓ to navigate, Enter to open.
(function () {
  if (window.__hclSearchMounted) return;
  window.__hclSearchMounted = true;

  const PREFIX = 'hcl-search';
  const MIN_LEN = 2;
  const DEBOUNCE_MS = 200;

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

  function injectCss() {
    if (document.getElementById(`${PREFIX}-styles`)) return;
    const link = el('link', { id: `${PREFIX}-styles`, rel: 'stylesheet', href: '/_shared/search-widget.css' });
    document.head.appendChild(link);
  }

  const root = el('div', { class: `${PREFIX}-root`, role: 'search' });
  const input = el('input', {
    class: `${PREFIX}-input`,
    type: 'search',
    placeholder: '🔍 Tìm lab… (gõ / để focus)',
    autocomplete: 'off', spellcheck: 'false',
  });
  const dropdown = el('div', { class: `${PREFIX}-dropdown`, hidden: 'true' });
  root.appendChild(input);
  root.appendChild(dropdown);

  let activeController = null;
  let results = [];
  let highlightIdx = -1;
  let debounceT = null;

  function relRootPath() {
    // Labs are served at root `/` (rewrites to /labs/). Widget links use /<module>/<file>.html.
    return '/';
  }

  function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  async function runQuery(q) {
    if (activeController) activeController.abort();
    activeController = new AbortController();
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: activeController.signal });
      if (!res.ok) return [];
      const json = await res.json();
      return json.results || [];
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.warn('[search] failed:', err.message);
      return [];
    }
  }

  function renderDropdown() {
    dropdown.innerHTML = '';
    if (!results.length) {
      dropdown.appendChild(el('div', { class: `${PREFIX}-empty` }, 'Không có kết quả'));
      dropdown.hidden = false;
      return;
    }
    results.forEach((r, idx) => {
      const item = el('a', {
        class: `${PREFIX}-item${idx === highlightIdx ? ' is-active' : ''}`,
        href: '/' + r.file_path.replace(/^labs\//, ''),
      });
      item.appendChild(el('div', { class: `${PREFIX}-title`, html: `<span class="${PREFIX}-module">${r.module}</span> ${r.title}` }));
      item.appendChild(el('div', { class: `${PREFIX}-preview`, html: truncate(stripTags(r.preview).replace(/&lt;mark&gt;/g, '<mark>').replace(/&lt;\/mark&gt;/g, '</mark>'), 140) }));
      dropdown.appendChild(item);
    });
    dropdown.hidden = false;
  }

  function clear() {
    results = []; highlightIdx = -1;
    dropdown.innerHTML = ''; dropdown.hidden = true;
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceT);
    const q = input.value.trim();
    if (q.length < MIN_LEN) { clear(); return; }
    debounceT = setTimeout(async () => {
      const r = await runQuery(q);
      if (r === null) return; // aborted
      results = r; highlightIdx = r.length ? 0 : -1;
      renderDropdown();
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.blur(); clear(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (results.length) { highlightIdx = (highlightIdx + 1) % results.length; renderDropdown(); } }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); if (results.length) { highlightIdx = (highlightIdx - 1 + results.length) % results.length; renderDropdown(); } }
    else if (e.key === 'Enter') {
      const r = results[highlightIdx];
      if (r) { e.preventDefault(); location.href = '/' + r.file_path.replace(/^labs\//, ''); }
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) clear();
  });

  // `/` shortcut to focus (unless already in an input)
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    input.focus();
    input.select();
  });

  function mount() {
    injectCss();
    document.body.appendChild(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
