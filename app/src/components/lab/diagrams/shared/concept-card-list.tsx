/**
 * Reusable expandable concept cards component.
 * Generic version that accepts color mapping and items.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

export interface ConceptItem {
  title: string
  value?: string
  description: string
  details?: {
    label: string
    content: string
    variant?: 'default' | 'destructive' | 'info'
  }[]
}

export interface ConceptColorScheme {
  bg: string
  border: string
  text: string
}

interface ConceptCardListProps {
  items: ConceptItem[]
  colorMap?: Record<string, ConceptColorScheme>
  defaultColor?: ConceptColorScheme
  title?: string
  subtitle?: string
}

const DEFAULT_COLOR: ConceptColorScheme = {
  bg: 'bg-muted/50',
  border: 'border-border',
  text: 'text-foreground',
}

const DETAIL_VARIANTS = {
  default: 'text-muted-foreground',
  destructive: 'text-destructive',
  info: 'text-blue-600 dark:text-blue-400',
}

export function ConceptCardList({
  items,
  colorMap = {},
  defaultColor = DEFAULT_COLOR,
  title,
  subtitle,
}: ConceptCardListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  function toggleExpand(idx: number) {
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => {
          const colors = colorMap[item.title] || defaultColor
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-sm font-bold', colors.text)}>
                      {item.title}
                    </span>
                    {item.value && (
                      <span className="px-1.5 py-0.5 rounded bg-background/50 text-xs font-mono">
                        {item.value}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: item.description }}
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
                {isExpanded && item.details && item.details.length > 0 && (
                  <motion.div
                    initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                      {item.details.map((detail, detailIdx) => (
                        <div key={detailIdx} className="text-sm">
                          <span
                            className={cn(
                              'font-medium',
                              DETAIL_VARIANTS[detail.variant ?? 'default']
                            )}
                          >
                            {detail.label}:{' '}
                          </span>
                          <span
                            className="text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: detail.content }}
                          />
                        </div>
                      ))}
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
