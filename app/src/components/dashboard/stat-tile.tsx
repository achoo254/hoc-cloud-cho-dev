/**
 * stat-tile.tsx — Compact metric tile with icon, value, and contextual detail.
 * Replaces the oversized CardHeader+CardContent pattern for dashboard KPIs.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatTileProps {
  icon: ReactNode
  label: string
  value: ReactNode
  suffix?: ReactNode
  detail?: ReactNode
  accent: 'orange' | 'emerald' | 'sky' | 'violet'
  progress?: { current: number; total: number } // renders bottom bar if present
}

const ACCENT_MAP = {
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-500',  bar: 'bg-orange-500',  border: 'before:bg-orange-500/60' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', bar: 'bg-emerald-500', border: 'before:bg-emerald-500/60' },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-500',     bar: 'bg-sky-500',     border: 'before:bg-sky-500/60' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-500',  bar: 'bg-violet-500',  border: 'before:bg-violet-500/60' },
} as const

export function StatTile({ icon, label, value, suffix, detail, accent, progress }: StatTileProps) {
  const a = ACCENT_MAP[accent]
  const pct = progress ? Math.min(100, Math.round((progress.current / Math.max(1, progress.total)) * 100)) : 0

  return (
    <div
      className={cn(
        // Accent bar on the left edge via ::before
        'relative overflow-hidden rounded-xl border border-border/60 bg-card p-4',
        'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full',
        a.border,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', a.bg, a.text)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums leading-none">{value}</span>
            {suffix && <span className="text-sm text-muted-foreground tabular-nums">{suffix}</span>}
          </div>
          {detail && <div className="mt-1.5 text-xs text-muted-foreground">{detail}</div>}
        </div>
      </div>

      {progress && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-[width]', a.bar)}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  )
}
