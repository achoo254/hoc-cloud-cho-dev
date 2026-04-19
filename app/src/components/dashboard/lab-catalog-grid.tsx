/**
 * lab-catalog-grid.tsx — Grid of shadcn Cards, one per lab from labs-index.json.
 * Hover lift via Framer Motion (translateY + scale).
 * Click navigates to /lab/:slug with layoutId shared-element transition.
 * Supports module filter prop from DashboardToolbar.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { Clock, Tag, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { LabIndexEntry } from '@/lib/content-loader'
import type { ProgressEntry } from '@/lib/api'

// ── Animation ─────────────────────────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ── Progress badge helper ─────────────────────────────────────────────────────

function labStatus(
  slug: string,
  progressEntries: ProgressEntry[],
): 'done' | 'in-progress' | 'new' {
  const entry = progressEntries.find((p) => p.lab_slug === slug)
  if (!entry) return 'new'
  if (entry.completed_at) return 'done'
  if (entry.opened_at) return 'in-progress'
  return 'new'
}

const STATUS_BADGE: Record<
  'done' | 'in-progress' | 'new',
  { label: string; variant: 'secondary' | 'default' | 'outline' }
> = {
  done:        { label: 'Done',        variant: 'secondary' },
  'in-progress': { label: 'In progress', variant: 'default' },
  new:         { label: 'New',         variant: 'outline' },
}

// ── Lab card ──────────────────────────────────────────────────────────────────

interface LabCardProps {
  lab: LabIndexEntry
  status: 'done' | 'in-progress' | 'new'
}

function LabCard({ lab, status }: LabCardProps) {
  const badge = STATUS_BADGE[status]
  const reduce = useReducedMotionPreference()

  return (
    <motion.div
      layoutId={`lab-card-${lab.slug}`}
      variants={cardVariants}
      whileHover={reduce ? {} : { y: -4, scale: 1.015, transition: { duration: 0.18 } }}
      whileTap={reduce ? {} : { scale: 0.98 }}
    >
      <Link
        to={`/lab/${lab.slug}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        aria-label={`Open lab: ${lab.title}`}
      >
        <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="pb-2 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                {lab.title}
              </CardTitle>
              <Badge
                variant={badge.variant}
                className="shrink-0 text-[10px] h-5"
              >
                {badge.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0 space-y-2">
            {/* Meta row */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {lab.estimated_minutes}m
              </span>
              <span className="flex items-center gap-1 capitalize">
                <Tag className="h-3 w-3" aria-hidden="true" />
                {lab.module}
              </span>
            </div>

            {/* Tags */}
            {lab.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lab.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* CTA hint */}
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <span>Xem lab</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LabCatalogGridProps {
  labsIndex: LabIndexEntry[]
  progressEntries: ProgressEntry[]
  isLoading: boolean
}

// ── Main component ────────────────────────────────────────────────────────────

export function LabCatalogGrid({
  labsIndex,
  progressEntries,
  isLoading,
}: LabCatalogGridProps) {
  const reduce = useReducedMotionPreference()
  const filtered = labsIndex

  if (isLoading) {
    return (
      <section aria-labelledby="catalog-heading">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="catalog-heading">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="catalog-heading"
          className="text-xl font-semibold tracking-tight"
        >
          Lab Catalog
        </h2>
        <span className="text-sm text-muted-foreground">
          {filtered.length} lab{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Không có lab nào cho module này.
        </p>
      ) : (
        <motion.div
          variants={gridVariants}
          initial={reduce ? false : 'hidden'}
          animate="visible"
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((lab) => (
            <LabCard
              key={lab.slug}
              lab={lab}
              status={labStatus(lab.slug, progressEntries)}
            />
          ))}
        </motion.div>
      )}
    </section>
  )
}
