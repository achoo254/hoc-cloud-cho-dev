/**
 * DNS Concept Cards — displays TLDR items as expandable cards
 * Covers: Stub/Recursive resolver, Root/TLD/Authoritative servers, TTL, Record types
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import type { TldrItem } from '@/lib/schema-lab'

interface DnsConceptCardsProps {
  items: TldrItem[]
}

const CONCEPT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Stub resolver (client)': { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-600 dark:text-blue-400' },
  'Recursive resolver (8.8.8.8, ISP)': { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-600 dark:text-emerald-400' },
  'Root server (.)': { bg: 'bg-violet-500/15', border: 'border-violet-500/50', text: 'text-violet-600 dark:text-violet-400' },
  'TLD server (.com, .net, .vn)': { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-600 dark:text-amber-400' },
  'Authoritative server (ns1.example.com)': { bg: 'bg-rose-500/15', border: 'border-rose-500/50', text: 'text-rose-600 dark:text-rose-400' },
  'TTL (Time To Live)': { bg: 'bg-cyan-500/15', border: 'border-cyan-500/50', text: 'text-cyan-600 dark:text-cyan-400' },
  'Record A / AAAA': { bg: 'bg-indigo-500/15', border: 'border-indigo-500/50', text: 'text-indigo-600 dark:text-indigo-400' },
  'Record CNAME': { bg: 'bg-pink-500/15', border: 'border-pink-500/50', text: 'text-pink-600 dark:text-pink-400' },
  'Record MX': { bg: 'bg-orange-500/15', border: 'border-orange-500/50', text: 'text-orange-600 dark:text-orange-400' },
  'Record TXT (SPF/DKIM/DMARC)': { bg: 'bg-teal-500/15', border: 'border-teal-500/50', text: 'text-teal-600 dark:text-teal-400' },
  'Negative cache (NXDOMAIN)': { bg: 'bg-red-500/15', border: 'border-red-500/50', text: 'text-red-600 dark:text-red-400' },
  'DoH (DNS over HTTPS)': { bg: 'bg-sky-500/15', border: 'border-sky-500/50', text: 'text-sky-600 dark:text-sky-400' },
}

const DEFAULT_COLOR = { bg: 'bg-muted/50', border: 'border-border', text: 'text-foreground' }

export function DnsConceptCards({ items }: DnsConceptCardsProps) {
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
          Click để xem chi tiết. DNS là hệ thống phân tán giúp chuyển domain → IP.
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
              {/* Header */}
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
