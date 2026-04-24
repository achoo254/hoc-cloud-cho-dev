/**
 * TCP/UDP Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: ConceptCards (tldr items)
 * SEE: HandshakeVisualizer + Comparison
 */

import { TcpUdpConceptCards } from './tcp-udp-concept-cards'
import { TcpHandshakeVisualizer } from './tcp-handshake-visualizer'
import { TcpUdpComparison } from './tcp-udp-comparison'
import { PlaygroundShell } from './shared'
import { MisconceptionsSection } from '../misconceptions-section'
import type { DiagramComponentProps } from './registry'

export function TcpUdpPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <MisconceptionsSection items={lab.misconceptions} />
          <TcpUdpConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">TCP Handshake & UDP Animation</h3>
            <TcpHandshakeVisualizer />
          </section>
          <hr className="border-border" />
          <section>
            <TcpUdpComparison />
          </section>
        </div>
      }
    />
  )
}
