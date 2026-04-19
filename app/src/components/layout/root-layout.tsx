import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { SearchProvider, useSearch } from '@/lib/search-context'
import { SearchCommand } from '@/components/search/search-command'
import { Skeleton } from '@/components/ui/skeleton'
import { useHotkey } from '@/lib/hooks/use-hotkey'
import { useDevReload } from '@/lib/hooks/use-dev-reload'

// ── Route-level loading fallback ──────────────────────────────────────────────
// Shown by <Suspense> while a lazy route chunk is loading.

function RouteSkeleton() {
  return (
    <div className="container py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-5/6 max-w-xl" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/** Inner shell — needs SearchProvider above it to call useSearch */
function RootLayoutInner() {
  const { open, setOpen, toggle } = useSearch()

  // Register Ctrl+K / Cmd+K globally; fires even when no input is focused
  useHotkey(['mod+k'], toggle, { ignoreInputs: false })

  // Subscribe to server SSE for live reload (dev only, no-op in prod)
  useDevReload()

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <SiteHeader />

      {/* Skip-to-content link for keyboard/screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 focus:z-[100] focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <main id="main-content" className="flex-1">
        {/* NOTE: AnimatePresence + motion.div for page transitions was removed.
            It conflicted with React.StrictMode + Suspense-based lazy routes:
            the enter animation got stuck at opacity:0, causing a blank main
            area on SPA navigation until a hard reload. Per-component
            animations (accordion, toast, sheet, etc.) are unaffected. */}
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <SiteFooter />

      {/* Global search palette — rendered once at root, portal to body */}
      <SearchCommand open={open} onOpenChange={setOpen} />

      {/* Toast notifications — sonner, aria-live handled internally */}
      <Toaster richColors closeButton position="bottom-right" />
    </div>
  )
}

/** Root layout shell wrapping all routes via React Router <Outlet /> */
export function RootLayout() {
  return (
    <SearchProvider>
      <RootLayoutInner />
    </SearchProvider>
  )
}
