import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import { createHighlighter } from 'shiki';
import calloutPlugin from './callout-plugin.js';

const LANGS = [
  'bash',
  'sh',
  'yaml',
  'json',
  'javascript',
  'typescript',
  'python',
  'sql',
  'dockerfile',
  'nginx',
  'ini',
  'html',
  'css',
  'diff',
  'plaintext',
];

const highlighterPromise = createHighlighter({
  themes: ['github-dark'],
  langs: LANGS,
});

let highlighter;
highlighterPromise.then((h) => {
  highlighter = h;
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  highlight: (code, lang) => {
    if (lang === 'mermaid') {
      return `<pre class="mermaid-src"><div class="mermaid">${escapeHtml(code)}</div></pre>`;
    }
    if (!highlighter || !LANGS.includes(lang)) {
      return `<pre class="code-plain"><code>${escapeHtml(code)}</code></pre>`;
    }
    return highlighter.codeToHtml(code, { lang, theme: 'github-dark' });
  },
});

md.use(anchor, {
  slugify,
  permalink: anchor.permalink.linkInsideHeader({
    symbol: '<span aria-hidden="true">#</span>',
    placement: 'after',
  }),
});

md.use(calloutPlugin);

// Simple LRU render cache by section (caller supplies cache key).
const cache = new Map();
const CACHE_MAX = 200;

export function render(src, cacheKey) {
  if (cacheKey && cache.has(cacheKey)) {
    const v = cache.get(cacheKey);
    cache.delete(cacheKey);
    cache.set(cacheKey, v);
    return v;
  }
  const html = md.render(src || '');
  if (cacheKey) {
    cache.set(cacheKey, html);
    if (cache.size > CACHE_MAX) {
      cache.delete(cache.keys().next().value);
    }
  }
  return html;
}

export function invalidateCache(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

export async function ready() {
  await highlighterPromise;
}

export function extractHeadings(html) {
  const out = [];
  const re = /<h([2-3]) id="([^"]+)"[^>]*>(.*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({
      level: Number(m[1]),
      id: m[2],
      text: m[3].replace(/<[^>]+>/g, '').trim(),
    });
  }
  return out;
}

export function stripMarkdown(src, max = 160) {
  const plain = String(src || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max - 1) + '…' : plain;
}
