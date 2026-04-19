/**
 * due-section.tsx — SM-2 flashcards/labs due today.
 * Reads from localStorage via getDueItems() and shows each lab with
 * a priority Badge (due count). Links directly to /lab/:slug.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getDueItems } from '@/lib/stats'
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

      {/* Empty states */}
      {dueItems.length === 0 && totalNew === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <CheckCircle2
              className="h-8 w-8 mx-auto mb-2 text-emerald-500"
              aria-hidden="true"
            />
            <p className="font-medium">Hết thẻ cần ôn!</p>
            <p className="mt-1 text-xs">
              Mở một lab bất kỳ để tạo flashcard mới.
            </p>
          </CardContent>
        </Card>
      )}

      {/* New cards available but nothing due */}
      {dueItems.length === 0 && totalNew > 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            <Sparkles
              className="h-7 w-7 mx-auto mb-2 text-blue-500"
              aria-hidden="true"
            />
            <p className="font-medium">Không có thẻ due.</p>
            <p className="mt-1 text-xs">{totalNew} thẻ mới sẵn sàng học.</p>
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
          {dueItems.map((item) => (
            <motion.li key={item.labSlug} variants={rowVariants}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  {/* Lab info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-sm truncate capitalize">
                      {item.labSlug.replace(/-/g, ' ')}
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
                        aria-label={`Ôn tập lab ${item.labSlug}`}
                      >
                        Ôn ngay →
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  )
}
