/**
 * DHCP Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: ConceptCards (DORA steps from tldr)
 * SEE: DoraVisualizer (animation)
 */

import { DhcpConceptCards } from './dhcp-concept-cards'
import { DhcpDoraVisualizer } from './dhcp-dora-visualizer'
import { PlaygroundShell } from './shared'
import { MisconceptionsSection } from '../misconceptions-section'
import type { DiagramComponentProps } from './registry'

export function DhcpPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <MisconceptionsSection items={lab.misconceptions} />
          <DhcpConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">DHCP DORA Flow Animation</h3>
            <DhcpDoraVisualizer />
          </section>
        </div>
      }
    />
  )
}
