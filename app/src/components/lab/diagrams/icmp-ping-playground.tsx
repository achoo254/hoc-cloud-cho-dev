/**
 * ICMP Ping Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: ConceptCards (tldr items)
 * SEE: PingVisualizer (ping, traceroute, ICMP errors)
 */

import { IcmpPingConceptCards } from './icmp-ping-concept-cards'
import { IcmpPingVisualizer } from './icmp-ping-visualizer'
import { PlaygroundShell } from './shared'
import type { DiagramComponentProps } from './registry'

export function IcmpPingPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <IcmpPingConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">ICMP Ping & Traceroute Animation</h3>
            <IcmpPingVisualizer />
          </section>
        </div>
      }
    />
  )
}
