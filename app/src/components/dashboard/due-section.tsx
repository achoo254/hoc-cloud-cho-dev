/**
 * due-section.tsx — SM-2 flashcards/labs due today.
 * Reads from localStorage via getDueItems() and shows each lab with
 * a priority Badge (due count). Links directly to /lab/:slug.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Sparkles, CheckCircle2, Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getDueItems } from '@/lib/stats'
import { getIndex } from '@/lib/content-loader'
import type { ProgressEntry } from '@/lib/api'

// ── Animation ─────────────────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DueSectionProps {
  progressEntries: ProgressEntry[]
  isLoading: boolean
}

// ── Badge variant helper ──────────────────────────────────────────────────────

function duePriority(dueCount: number): 'destructive' | 'default' | 'secondary' {
  if (dueCount >= 10) return 'destructive'
  if (dueCount >= 3) return 'default'
  return 'secondary'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DueSection({ progressEntries, isLoading }: DueSectionProps) {
  // getDueItems reads localStorage — safe to call on client, returns [] on empty
  const dueItems = useMemo(() => getDueItems(progressEntries), [progressEntries])
  // Map slug → human-readable title. Fallback handled at render site.
  const titleBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of getIndex()) map.set(entry.slug, entry.title)
    return map
  }, [])

  const totalDue = dueItems.reduce((s, d) => s + d.dueCount, 0)
  const totalNew = dueItems.reduce((s, d) => s + d.newCount, 0)

  if (isLoading) {
    return (
      <section aria-labelledby="due-heading">
        <Skeleton className="h-6 w-48 mb-3" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="due-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="due-heading"
          className="text-xl font-semibold tracking-tight flex items-center gap-2"
        >
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          Ôn tập hôm nay
        </h2>

        {totalDue > 0 && (
          <Badge variant="destructive" className="tabular-nums">
            {totalDue} due
          </Badge>
        )}
      </div>

      {/* Empty state — no flashcards tracked yet */}
      {dueItems.length === 0 && totalNew === 0 && (
        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-500/[0.06] to-transparent"
            aria-hidden="true"
          />
          <CardContent className="relative flex items-start gap-4 py-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Inbox className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Hôm nay không có thẻ cần ôn</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hoàn thành quiz trong bất kỳ lab nào để tự động sinh flashcard. SM-2 sẽ nhắc đúng lúc sắp quên.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                  0 thẻ due
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">
                  <Sparkles className="h-3 w-3 text-sky-500" aria-hidden="true" />
                  0 thẻ mới
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New cards available but nothing due */}
      {dueItems.length === 0 && totalNew > 0 && (
        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-500/[0.06] to-transparent"
            aria-hidden="true"
          />
          <CardContent className="relative flex items-start gap-4 py-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
              <Sparkles className="h-5 w-5 text-sky-500" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Không có thẻ đến hạn</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalNew} thẻ mới đang chờ — bắt đầu học để đưa vào chu kỳ ôn tập.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due list */}
      {dueItems.length > 0 && (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
          aria-label="Labs with cards due today"
        >
          {dueItems.map((item) => {
            // Fallback: slug-as-title when lab missing from index (orphaned SRS data)
            const title =
              titleBySlug.get(item.labSlug) ?? item.labSlug.replace(/-/g, ' ')
            const useCapitalize = !titleBySlug.has(item.labSlug)
            return (
              <motion.li key={item.labSlug} variants={rowVariants}>
                <Card className="hover:bg-accent/40 transition-colors">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                    {/* Lab info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          'font-medium text-sm truncate',
                          useCapitalize && 'capitalize',
                        )}
                      >
                        {title}
                      </span>
                    </div>

                    {/* Badges + CTA */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.dueCount > 0 && (
                        <Badge variant={duePriority(item.dueCount)} className="tabular-nums text-xs">
                          {item.dueCount} due
                        </Badge>
                      )}
                      {item.newCount > 0 && (
                        <Badge variant="secondary" className="tabular-nums text-xs">
                          {item.newCount} new
                        </Badge>
                      )}
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                      >
                        <Link
                          to={`/lab/${item.labSlug}`}
                          aria-label={`Ôn tập lab ${title}`}
                        >
                          Ôn ngay →
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </section>
  )
}
