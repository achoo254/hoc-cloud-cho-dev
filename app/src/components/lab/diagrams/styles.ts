/**
 * Shared layout utilities for diagram components.
 * Phase 02: Pure math functions — NO D3-selection/transition (RED TEAM #15).
 */

// Layer colors matching shadcn theme tokens
export const LAYER_COLORS = {
  L4: { bg: 'bg-violet-500/15', border: 'border-violet-500/50', text: 'text-violet-600 dark:text-violet-400' },
  L3: { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-600 dark:text-blue-400' },
  L2: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-600 dark:text-emerald-400' },
  L1: { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-600 dark:text-amber-400' },
} as const

// PDU header colors for encapsulation visualization
export const PDU_COLORS = {
  Message: 'bg-violet-500 text-white',
  Segment: 'bg-blue-500 text-white',
  Packet: 'bg-emerald-500 text-white',
  Frame: 'bg-amber-500 text-white',
} as const

export type LayerKey = keyof typeof LAYER_COLORS

// Pure arithmetic layout — no D3 needed for simple 4-row layout
export function getLayerY(index: number, totalHeight: number, gap = 8): number {
  const rowHeight = (totalHeight - gap * 3) / 4
  return index * (rowHeight + gap)
}

export function getLayerHeight(totalHeight: number, gap = 8): number {
  return (totalHeight - gap * 3) / 4
}
