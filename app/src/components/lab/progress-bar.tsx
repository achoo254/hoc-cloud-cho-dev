/**
 * Lab progress bar — driven by useProgress hook.
 * Shows completion percentage based on quiz_score presence + completed_at.
 */

import { cn } from '@/lib/utils'
import { useProgress } from '@/lib/hooks/use-progress'

interface ProgressBarProps {
  labSlug: string
  className?: string
}

export function ProgressBar({ labSlug, className }: ProgressBarProps) {
  const { entry, isLoading } = useProgress(labSlug)

  // Derive a 0–100 value: opened=33, quiz done=66, completed=100
  let pct = 0
  if (entry) {
    if (entry.opened_at) pct = 33
    if (entry.quiz_score !== null) pct = 66
    if (entry.completed_at) pct = 100
  }

  if (isLoading) {
    return (
      <div className={cn('h-1.5 rounded-full bg-muted animate-pulse', className)} />
    )
  }

  return (
    <div
      className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
