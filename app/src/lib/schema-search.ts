/**
 * Zod schema for /api/search response.
 * Server returns { results: SearchResult[] } from Meilisearch index.
 */

import { z } from 'zod'

// ── Server search result (Meilisearch) ────────────────────────────────────────

export const SearchResultSchema = z.object({
  slug: z.string(),
  title: z.string(),
  module: z.string().optional(),
  /** HTML snippet with <mark> highlights */
  preview: z.string().optional(),
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
