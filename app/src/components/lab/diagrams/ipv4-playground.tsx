/**
 * IPv4 Subnet Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: ConceptCards + DerivationGuide
 * SEE: SubnetCalculator + IpAddressClassifier + HostBitsVisualizer
 */

import { SubnetCalculator } from './subnet-calculator'
import { HostBitsVisualizer } from './host-bits-visualizer'
import { IpAddressClassifier } from './ip-address-classifier'
import { IPv4ConceptCards } from './ipv4-concept-cards'
import { SubnetDerivationGuide } from './subnet-derivation-guide'
import { PlaygroundShell } from './shared'
import type { DiagramComponentProps } from './registry'

export function IPv4Playground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <IPv4ConceptCards items={lab.tldr} />
          <hr className="border-border" />
          <SubnetDerivationGuide />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <SubnetCalculator />
          <section>
            <h3 className="text-lg font-semibold mb-4">IP Classes & Ranges</h3>
            <IpAddressClassifier />
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-4">Host Bits: Network vs Broadcast</h3>
            <HostBitsVisualizer />
          </section>
        </div>
      }
    />
  )
}
