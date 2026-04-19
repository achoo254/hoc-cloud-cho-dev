/**
 * SearchContext — lightweight React context for global search palette state.
 * Provider lives in RootLayout; consumers can open/close the palette from
 * anywhere in the tree without prop drilling.
 */

import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// ── Context shape ─────────────────────────────────────────────────────────────

interface SearchContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <SearchContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SearchContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error('useSearch must be used within <SearchProvider>')
  }
  return ctx
}
