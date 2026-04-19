/**
 * dashboard-toolbar.tsx — Sticky top toolbar: search trigger (Ctrl+K),
 * theme toggle, and module filter Select.
 * Search palette state is managed by SearchContext (see root-layout.tsx).
 */

import { Search, Moon, Sun, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from '@/hooks/use-theme'
import { useSearch } from '@/lib/search-context'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModuleFilter = 'all' | '01-networking'

interface DashboardToolbarProps {
  moduleFilter: ModuleFilter
  onModuleFilterChange: (value: ModuleFilter) => void
}

// ── Module options ─────────────────────────────────────────────────────────────

const MODULE_OPTIONS: { value: ModuleFilter; label: string }[] = [
  { value: 'all', label: 'All modules' },
  { value: '01-networking', label: '01 · Networking' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardToolbar({
  moduleFilter,
  onModuleFilterChange,
}: DashboardToolbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { setOpen: setSearchOpen } = useSearch()

  return (
    <>
      {/* Sticky toolbar */}
      <div className="sticky top-14 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-12 items-center gap-3">

          {/* Search trigger button */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground sm:w-52 justify-start flex-1 sm:flex-none"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search palette (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">Tìm lab…</span>
            <kbd
              className="ml-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex"
              aria-hidden="true"
            >
              ⌘K
            </kbd>
          </Button>

          {/* Module filter — hidden on mobile, shown behind Sheet in small screens */}
          <div className="hidden sm:flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select
              value={moduleFilter}
              onValueChange={(v) => onModuleFilterChange(v as ModuleFilter)}
            >
              <SelectTrigger
                className="w-44 h-8 text-sm"
                aria-label="Filter by module"
              >
                <SelectValue placeholder="All modules" />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

    </>
  )
}
