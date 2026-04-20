/**
 * ARP Concept Cards — displays TLDR items as expandable cards
 * Follows same pattern as TcpUdpConceptCards for consistency
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import type { TldrItem } from '@/lib/schema-lab'

interface ArpConceptCardsProps {
  items: TldrItem[]
}

const CONCEPT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Tại sao cần ARP': { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-600 dark:text-emerald-400' },
  'ARP Request = broadcast': { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-600 dark:text-blue-400' },
  'ARP Reply = unicast': { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-600 dark:text-amber-400' },
  'ARP Cache (ip neigh)': { bg: 'bg-violet-500/15', border: 'border-violet-500/50', text: 'text-violet-600 dark:text-violet-400' },
  'Ping cùng LAN → ARP IP đích trực tiếp': { bg: 'bg-cyan-500/15', border: 'border-cyan-500/50', text: 'text-cyan-600 dark:text-cyan-400' },
  'Ping ngoài LAN → ARP IP của gateway': { bg: 'bg-rose-500/15', border: 'border-rose-500/50', text: 'text-rose-600 dark:text-rose-400' },
  'ARP Spoofing': { bg: 'bg-red-500/15', border: 'border-red-500/50', text: 'text-red-600 dark:text-red-400' },
}

const DEFAULT_COLOR = { bg: 'bg-muted/50', border: 'border-border', text: 'text-foreground' }

export function ArpConceptCards({ items }: ArpConceptCardsProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  function toggleExpand(idx: number) {
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Core Concepts</h3>
        <p className="text-sm text-muted-foreground">
          Click để xem chi tiết. Hiểu ARP là nền tảng để debug mọi sự cố L2/L3 trong LAN.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const title = item.what || item.term || item.name || `Concept ${idx + 1}`
          const colors = CONCEPT_COLORS[title] || DEFAULT_COLOR
          const isExpanded = expandedIdx === idx

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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn('text-sm font-bold', colors.text)}>
                      {title}
                    </span>
                  </div>
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

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
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
