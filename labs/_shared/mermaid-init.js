// Lazy-init Mermaid only when a .mermaid element exists on the page.
(async () => {
  if (!document.querySelector('.mermaid')) return;
  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
})();
