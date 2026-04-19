/**
 * Client-side full-text search using MiniSearch + lazy-loaded search-index.json.
 * Falls back when server /api/search is unavailable or times out.
 *
 * Index is built once and cached in module scope — subsequent calls are O(n) search.
 */

import MiniSearch from 'minisearch'
import type { LocalSearchResult } from '@/lib/schema-search'

// ── Index document shape (mirrors search-index.json generated in phase 03) ────

interface IndexDoc {
  id: string
  slug: string
  title: string
  tags: string[]
  text: string
}

// ── Module-level cache ────────────────────────────────────────────────────────

let cachedIndex: MiniSearch<IndexDoc> | null = null
let loadPromise: Promise<MiniSearch<IndexDoc>> | null = null

// ── Snippet extractor ─────────────────────────────────────────────────────────

/**
 * Returns a ~120-char plain-text snippet centred around the first occurrence
 * of `query` (case-insensitive) inside `text`.
 */
function extractSnippet(text: string, query: string): string {
  const lower = text.toLowerCase()
  const term = query.toLowerCase().split(/\s+/)[0] ?? ''
  const idx = term ? lower.indexOf(term) : -1
  const start = Math.max(0, idx === -1 ? 0 : idx - 40)
  const end = Math.min(text.length, start + 120)
  const raw = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return (start > 0 ? '…' : '') + raw + (end < text.length ? '…' : '')
}

// ── Lazy index loader ─────────────────────────────────────────────────────────

async function loadIndex(): Promise<MiniSearch<IndexDoc>> {
  if (cachedIndex) return cachedIndex

  // Deduplicate concurrent calls
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    // Dynamic import — Vite handles JSON via ES module transform (no fetch needed).
    // This keeps the 90KB index out of the critical bundle (lazy chunk).
    const mod = await import('@/generated/search-index.json')
    const docs: IndexDoc[] = (mod.default ?? mod) as IndexDoc[]

    const ms = new MiniSearch<IndexDoc>({
      idField: 'id',
      fields: ['title', 'tags', 'text'],
      storeFields: ['slug', 'title', 'tags', 'text'],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
        boost: { title: 3, tags: 2 },
      },
    })

    ms.addAll(docs)
    cachedIndex = ms
    loadPromise = null
    return ms
  })()

  return loadPromise
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search the local MiniSearch index. Lazy-loads the index on first call.
 * @param q - raw query string
 * @returns up to 8 results, sorted by score descending
 */
export async function searchLocal(q: string): Promise<LocalSearchResult[]> {
  if (!q.trim()) return []

  let ms: MiniSearch<IndexDoc>
  try {
    ms = await loadIndex()
  } catch {
    // Index unavailable — return empty rather than crashing
    return []
  }

  const raw = ms.search(q, { prefix: true, fuzzy: 0.2, boost: { title: 3, tags: 2 } })

  return raw.slice(0, 8).map((r) => ({
    slug: r.slug as string,
    title: r.title as string,
    tags: (r.tags as string[] | undefined) ?? [],
    snippet: extractSnippet((r.text as string | undefined) ?? '', q),
    score: r.score,
    source: 'local' as const,
  }))
}

/**
 * Pre-warm the search index in the background (call once on app boot).
 * Silently ignores errors — searchLocal will retry on demand.
 */
export function prewarmSearchIndex(): void {
  loadIndex().catch(() => {
    // intentionally swallowed — warming is best-effort
  })
}
