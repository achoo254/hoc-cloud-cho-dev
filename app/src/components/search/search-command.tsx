/**
 * SearchCommand — Ctrl+K / Cmd+K command palette.
 *
 * Strategy:
 *   1. Debounce input 300ms
 *   2. Run server FTS5 (React Query, 1 s AbortController timeout) + local
 *      MiniSearch in parallel
 *   3. Merge: server results first; append local results not in server set,
 *      tagged with "local" Badge
 *   4. If server errors/times out → show local-only results
 *   5. Enter → navigate /lab/:slug, close dialog
 *
 * Animation: Framer Motion fade+scale on dialog, stagger on result items.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { BookOpen, Loader2, WifiOff } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { searchLocal } from '@/lib/search-client'
import {
  SearchResponseSchema,
  type SearchResult,
  type LocalSearchResult,
} from '@/lib/schema-search'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Unified display item (server or local) */
interface DisplayResult {
  slug: string
  title: string
  snippet: string
  tags: string[]
  source: 'server' | 'local'
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

// Escape regex metacharacters in user input
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const MARK_CLASS = 'bg-yellow-200/70 dark:bg-yellow-400/30 text-foreground rounded px-0.5'

// Server-side delimiters (must match server/api/search-routes.js).
const HL_START = ''
const DELIMITED_PATTERN = /([^]*)/g

/**
 * Render server-delimited text — parses `…` spans (written by Meili
 * via the search endpoint) into <mark> React elements. Trust the server's match
 * positions instead of re-deriving them on the client (Meili knows about typo
 * tolerance and diacritic folding; JS regex doesn't).
 */
function renderDelimited(text: string): React.ReactNode {
  if (!text.includes(HL_START)) return text
  const parts: React.ReactNode[] = []
  let cursor = 0
  let key = 0
  DELIMITED_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = DELIMITED_PATTERN.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    parts.push(
      <mark key={key++} className={MARK_CLASS}>
        {match[1]}
      </mark>,
    )
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

/**
 * Local-fallback highlighter — whitespace-tokenised regex match over plain text.
 * Used only for local MiniSearch results (no server delimiters available).
 */
function highlight(text: string, query: string): React.ReactNode {
  const tokens = query.trim().split(/\s+/).filter((t) => t.length >= 2)
  if (tokens.length === 0) return text
  const splitPattern = new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'gi')
  const matchPattern = new RegExp(`^(?:${tokens.map(escapeRegex).join('|')})$`, 'i')
  const parts = text.split(splitPattern)
  return parts.map((part, i) =>
    matchPattern.test(part) ? (
      <mark key={i} className={MARK_CLASS}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function mergeResults(
  serverResults: SearchResult[],
  localResults: LocalSearchResult[],
): DisplayResult[] {
  const serverSlugs = new Set(serverResults.map((r) => r.slug))

  const fromServer: DisplayResult[] = serverResults.map((r) => ({
    slug: r.slug,
    title: r.title,
    // Preserve server delimiters (…). Parsed into <mark> at render time.
    snippet: r.preview ?? '',
    tags: [],
    source: 'server',
  }))

  const fromLocal: DisplayResult[] = localResults
    .filter((r) => !serverSlugs.has(r.slug))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      snippet: r.snippet,
      tags: r.tags,
      source: 'local',
    }))

  return [...fromServer, ...fromLocal].slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const navigate = useNavigate()
  const reduce = useReducedMotionPreference()
  const [inputValue, setInputValue] = useState('')
  const query = useDebounce(inputValue, 300)
  const abortRef = useRef<AbortController | null>(null)

  // Local search state (manual, not React Query — avoids async complications)
  const [localResults, setLocalResults] = useState<LocalSearchResult[]>([])

  // ── Server search (React Query) ───────────────────────────────────────────

  const {
    data: serverData,
    isFetching: serverFetching,
    isError: serverError,
  } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      // Cancel any in-flight request
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      // 1 s timeout
      const timeoutId = setTimeout(() => ctrl.abort(), 1000)

      try {
        const raw = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: ctrl.signal },
        )
        clearTimeout(timeoutId)
        if (!raw.ok) throw new Error(`${raw.status}`)
        const json: unknown = await raw.json()
        const parsed = SearchResponseSchema.safeParse(json)
        return parsed.success ? parsed.data.results : []
      } catch {
        clearTimeout(timeoutId)
        throw new Error('server_search_failed')
      }
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
    retry: false,
  })

  // ── Local search (parallel effect) ───────────────────────────────────────

  useEffect(() => {
    if (query.length < 2) {
      setLocalResults([])
      return
    }
    let cancelled = false
    searchLocal(query).then((results) => {
      if (!cancelled) setLocalResults(results)
    }).catch(() => {
      if (!cancelled) setLocalResults([])
    })
    return () => { cancelled = true }
  }, [query])

  // ── Merge strategy ────────────────────────────────────────────────────────

  const displayResults: DisplayResult[] = (() => {
    if (query.length < 2) return []
    // Server errored / timed out → local only
    if (serverError) return mergeResults([], localResults)
    return mergeResults(serverData ?? [], localResults)
  })()

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (slug: string) => {
      onOpenChange(false)
      const trimmed = query.trim()
      const target = trimmed.length >= 2
        ? `/lab/${slug}?q=${encodeURIComponent(trimmed)}`
        : `/lab/${slug}`
      navigate(target)
    },
    [navigate, onOpenChange, query],
  )

  // Reset input when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue('')
      setLocalResults([])
    }
  }, [open])

  const isSearching = query.length >= 2 && serverFetching
  const isEmpty = query.length >= 2 && !isSearching && displayResults.length === 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Tìm lab… (vpc, dns, osi…)"
        value={inputValue}
        onValueChange={setInputValue}
      />

      <CommandList>
        {/* Loading state */}
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tìm kiếm…</span>
          </div>
        )}

        {/* Server error fallback indicator */}
        {serverError && query.length >= 2 && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 border-b">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>Server không khả dụng — hiển thị kết quả local</span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !isSearching && (
          <CommandEmpty>
            Không tìm thấy lab nào cho &ldquo;{query}&rdquo;
          </CommandEmpty>
        )}

        {/* Default hint when input is empty */}
        {query.length < 2 && (
          <CommandEmpty>
            Nhập ít nhất 2 ký tự để tìm kiếm…
          </CommandEmpty>
        )}

        {/* Results */}
        {displayResults.length > 0 && !isSearching && (
          <CommandGroup heading="Labs">
            {displayResults.map((result, i) => (
              <CommandItem
                key={result.slug}
                value={result.slug}
                onSelect={() => handleSelect(result.slug)}
                className="flex flex-col items-start gap-1 py-3 cursor-pointer animate-in fade-in slide-in-from-top-1"
                style={reduce ? undefined : { animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
                onClick={() => handleSelect(result.slug)}
              >
                {/* Title row */}
                <div className="flex w-full items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-sm flex-1 truncate">
                    {result.source === 'server'
                      ? renderDelimited(result.title)
                      : highlight(result.title, query)}
                  </span>
                  {result.source === 'local' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 shrink-0 text-muted-foreground"
                    >
                      local
                    </Badge>
                  )}
                </div>

                {/* Snippet */}
                {result.snippet && (
                  <p className="text-xs text-muted-foreground pl-5 line-clamp-2 leading-relaxed">
                    {result.source === 'server'
                      ? renderDelimited(result.snippet)
                      : highlight(result.snippet, query)}
                  </p>
                )}

                {/* Tags */}
                {result.tags.length > 0 && (
                  <div className="flex gap-1 pl-5 flex-wrap">
                    {result.tags.slice(0, 4).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
