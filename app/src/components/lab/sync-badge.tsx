/**
 * SyncBadge — small dot + text indicating progress sync state.
 * Driven by useProgress().syncStatus. aria-live polite so screen readers
 * catch "saved" / "error" without stealing focus.
 */

import { cn } from '@/lib/utils'
import type { SyncStatus } from '@/lib/hooks/use-progress'

interface SyncBadgeProps {
  status: SyncStatus
  className?: string
}

const LABEL: Record<SyncStatus, string> = {
  idle: '',
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  error: 'Lỗi lưu',
}

const DOT: Record<SyncStatus, string> = {
  idle: 'bg-muted-foreground/30',
  saving: 'bg-amber-500 animate-pulse',
  saved: 'bg-emerald-500',
  error: 'bg-destructive',
}

export function SyncBadge({ status, className }: SyncBadgeProps) {
  // Don't render anything while idle — keeps header clean when no mutation is in flight.
  if (status === 'idle') {
    return <span className={cn('inline-block w-0', className)} aria-hidden="true" />
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-200',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', DOT[status])} />
      <span>{LABEL[status]}</span>
    </span>
  )
}
