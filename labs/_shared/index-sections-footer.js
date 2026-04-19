// index-sections-footer.js — Phase 06: Footer renderer (3-col desktop, accordion mobile).

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/inetdev/hoc-cloud-cho-dev' },
  { label: 'Production', href: 'https://hoc-cloud.inetdev.io.vn' },
  { label: 'Docs', href: '/docs/' },
  { label: 'Discord', href: '#' },
];

const SHORTCUTS = [
  { key: '/',     desc: 'Mở tìm kiếm' },
  { key: 'g h',   desc: 'Về trang chủ' },
  { key: 'j / k', desc: 'Lab trước / sau' },
  { key: 'r',     desc: 'Resume bookmark' },
  { key: '?',     desc: 'Hiện shortcuts' },
];

export function renderFooter(mount) {
  if (!mount) return;

  const linksHtml = LINKS.map(l =>
    `<a class="footer-link" href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${l.label}</a>`
  ).join('');

  const shortcutsHtml = SHORTCUTS.map(s =>
    `<li class="shortcut-row">
      <kbd class="shortcut-key">${s.key}</kbd>
      <span class="shortcut-desc">${s.desc}</span>
    </li>`
  ).join('');

  // Desktop: 3-col grid. Mobile: <details> accordion per col.
  mount.innerHTML = `
    <footer class="site-footer" role="contentinfo" aria-label="Site footer">
      <div class="footer-grid">

        <div class="footer-col">
          <details class="footer-details" open>
            <summary class="footer-col-title">Links</summary>
            <nav class="footer-links" aria-label="Site links">
              ${linksHtml}
            </nav>
          </details>
        </div>

        <div class="footer-col">
          <details class="footer-details" open>
            <summary class="footer-col-title">Keyboard</summary>
            <ul class="shortcut-list" aria-label="Keyboard shortcuts reference">
              ${shortcutsHtml}
            </ul>
          </details>
        </div>

        <div class="footer-col">
          <details class="footer-details" open>
            <summary class="footer-col-title">Meta</summary>
            <div class="footer-meta">
              <span class="footer-meta-name">Learning Labs</span>
              <span class="footer-meta-ver">v1.0.0 · MIT License</span>
              <span class="footer-meta-credit">Built with ♥ by inet</span>
            </div>
          </details>
        </div>

      </div>
    </footer>`;

  // On mobile (<640px): close all details by default, open on tap
  if (window.innerWidth < 640) {
    mount.querySelectorAll('.footer-details').forEach(d => d.removeAttribute('open'));
  }
}
