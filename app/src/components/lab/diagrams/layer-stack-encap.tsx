/**
 * Layer-stack encapsulation demo (THINK section)
 * Phase 02: 4-layer TCP/IP stack with click-to-encapsulate animation.
 *
 * State machine: idle → encapsulating(currentLayer) → complete
 * - Click "Next" to advance encapsulation from L4 → L1
 * - Each step adds header chip to packet formula
 * - Reset returns to initial state
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, RotateCcw, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LAYER_COLORS, PDU_COLORS, type LayerKey } from './styles'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import type { TldrItem } from '@/lib/schema-lab'

interface LayerStackEncapProps {
  tldr: TldrItem[]
}

type EncapState = 0 | 1 | 2 | 3 | 4 // 0 = start at L4, 4 = complete (all layers)

const LAYER_ORDER: LayerKey[] = ['L4', 'L3', 'L2', 'L1']
const PDU_NAMES = ['Message', 'Segment', 'Packet', 'Frame'] as const

export function LayerStackEncap({ tldr }: LayerStackEncapProps) {
  const [encapState, setEncapState] = useState<EncapState>(0)
  const [expandedLayer, setExpandedLayer] = useState<LayerKey | null>(null)
  const prefersReducedMotion = useReducedMotion()

  // Map tldr items by layer (L4, L3, L2, L1)
  const layerMap = new Map<string, TldrItem>()
  for (const item of tldr) {
    if (item.layer) layerMap.set(item.layer, item)
  }

  function handleNext() {
    if (encapState < 4) setEncapState((s) => (s + 1) as EncapState)
  }

  function handleReset() {
    setEncapState(0)
    setExpandedLayer(null)
  }

  function toggleExpand(layer: LayerKey) {
    setExpandedLayer((prev) => (prev === layer ? null : layer))
  }

  // Build encapsulation formula based on current state
  const encapFormula = PDU_NAMES.slice(0, encapState).reverse()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">TCP/IP Layer Stack</h3>
          <p className="text-sm text-muted-foreground">
            Click layers to expand details. Use controls to see encapsulation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleNext}
            disabled={encapState >= 4}
          >
            <ArrowDown className="w-4 h-4 mr-1" />
            {encapState === 0 ? 'Start' : encapState < 4 ? 'Next Layer' : 'Done'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Encapsulation formula */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <span className="text-sm font-medium text-muted-foreground">Packet:</span>
        <div className="flex items-center gap-1">
          {encapState === 0 ? (
            <span className="text-sm text-muted-foreground italic">
              (click Start to begin encapsulation)
            </span>
          ) : (
            <AnimatePresence mode="popLayout">
              {encapFormula.map((pdu) => (
                <motion.span
                  key={pdu}
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    PDU_COLORS[pdu as keyof typeof PDU_COLORS]
                  )}
                >
                  {pdu}
                </motion.span>
              ))}
              {encapFormula.length > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  + Data
                </span>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Layer cards */}
      <div className="space-y-2">
        {LAYER_ORDER.map((layerKey, idx) => {
          const item = layerMap.get(layerKey)
          if (!item) return null

          const colors = LAYER_COLORS[layerKey]
          const isActive = idx < encapState
          const isNext = idx === encapState
          const isExpanded = expandedLayer === layerKey
          const protocols = item.protocol?.split(',').map((p) => p.trim()) ?? []

          return (
            <motion.div
              key={layerKey}
              layout
              className={cn(
                'rounded-xl border-2 p-4 transition-colors cursor-pointer',
                colors.bg,
                isActive ? colors.border : 'border-transparent',
                isNext && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
              )}
              onClick={() => toggleExpand(layerKey)}
            >
              {/* Layer header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-sm font-bold', colors.text)}>
                      {layerKey}
                    </span>
                    <span className="font-semibold">{item.name}</span>
                    {item.pdu && (
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-medium',
                        PDU_COLORS[item.pdu as keyof typeof PDU_COLORS] ?? 'bg-muted text-foreground'
                      )}>
                        {item.pdu}
                      </span>
                    )}
                  </div>

                  {/* Protocol chips */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {protocols.map((proto) => (
                      <span
                        key={proto}
                        className="px-1.5 py-0.5 rounded bg-background/50 text-xs"
                      >
                        {proto}
                      </span>
                    ))}
                  </div>

                  {/* Why snippet */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.why}
                  </p>
                </div>

                {/* Expand indicator */}
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                      {item.device && (
                        <p className="text-sm">
                          <span className="font-medium">Device:</span>{' '}
                          <span className="text-muted-foreground">{item.device}</span>
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="font-medium text-destructive">Breaks when:</span>{' '}
                        <span className="text-muted-foreground">{item.whyBreaks}</span>
                      </p>
                      {item.deploymentUse && (
                        <p className="text-sm">
                          <span className="font-medium text-blue-600 dark:text-blue-400">Deploy:</span>{' '}
                          <span className="text-muted-foreground">{item.deploymentUse}</span>
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
