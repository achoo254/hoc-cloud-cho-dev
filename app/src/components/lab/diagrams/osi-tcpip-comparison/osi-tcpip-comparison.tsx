'use client'

/**
 * OSI ↔ TCP/IP Comparison — container stack 3 diagrams.
 *
 * Diagram 1: Three-column mapping (TCP/IP | Protocols | OSI).
 * Diagram 2: OSI 7-layer detail + TCP/IP 4-layer side-by-side + brackets.
 * Diagram 3: Flow state — packet encapsulation chạy tuần tự qua 7 tầng.
 */

import { ThreeColumnMapping } from './three-column-mapping'
import { OsiSevenLayer } from './osi-seven-layer'
import { OsiFlowState } from './osi-flow-state'

export function OsiTcpipComparison() {
  return (
    <div className="space-y-8">
      <ThreeColumnMapping />
      <div className="pt-6 border-t border-border">
        <OsiSevenLayer />
      </div>
      <div className="pt-6 border-t border-border">
        <OsiFlowState />
      </div>
    </div>
  )
}
