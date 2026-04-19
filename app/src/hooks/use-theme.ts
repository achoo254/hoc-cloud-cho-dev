import { useEffect, useState } from 'react'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'hoccloud-theme'

/** Resolve 'system' to an actual dark/light value via matchMedia */
function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

/**
 * Returns the stored preference (default: 'system').
 * Falls back to 'system' if the stored value is not a valid preference.
 */
function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

/**
 * Persists theme preference to localStorage and applies .dark/.light class to <html>.
 * Default preference: 'system' — follows OS setting.
 * `theme` returns the *resolved* value (never 'system') for UI logic (icon display etc).
 * `preference` returns the raw stored value.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(getStoredPreference)
  // Resolved theme used for icon/aria display — re-derived on mount and OS change
  const [theme, setThemeResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(getStoredPreference()),
  )

  useEffect(() => {
    const resolved = resolveTheme(preference)
    applyTheme(resolved)
    setThemeResolved(resolved)
    localStorage.setItem(STORAGE_KEY, preference)

    // When preference is 'system', also track OS changes live
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? 'dark' : 'light'
      applyTheme(next)
      setThemeResolved(next)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const toggleTheme = () =>
    setPreference((p) => {
      const resolved = resolveTheme(p)
      return resolved === 'dark' ? 'light' : 'dark'
    })

  const setTheme = (t: ThemePreference) => setPreference(t)

  return { theme, preference, setTheme, toggleTheme }
}
