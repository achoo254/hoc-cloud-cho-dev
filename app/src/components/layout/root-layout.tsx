import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { SearchProvider, useSearch } from '@/lib/search-context'
import { SearchCommand } from '@/components/search/search-command'
import { useHotkey } from '@/lib/hooks/use-hotkey'
import { useDevReload } from '@/lib/hooks/use-dev-reload'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'

/** Inner shell — needs SearchProvider above it to call useSearch */
function RootLayoutInner() {
  const { open, setOpen, toggle } = useSearch()
  const location = useLocation()
  const reduce = useReducedMotionPreference()

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
        {/* Page transition: fade + subtle translateY, 200ms, respects reduced motion */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
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
