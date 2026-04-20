/**
 * Dev-only route: /dev/spike
 * Phase 00 — D3 × Framer Motion integration spike
 * Delete this file after phase-01 complete
 */

import { SpikePoc } from '@/components/lab/diagrams/spike-poc'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function SpikePlaygroundPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">DEV ONLY</Badge>
            <Badge variant="outline" className="text-xs">Phase 00</Badge>
            <h1 className="text-xl font-bold">D3 × Framer Motion Spike</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Validate D3 scale output + Framer Motion animation without DOM conflict.
          </p>
        </header>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-base font-semibold">POC: 3 Devices + Animated Packet</h2>
          <SpikePoc />
        </section>

        <Separator />

        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Go/No-Go Criteria:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>D3 output scale → Framer transform render đúng, không conflict ✓</li>
            <li>HMR reload không phá animation state</li>
            <li>Bundle impact &lt; 60kb gzipped cho d3-scale + d3-shape + framer-motion</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
