// Reader-side helpers for /theory/* pages:
//  - SSE auto-reload on admin save (matches data-section-id)
//  - TOC active-heading highlight via IntersectionObserver
//  - Scroll memory per-section by nearest heading id
const sectionId = document.body.dataset.sectionId;

// -------- SSE live-reload --------
try {
  const es = new EventSource('/sse/reload');
  es.addEventListener('section-update', (e) => {
    if (String(e.data) === String(sectionId)) {
      window.location.reload();
    }
  });
  es.addEventListener('reload', () => window.location.reload());
} catch {}

// -------- TOC highlighting + scroll memory --------
const headings = Array.from(document.querySelectorAll('main.theory-main h1, main.theory-main h2, main.theory-main h3'))
  .filter((h) => h.id);
const tocLinks = new Map();
for (const a of document.querySelectorAll('.theory-toc a')) {
  const href = a.getAttribute('href') || '';
  if (href.startsWith('#')) tocLinks.set(href.slice(1), a);
}

let currentHeading = null;
const setActive = (id) => {
  if (currentHeading === id) return;
  currentHeading = id;
  for (const a of tocLinks.values()) a.classList.remove('active');
  tocLinks.get(id)?.classList.add('active');
  if (sectionId) {
    try {
      localStorage.setItem('theory-pos:' + sectionId, id);
    } catch {}
  }
};

if (headings.length) {
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
  );
  headings.forEach((h) => io.observe(h));
}

// Restore on load (only if user hasn't jumped via hash)
if (!location.hash && sectionId) {
  try {
    const savedId = localStorage.getItem('theory-pos:' + sectionId);
    if (savedId) {
      const el = document.getElementById(savedId);
      if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 0);
    }
  } catch {}
}
