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
import { PacketDecoder } from './shared/packet-decoder'
import { dhcpCaseACapture } from './shared/sample-captures/dhcp-case-a-capture'
import { dhcpCaseBCapture } from './shared/sample-captures/dhcp-case-b-capture'
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
          <section>
            <h3 className="text-lg font-semibold mb-4">Case A — Manual TRƯỚC: server ping-check abandons IP</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Client2 đặt static <code>.200</code> trước. Server thử cấp <code>.200</code> → ICMP probe → Client2 reply → abandon → OFFER <code>.201</code> cho Client1.
            </p>
            <PacketDecoder defaultPackets={dhcpCaseACapture} title="Case A capture (6 packets) — ping-check kích hoạt" />
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-4">Case B — Manual SAU: ARP cache flap</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Client1 đã có lease DHCP <code>.201</code>. Client2 đặt static <code>.201</code> → cả 2 cùng claim → mọi ARP request đều có 2 reply từ 2 MAC khác nhau.
            </p>
            <PacketDecoder defaultPackets={dhcpCaseBCapture} title="Case B capture (6 packets) — ARP flap 2 MAC cùng IP" />
          </section>
        </div>
      }
    />
  )
}
