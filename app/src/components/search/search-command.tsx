/**
 * SearchCommand — Ctrl+K / Cmd+K command palette.
 *
 * Strategy:
 *   1. Debounce input 300ms
 *   2. Run server search (React Query, 1 s AbortController timeout) against
 *      /api/search — backed by Meilisearch index derived from MongoDB labs
 *   3. Enter → navigate /lab/:slug, close dialog
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
import {
  SearchResponseSchema,
  type SearchResult,
} from '@/lib/schema-search'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

const MARK_CLASS = 'bg-yellow-200/70 dark:bg-yellow-400/30 text-foreground rounded px-0.5'

// Server-side delimiters (must match server/api/search-routes.js).
const HL_START = ''
const DELIMITED_PATTERN = /([^]*)/g

/**
 * Render server-delimited text — parses `…` spans (written by Meili
 * via the search endpoint) into <mark> React elements.
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

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const navigate = useNavigate()
  const reduce = useReducedMotionPreference()
  const [inputValue, setInputValue] = useState('')
  const query = useDebounce(inputValue, 300)
  const abortRef = useRef<AbortController | null>(null)

  // ── Server search (React Query) ───────────────────────────────────────────

  const {
    data: results = [],
    isFetching,
    isError,
  } = useQuery<SearchResult[]>({
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
    }
  }, [open])

  const isSearching = query.length >= 2 && isFetching
  const isEmpty =
    query.length >= 2 && !isSearching && !isError && results.length === 0

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

        {/* Server error notice */}
        {isError && query.length >= 2 && !isSearching && (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-amber-600 dark:text-amber-400">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Không kết nối được dịch vụ tìm kiếm. Vui lòng thử lại sau.</span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
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
        {results.length > 0 && !isSearching && !isError && (
          <CommandGroup heading="Labs">
            {results.map((result, i) => (
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
                    {renderDelimited(result.title)}
                  </span>
                </div>

                {/* Snippet */}
                {result.preview && (
                  <p className="text-xs text-muted-foreground pl-5 line-clamp-2 leading-relaxed">
                    {renderDelimited(result.preview)}
                  </p>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
