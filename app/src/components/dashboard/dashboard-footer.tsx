/**
 * dashboard-footer.tsx — Attribution, links, keyboard shortcuts reference.
 * 3-col desktop layout; stacks vertically on mobile.
 * Ported from labs/_shared/index-sections-footer.js.
 */

import { Separator } from '@/components/ui/separator'
import { Github, ExternalLink } from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/inetdev/hoc-cloud-cho-dev', external: true },
  { label: 'Production', href: 'https://hoc-cloud.inetdev.io.vn', external: true },
  { label: 'Docs', href: '/docs/', external: false },
  { label: 'Discord', href: '#', external: false },
] as const

const SHORTCUTS = [
  { key: 'Ctrl+K', desc: 'Mở tìm kiếm' },
  { key: 'g h',    desc: 'Về trang chủ' },
  { key: 'j / k',  desc: 'Lab trước / sau' },
  { key: '?',      desc: 'Hiện shortcuts' },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardFooter() {
  return (
    <footer
      className="mt-16 border-t bg-muted/30"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="container py-8">
        <div className="grid gap-8 sm:grid-cols-3">

          {/* Col 1 — Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Links
            </h3>
            <nav aria-label="Site links" className="flex flex-col gap-2">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  {...(l.external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {l.label === 'GitHub' ? (
                    <Github className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : l.external ? (
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : null}
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Col 2 — Keyboard shortcuts */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Keyboard
            </h3>
            <ul
              className="space-y-1.5"
              aria-label="Keyboard shortcuts reference"
            >
              {SHORTCUTS.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-sm">
                  <kbd className="inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    {s.key}
                  </kbd>
                  <span className="text-muted-foreground">{s.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Meta */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Meta
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Hoc Cloud cho Dev</p>
              <p>v1.0.0 · MIT License</p>
              <p>Built with ♥ by inet</p>
            </div>
          </div>

        </div>

        <Separator className="my-6" />

        <p className="text-xs text-center text-muted-foreground">
          © {new Date().getFullYear()} Hoc Cloud cho Dev. Hands-on labs for Cloud &amp; DevOps learners.
        </p>
      </div>
    </footer>
  )
}
