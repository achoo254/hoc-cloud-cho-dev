/**
 * TCP/IP Packet Journey Interactive Playground
 * Phase 02: Layer-stack encapsulation (THINK)
 * Phase 03: Packet journey story mode (SEE)
 * TRY IT tab (optional): nhận nội dung quiz/flashcards/commands từ lab-renderer.
 * Syncs active tab with URL hash (#think, #see, #try-it) for persistence across reloads.
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { LayerStackEncap } from './layer-stack-encap'
import { OsiTcpipComparison } from './osi-tcpip-comparison'
import { NetworkTopology, EXAMPLE_DEVOPS_FLOW } from './network-topology'
import { MisconceptionsSection } from '../misconceptions-section'
import type { DiagramComponentProps } from './registry'

type TabValue = 'think' | 'see' | 'try-it'

function isValidTab(value: string, hasTryIt: boolean): value is TabValue {
  return value === 'think' || value === 'see' || (hasTryIt && value === 'try-it')
}

function getTabFromHash(hasTryIt: boolean): TabValue | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1).toLowerCase()
  return isValidTab(hash, hasTryIt) ? (hash as TabValue) : null
}

export function TcpIpJourneyPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  const hasTryIt = tryItContent !== undefined && tryItContent !== null

  const [activeTab, setActiveTab] = useState<TabValue>(() => getTabFromHash(hasTryIt) || 'think')

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash(hasTryIt)
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [hasTryIt])

  const handleTabChange = useCallback((value: string) => {
    if (!isValidTab(value, hasTryIt)) return
    setActiveTab(value)
    window.history.replaceState(null, '', `#${value}`)
  }, [hasTryIt])

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={cn(
            'grid w-full',
            hasTryIt ? 'grid-cols-3 max-w-md' : 'grid-cols-2 max-w-xs'
          )}
        >
          <TabsTrigger value="think">THINK</TabsTrigger>
          <TabsTrigger value="see">SEE</TabsTrigger>
          {hasTryIt && <TabsTrigger value="try-it">TRY IT</TabsTrigger>}
        </TabsList>

        <TabsContent
          value="think"
          forceMount
          data-tab-value="think"
          className="mt-4 space-y-6"
        >
          <MisconceptionsSection items={lab.misconceptions} />
          <LayerStackEncap tldr={lab.tldr} />
        </TabsContent>

        <TabsContent
          value="see"
          forceMount
          data-tab-value="see"
          className="mt-4 space-y-8"
        >
          <OsiTcpipComparison />

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

        {hasTryIt && (
          <TabsContent
            value="try-it"
            forceMount
            data-tab-value="try-it"
            className="mt-4 space-y-8"
          >
            {tryItContent}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
