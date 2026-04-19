import { Outlet } from 'react-router-dom'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { SearchProvider, useSearch } from '@/lib/search-context'
import { SearchCommand } from '@/components/search/search-command'
import { useHotkey } from '@/lib/hooks/use-hotkey'
import { useDevReload } from '@/lib/hooks/use-dev-reload'

/** Inner shell — needs SearchProvider above it to call useSearch */
function RootLayoutInner() {
  const { open, setOpen, toggle } = useSearch()

  // Register Ctrl+K / Cmd+K globally; fires even when no input is focused
  useHotkey(['mod+k'], toggle, { ignoreInputs: false })

  // Subscribe to server SSE for live reload (dev only, no-op in prod)
  useDevReload()

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />

      {/* Global search palette — rendered once at root, portal to body */}
      <SearchCommand open={open} onOpenChange={setOpen} />
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
