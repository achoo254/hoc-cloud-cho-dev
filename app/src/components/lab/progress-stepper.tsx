/**
 * ProgressStepper — replaces the single progress bar.
 * Three nodes reflect BE state machine: opened → quiz attempted → completed.
 *
 * Layout:
 *   Mobile  — vertical stack with 1px connectors
 *   Desktop — horizontal row with 1px connectors between dots
 *
 * Filled node = milestone reached. Tooltip shows formatted timestamp when
 * the corresponding field is present.
 */

import { cn } from '@/lib/utils'
import { useProgress, type SyncStatus } from '@/lib/hooks/use-progress'
import { SyncBadge } from '@/components/lab/sync-badge'

interface ProgressStepperProps {
  labSlug: string
  className?: string
}

interface Step {
  key: 'opened' | 'quiz' | 'completed'
  label: string
  reached: boolean
  /** Unix seconds — timestamp for tooltip; null when milestone not yet reached */
  timestamp: number | null
}

function formatTs(sec: number | null): string | undefined {
  if (!sec) return undefined
  const d = new Date(sec * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ProgressStepper({ labSlug, className }: ProgressStepperProps) {
  const { entry, isLoading, syncStatus } = useProgress(labSlug)

  if (isLoading) {
    return <div className={cn('h-8 rounded bg-muted animate-pulse', className)} />
  }

  const steps: Step[] = [
    {
      key: 'opened',
      label: 'Đã mở',
      reached: !!entry?.opened_at,
      timestamp: entry?.opened_at ?? null,
    },
    {
      key: 'quiz',
      label: 'Đã làm quiz',
      reached: entry?.quiz_score != null,
      // quiz_score itself carries no timestamp — fall back to last_updated as a proxy
      timestamp: entry?.quiz_score != null ? (entry?.last_updated ?? null) : null,
    },
    {
      key: 'completed',
      label: 'Hoàn thành',
      reached: !!entry?.completed_at,
      timestamp: entry?.completed_at ?? null,
    },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 w-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={steps.filter((s) => s.reached).length}
        >
          {steps.map((step, idx) => (
            <StepNode
              key={step.key}
              step={step}
              showConnector={idx < steps.length - 1}
              connectorReached={steps[idx + 1]?.reached ?? false}
            />
          ))}
        </div>
        <SyncBadgeSlot status={syncStatus} />
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StepNode({
  step,
  showConnector,
  connectorReached,
}: {
  step: Step
  showConnector: boolean
  connectorReached: boolean
}) {
  const tooltip = formatTs(step.timestamp)
  return (
    <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          title={tooltip}
          className={cn(
            'inline-block w-2 h-2 rounded-full flex-none transition-colors duration-300',
            step.reached ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
          aria-label={step.reached ? `${step.label} (đã đạt)` : `${step.label} (chưa đạt)`}
        />
        <span
          className={cn(
            'text-xs font-medium truncate',
            step.reached ? 'text-foreground' : 'text-muted-foreground',
          )}
          title={tooltip}
        >
          {step.label}
        </span>
      </div>
      {showConnector && (
        <span
          aria-hidden="true"
          className={cn(
            'hidden sm:block flex-1 h-px transition-colors duration-300',
            connectorReached ? 'bg-primary' : 'bg-muted-foreground/20',
          )}
        />
      )}
    </div>
  )
}

function SyncBadgeSlot({ status }: { status: SyncStatus }) {
  // Reserve horizontal space even when idle so the stepper layout doesn't jitter
  // as status transitions saving → saved → idle.
  return (
    <div className="flex-none ml-3 min-w-[6rem] flex justify-end">
      <SyncBadge status={status} />
    </div>
  )
}
