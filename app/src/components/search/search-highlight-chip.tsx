/**
 * SearchHighlightChip — floating pill shown when URL has `?q=`.
 * Click × or press Esc to clear the query param (removes highlights).
 */

import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, Search } from 'lucide-react'

export function SearchHighlightChip() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  const clear = () => {
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (!query) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  if (!query) return null

  return (
    <div className="sticky top-4 z-20 mb-4 flex justify-center pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border bg-background/95 backdrop-blur px-3 py-1.5 text-sm shadow-md">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground">Đang highlight:</span>
        <span className="font-medium max-w-[260px] truncate">{query}</span>
        <button
          type="button"
          onClick={clear}
          aria-label="Bỏ highlight (Esc)"
          title="Bỏ highlight (Esc)"
          className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
