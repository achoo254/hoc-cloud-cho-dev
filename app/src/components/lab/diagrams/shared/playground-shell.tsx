/**
 * Reusable playground shell with THINK/SEE tabs pattern.
 * Provides consistent structure for all lab playgrounds.
 * Syncs active tab with URL hash (#think, #see) for persistence across reloads.
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type TabValue = 'think' | 'see'

interface PlaygroundShellProps {
  thinkContent: React.ReactNode
  seeContent: React.ReactNode
  defaultTab?: TabValue
  thinkLabel?: string
  seeLabel?: string
  className?: string
}

function getTabFromHash(): TabValue | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1).toLowerCase()
  if (hash === 'think' || hash === 'see') return hash
  return null
}

export function PlaygroundShell({
  thinkContent,
  seeContent,
  defaultTab = 'think',
  thinkLabel = 'THINK',
  seeLabel = 'SEE',
  className,
}: PlaygroundShellProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    return getTabFromHash() || defaultTab
  })

  // Sync hash → state on popstate (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash()
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Update URL hash when tab changes
  const handleTabChange = useCallback((value: string) => {
    const tab = value as TabValue
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="think">{thinkLabel}</TabsTrigger>
          <TabsTrigger value="see">{seeLabel}</TabsTrigger>
        </TabsList>

        <TabsContent value="think" className="mt-4 space-y-6">
          {thinkContent}
        </TabsContent>

        <TabsContent value="see" className="mt-4">
          {seeContent}
        </TabsContent>
      </Tabs>
    </div>
  )
}
