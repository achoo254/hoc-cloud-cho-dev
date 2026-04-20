/**
 * TCP/IP Packet Journey Interactive Playground
 * Phase 02: Layer-stack encapsulation (THINK)
 * Phase 03: Packet journey story mode (SEE)
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayerStackEncap } from './layer-stack-encap'
import { PacketJourney } from './packet-journey'
import type { DiagramComponentProps } from './registry'

export function TcpIpJourneyPlayground({ lab }: DiagramComponentProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="think" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="think">THINK</TabsTrigger>
          <TabsTrigger value="see">SEE</TabsTrigger>
        </TabsList>

        <TabsContent value="think" className="mt-4">
          <LayerStackEncap tldr={lab.tldr} />
        </TabsContent>

        <TabsContent value="see" className="mt-4">
          <PacketJourney />
        </TabsContent>
      </Tabs>
    </div>
  )
}
