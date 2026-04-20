/**
 * IPv4 Subnet Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: SubnetCalculator + ConceptCards
 * SEE: SubnettingWalkthrough
 */

import { SubnetCalculator } from './subnet-calculator'
import { SubnettingWalkthrough } from './subnetting-walkthrough'
import { IPv4ConceptCards } from './ipv4-concept-cards'
import { PlaygroundShell } from './shared'
import type { DiagramComponentProps } from './registry'

export function IPv4Playground({ lab }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      thinkContent={
        <>
          <SubnetCalculator />
          <IPv4ConceptCards items={lab.tldr} />
        </>
      }
      seeContent={<SubnettingWalkthrough />}
    />
  )
}
