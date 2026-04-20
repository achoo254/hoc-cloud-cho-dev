/**
 * DNS Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: ConceptCards (tldr items)
 * SEE: DnsVisualizer (resolution flow, caching, record types)
 */

import { DnsConceptCards } from './dns-concept-cards'
import { DnsVisualizer } from './dns-visualizer'
import { PlaygroundShell } from './shared'
import type { DiagramComponentProps } from './registry'

export function DnsPlayground({ lab }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      thinkContent={
        <div className="space-y-8">
          <DnsConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">DNS Resolution Animation</h3>
            <DnsVisualizer />
          </section>
        </div>
      }
    />
  )
}
