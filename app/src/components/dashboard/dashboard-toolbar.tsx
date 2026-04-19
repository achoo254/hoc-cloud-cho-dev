/**
 * dashboard-toolbar.tsx — Sticky top toolbar: search trigger (Ctrl+K),
 * theme toggle, and module filter Select.
 * Search palette is wired in phase 05; this phase renders a stub dialog.
 */

import { useState, useEffect } from 'react'
import { Search, Moon, Sun, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTheme } from '@/hooks/use-theme'

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
  const [searchOpen, setSearchOpen] = useState(false)

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

      {/* Search stub dialog — phase 05 will replace body with cmdk */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" aria-hidden="true" />
              Tìm kiếm lab
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground text-sm">
            <p>Search coming in phase 05.</p>
            <p className="mt-1 text-xs">
              Tính năng tìm kiếm full-text sẽ được triển khai ở phase tiếp theo.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
