/**
 * TCP/IP Packet Journey Interactive Playground
 * Phase 02: Layer-stack encapsulation (THINK)
 * Phase 03: Packet journey story mode (SEE)
 * OUTPUT tab (optional): nhận nội dung quiz/flashcards/commands từ lab-renderer.
 * Syncs active tab with URL hash (#think, #see, #output) for persistence across reloads.
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { LayerStackEncap } from './layer-stack-encap'
import { PacketJourney } from './packet-journey'
import { NetworkTopology, EXAMPLE_DEVOPS_FLOW } from './network-topology'
import type { DiagramComponentProps } from './registry'

type TabValue = 'think' | 'see' | 'output'

function isValidTab(value: string, hasOutput: boolean): value is TabValue {
  return value === 'think' || value === 'see' || (hasOutput && value === 'output')
}

function getTabFromHash(hasOutput: boolean): TabValue | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1).toLowerCase()
  return isValidTab(hash, hasOutput) ? (hash as TabValue) : null
}

export function TcpIpJourneyPlayground({ lab, seeExtraContent, outputContent }: DiagramComponentProps) {
  const hasOutput = outputContent !== undefined && outputContent !== null

  const [activeTab, setActiveTab] = useState<TabValue>(() => getTabFromHash(hasOutput) || 'think')

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash(hasOutput)
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [hasOutput])

  const handleTabChange = useCallback((value: string) => {
    if (!isValidTab(value, hasOutput)) return
    setActiveTab(value)
    window.history.replaceState(null, '', `#${value}`)
  }, [hasOutput])

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={cn(
            'grid w-full',
            hasOutput ? 'grid-cols-3 max-w-md' : 'grid-cols-2 max-w-xs'
          )}
        >
          <TabsTrigger value="think">THINK</TabsTrigger>
          <TabsTrigger value="see">SEE</TabsTrigger>
          {hasOutput && <TabsTrigger value="output">OUTPUT</TabsTrigger>}
        </TabsList>

        <TabsContent
          value="think"
          forceMount
          data-tab-value="think"
          className="mt-4"
        >
          <LayerStackEncap tldr={lab.tldr} />
        </TabsContent>

        <TabsContent
          value="see"
          forceMount
          data-tab-value="see"
          className="mt-4 space-y-8"
        >
          <PacketJourney />

          {/* Network Topology với D3.js */}
          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-semibold mb-2">Network Topology</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Luồng request thực tế: DNS Query → DNS Response → HTTP Request → HTTP Response
            </p>
            <div className="flex gap-3 flex-wrap text-xs mb-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> DNS Query
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-violet-500" /> DNS Response
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500" /> HTTP Request
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500" /> HTTP Response
              </span>
            </div>
            <NetworkTopology config={EXAMPLE_DEVOPS_FLOW} />
          </div>

          {seeExtraContent}
        </TabsContent>

        {hasOutput && (
          <TabsContent
            value="output"
            forceMount
            data-tab-value="output"
            className="mt-4 space-y-8"
          >
            {outputContent}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
