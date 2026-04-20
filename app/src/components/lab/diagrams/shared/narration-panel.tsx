/**
 * Reusable narration panel for walkthrough components.
 * Shows step title, description, and optional badges/highlights.
 */

import { cn } from '@/lib/utils'

export interface NarrationContent {
  what: string
  why: string
  badge?: string
  badgeVariant?: 'info' | 'warning' | 'success' | 'error'
}

interface NarrationPanelProps {
  content: NarrationContent
  className?: string
}

const BADGE_VARIANTS = {
  info: 'bg-blue-500/20 text-blue-500',
  warning: 'bg-amber-500/20 text-amber-500',
  success: 'bg-emerald-500/20 text-emerald-500',
  error: 'bg-red-500/20 text-red-500',
}

export function NarrationPanel({ content, className }: NarrationPanelProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-muted/50 border border-border',
        className
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <p className="font-medium">{content.what}</p>
        {content.badge && (
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              BADGE_VARIANTS[content.badgeVariant ?? 'info']
            )}
          >
            {content.badge}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{content.why}</p>
    </div>
  )
}
