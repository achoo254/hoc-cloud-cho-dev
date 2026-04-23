/**
 * recent-activity-section.tsx — "Tiếp tục học" list.
 * Shows up to 5 labs opened recently but not yet completed.
 * Deeplinks to the resume anchor (#section-quiz / flashcards / commands /
 * think) derived from the progress state machine.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { RotateCw, PlayCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLabsIndex } from '@/lib/hooks/use-labs-index'
import type { ProgressEntry } from '@/lib/api'

// ── Anchor derivation (shared logic) ──────────────────────────────────────────

/**
 * Pick the best section anchor to resume from, mirroring BE state machine:
 *   unopened         → #section-think      (intro)
 *   opened, no quiz  → #section-quiz       (start quiz)
 *   quiz done        → #section-flashcards (spaced repetition)
 *   completed        → #section-commands   (recap cheatsheet)
 */
export function deriveResumeAnchor(entry: ProgressEntry): string {
  if (!entry.opened_at) return '#section-think'
  if (entry.quiz_score == null) return '#section-quiz'
  if (!entry.completed_at) return '#section-flashcards'
  return '#section-commands'
}

// ── Time formatting (vi-VN, compact) ──────────────────────────────────────────

const rtf = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' })

function formatRelative(unixSec: number | null | undefined, nowSec: number): string {
  if (!unixSec) return '—'
  const diff = unixSec - nowSec // negative = past
  const absSec = Math.abs(diff)
  if (absSec < 60) return rtf.format(Math.round(diff), 'second')
  if (absSec < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (absSec < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (absSec < 604800) return rtf.format(Math.round(diff / 86400), 'day')
  if (absSec < 2592000) return rtf.format(Math.round(diff / 604800), 'week')
  return rtf.format(Math.round(diff / 2592000), 'month')
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RecentActivitySectionProps {
  progressEntries: ProgressEntry[]
  isLoading: boolean
  limit?: number
}

// ── Component ─────────────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

export function RecentActivitySection({
  progressEntries,
  isLoading,
  limit = 5,
}: RecentActivitySectionProps) {
  const { data: labsIndex = [] } = useLabsIndex()

  // Map slug → title from the cached API index.
  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of labsIndex) map.set(entry.slug, entry.title)
    return map
  }, [labsIndex])

  // "Still in progress" = opened (or touched) but not yet completed.
  // Sort desc by last_updated (falls back to opened_at / last_opened_at).
  const items = useMemo(() => {
    return progressEntries
      .filter((e) => !e.completed_at)
      .sort((a, b) => {
        const ta = a.last_updated ?? a.last_opened_at ?? a.opened_at ?? 0
        const tb = b.last_updated ?? b.last_opened_at ?? b.opened_at ?? 0
        return (tb ?? 0) - (ta ?? 0)
      })
      .slice(0, limit)
  }, [progressEntries, limit])

  const nowSec = Math.floor(Date.now() / 1000)

  if (isLoading) {
    return (
      <section aria-labelledby="recent-activity-heading">
        <div className="h-6 w-48 bg-muted/60 rounded animate-pulse mb-3" />
        <div className="space-y-px rounded-lg border border-border/60 bg-card overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 bg-muted/30 animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="recent-activity-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="recent-activity-heading"
          className="text-xl font-semibold tracking-tight flex items-center gap-2"
        >
          <RotateCw className="h-5 w-5 text-primary" aria-hidden="true" />
          Tiếp tục học
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-card/50 px-4 py-6 text-center">
          <PlayCircle className="mx-auto h-6 w-6 text-muted-foreground mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Chưa có lab nào đang học — khám phá danh mục bên dưới để bắt đầu.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card"
          aria-label="Labs chưa hoàn thành, mở gần nhất"
        >
          {items.map((entry) => {
            const title =
              titleBySlug.get(entry.lab_slug) ?? entry.lab_slug.replace(/-/g, ' ')
            const isOrphan = !titleBySlug.has(entry.lab_slug)
            const anchor = deriveResumeAnchor(entry)
            const recency = entry.last_updated ?? entry.last_opened_at ?? entry.opened_at
            return (
              <motion.li key={entry.lab_slug} variants={rowVariants}>
                <Link
                  to={`/lab/${entry.lab_slug}${anchor}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group"
                  aria-label={`Tiếp tục lab ${title}`}
                >
                  <MiniStepper entry={entry} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 text-sm font-medium truncate',
                      isOrphan && 'capitalize',
                    )}
                  >
                    {title}
                  </span>
                  <span
                    className="shrink-0 text-xs text-muted-foreground font-mono tabular-nums"
                    title={recency ? new Date(recency * 1000).toLocaleString('vi-VN') : undefined}
                  >
                    {formatRelative(recency, nowSec)}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors"
                    aria-hidden="true"
                  />
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </section>
  )
}

// ── Mini stepper (3 dots) ─────────────────────────────────────────────────────

function MiniStepper({ entry }: { entry: ProgressEntry }) {
  const reached = [
    !!entry.opened_at,
    entry.quiz_score != null,
    !!entry.completed_at,
  ]
  return (
    <span
      className="flex items-center gap-0.5 shrink-0"
      aria-label={`Đã đạt ${reached.filter(Boolean).length}/3 mốc`}
    >
      {reached.map((r, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            r ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
        />
      ))}
    </span>
  )
}
