/**
 * Generic media query hook with SSR-safe initialization.
 * Returns live match state, updates on viewport change.
 */

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Convenience shortcut: true when viewport ≥ 768px (Tailwind `md` breakpoint). */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
