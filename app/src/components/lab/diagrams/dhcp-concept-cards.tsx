/**
 * DHCP Concept Cards — displays TLDR items (DORA steps) as expandable cards
 * Pattern: Click to expand details with whyBreaks and deploymentUse
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import type { TldrItem } from '@/lib/schema-lab'

interface DhcpConceptCardsProps {
  items: TldrItem[]
}

const STEP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  D: { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-600 dark:text-blue-400' },
  O: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-600 dark:text-emerald-400' },
  R: { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-600 dark:text-amber-400' },
  A: { bg: 'bg-violet-500/15', border: 'border-violet-500/50', text: 'text-violet-600 dark:text-violet-400' },
  T1: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/50', text: 'text-cyan-600 dark:text-cyan-400' },
  T2: { bg: 'bg-rose-500/15', border: 'border-rose-500/50', text: 'text-rose-600 dark:text-rose-400' },
  Relay: { bg: 'bg-slate-500/15', border: 'border-slate-500/50', text: 'text-slate-600 dark:text-slate-400' },
}

const DEFAULT_COLOR = { bg: 'bg-muted/50', border: 'border-border', text: 'text-foreground' }

export function DhcpConceptCards({ items }: DhcpConceptCardsProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  function toggleExpand(idx: number) {
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">DORA Flow & Concepts</h3>
        <p className="text-sm text-muted-foreground">
          Click để xem chi tiết. DORA là 4 bước client tự động lấy IP từ DHCP server.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const stepKey = item.step || ''
          const colors = STEP_COLORS[stepKey] || DEFAULT_COLOR
          const isExpanded = expandedIdx === idx
          const title = item.name || item.what || item.term || `Step ${idx + 1}`

          return (
            <motion.div
              key={idx}
              layout
              className={cn(
                'rounded-xl border-2 p-4 transition-colors cursor-pointer',
                colors.bg,
                isExpanded ? colors.border : 'border-transparent'
              )}
              onClick={() => toggleExpand(idx)}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {stepKey && (
                      <span
                        className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {stepKey}
                      </span>
                    )}
                    <span className={cn('text-sm font-bold', colors.text)}>{title}</span>
                  </div>
                  {/* Port and src/dst info */}
                  {(item.src_dst || item.port) && (
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-1">
                      {item.src_dst && <span>{item.src_dst}</span>}
                      {item.port && <span className="opacity-70">Port: {item.port}</span>}
                    </div>
                  )}
                  <p
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: item.why }}
                  />
                </div>
                <div className="flex-none">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                      {item.payload && (
                        <p className="text-sm">
                          <span className="font-medium text-muted-foreground">Payload: </span>
                          <span className="font-mono text-xs">{item.payload}</span>
                        </p>
                      )}
                      <div className="text-sm">
                        <span className="font-medium text-destructive">Breaks when: </span>
                        <span
                          className="text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: item.whyBreaks }}
                        />
                      </div>
                      {item.deploymentUse && (
                        <p className="text-sm">
                          <span className="font-medium text-blue-600 dark:text-blue-400">Deploy: </span>
                          <span
                            className="text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: item.deploymentUse }}
                          />
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
