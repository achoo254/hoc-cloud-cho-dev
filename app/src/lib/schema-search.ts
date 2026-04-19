/**
 * Zod schema for /api/search response.
 * Server returns { results: SearchResult[] } where each row comes from
 * SQLite FTS5 JOIN labs (slug, module, title, file_path, preview, rank).
 */

import { z } from 'zod'

// ── Server search result (FTS5) ───────────────────────────────────────────────

export const SearchResultSchema = z.object({
  slug: z.string(),
  title: z.string(),
  module: z.string().optional(),
  file_path: z.string().optional(),
  /** HTML snippet with <mark> highlights */
  preview: z.string().optional(),
  rank: z.number().optional(),
})

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
})

export type SearchResult = z.infer<typeof SearchResultSchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>

// ── Local (minisearch) result ─────────────────────────────────────────────────

export interface LocalSearchResult {
  slug: string
  title: string
  tags: string[]
  /** Plain-text snippet around first match */
  snippet: string
  score: number
  /** Marks result as coming from local index */
  source: 'local'
}
