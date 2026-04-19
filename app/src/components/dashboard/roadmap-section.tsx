/**
 * roadmap-section.tsx — Vertical timeline of learning modules.
 * Framer Motion scroll-linked reveal per node (useInView stagger).
 * 01-networking is active/done; 02-linux…05-ansible are placeholders.
 */

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { Badge } from '@/components/ui/badge'
import type { LabIndexEntry } from '@/lib/content-loader'
import type { ProgressEntry } from '@/lib/api'

// ── Roadmap module definitions ────────────────────────────────────────────────

interface RoadmapModule {
  id: string
  num: string
  name: string
  duration: string
  placeholder: boolean
}

const ROADMAP_MODULES: RoadmapModule[] = [
  { id: '01-networking', num: '01', name: 'Networking', duration: '~8h', placeholder: false },
  { id: '02-linux',      num: '02', name: 'Linux',      duration: 'TBA', placeholder: true },
  { id: '03-docker',     num: '03', name: 'Containers', duration: 'TBA', placeholder: true },
  { id: '04-k8s',        num: '04', name: 'Kubernetes', duration: 'TBA', placeholder: true },
  { id: '05-ansible',    num: '05', name: 'Ansible/IaC', duration: 'TBA', placeholder: true },
]

// ── Animation ─────────────────────────────────────────────────────────────────

const nodeVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const nodeVariantsReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

// ── Timeline node ─────────────────────────────────────────────────────────────

interface TimelineNodeProps {
  mod: RoadmapModule
  labCount: number
  completedCount: number
  index: number
  isLast: boolean
}

function TimelineNode({ mod, labCount, completedCount, index, isLast }: TimelineNodeProps) {
  const ref = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })
  const reduce = useReducedMotionPreference()
  const variants = reduce ? nodeVariantsReduced : nodeVariants

  const pct = labCount > 0 ? Math.round((completedCount / labCount) * 100) : 0
  const isDone = !mod.placeholder && labCount > 0 && completedCount === labCount
  const isActive = !mod.placeholder && labCount > 0

  return (
    <motion.li
      ref={ref}
      variants={variants}
      initial={reduce ? false : 'hidden'}
      animate={inView ? 'visible' : 'hidden'}
      // stagger via delay prop derived from index (skip delay when reduced)
      transition={{ delay: reduce ? 0 : index * 0.1 }}
      className="relative flex gap-4"
    >
      {/* Vertical connector line */}
      {!isLast && (
        <span
          className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
          aria-hidden="true"
        />
      )}

      {/* Node icon */}
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
        {isDone ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
        ) : isActive ? (
          <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{mod.num}</span>
          </div>
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
        )}
      </div>

      {/* Node content */}
      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`font-semibold text-sm ${mod.placeholder ? 'text-muted-foreground' : ''}`}
          >
            {mod.name}
          </span>

          {isDone && (
            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              Done
            </Badge>
          )}
          {isActive && !isDone && (
            <Badge variant="default" className="text-xs">
              Active
            </Badge>
          )}
          {mod.placeholder && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Coming soon
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{mod.duration}</span>
          {!mod.placeholder && labCount > 0 && (
            <span>· {completedCount}/{labCount} labs</span>
          )}
        </div>

        {/* Progress bar */}
        {isActive && !isDone && labCount > 0 && (
          <div
            className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${mod.name} progress: ${pct}%`}
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={reduce ? false : { width: 0 }}
              animate={inView ? { width: `${pct}%` } : { width: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.6, delay: index * 0.1 + 0.3, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>
    </motion.li>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RoadmapSectionProps {
  labsIndex: LabIndexEntry[]
  progressEntries: ProgressEntry[]
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoadmapSection({ labsIndex, progressEntries }: RoadmapSectionProps) {
  // Build per-module counts from labs index + progress
  const completedSlugs = new Set(
    progressEntries.filter((p) => p.completed_at).map((p) => p.lab_slug),
  )

  return (
    <section aria-labelledby="roadmap-heading">
      <h2
        id="roadmap-heading"
        className="text-xl font-semibold tracking-tight mb-4"
      >
        Learning Roadmap
      </h2>

      <ol className="list-none" aria-label="Learning roadmap timeline">
        {ROADMAP_MODULES.map((mod, i) => {
          const moduleLabs = labsIndex.filter((l) => l.module === mod.id)
          const completedCount = moduleLabs.filter((l) =>
            completedSlugs.has(l.slug),
          ).length

          return (
            <TimelineNode
              key={mod.id}
              mod={mod}
              labCount={moduleLabs.length}
              completedCount={completedCount}
              index={i}
              isLast={i === ROADMAP_MODULES.length - 1}
            />
          )
        })}
      </ol>
    </section>
  )
}
