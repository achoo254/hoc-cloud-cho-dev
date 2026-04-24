/**
 * ARP Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: ArpConceptCards (tldr items)
 * SEE: ArpVisualizer + ArpHeaderComparison
 */

import { ArpConceptCards } from './arp-concept-cards'
import { ArpVisualizer } from './arp-visualizer'
import { ArpHeaderComparison } from './arp-header-comparison'
import { PlaygroundShell } from './shared'
import { MisconceptionsSection } from '../misconceptions-section'
import type { DiagramComponentProps } from './registry'

export function ArpPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <MisconceptionsSection items={lab.misconceptions} />
          <ArpConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">ARP Protocol Animation</h3>
            <ArpVisualizer />
          </section>
          <hr className="border-border" />
          <section>
            <ArpHeaderComparison />
          </section>
        </div>
      }
    />
  )
}
