/**
 * Reusable playground shell with THINK/SEE/TRY IT tabs pattern.
 * Provides consistent structure for all lab playgrounds.
 * Syncs active tab with URL hash (#think, #see, #try-it) for persistence across reloads.
 *
 * TRY IT tab renders chỉ khi `tryItContent` được truyền vào. `seeExtraContent`
 * được append vào cuối SEE tab (dành cho walkthrough lab-renderer đẩy xuống).
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type TabValue = 'think' | 'see' | 'try-it'

interface PlaygroundShellProps {
  thinkContent: React.ReactNode
  seeContent: React.ReactNode
  /** Hiển thị ở cuối tab SEE (thường là Walkthrough từ lab-renderer). */
  seeExtraContent?: React.ReactNode
  /** Khi có, bật tab TRY IT (quiz/flashcards/try-at-home). */
  tryItContent?: React.ReactNode
  defaultTab?: TabValue
  thinkLabel?: string
  seeLabel?: string
  tryItLabel?: string
  className?: string
}

function isValidTab(value: string, hasTryIt: boolean): value is TabValue {
  return value === 'think' || value === 'see' || (hasTryIt && value === 'try-it')
}

function getTabFromHash(hasTryIt: boolean): TabValue | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1).toLowerCase()
  return isValidTab(hash, hasTryIt) ? (hash as TabValue) : null
}

export function PlaygroundShell({
  thinkContent,
  seeContent,
  seeExtraContent,
  tryItContent,
  defaultTab = 'think',
  thinkLabel = 'THINK',
  seeLabel = 'SEE',
  tryItLabel = 'TRY IT',
  className,
}: PlaygroundShellProps) {
  const hasTryIt = tryItContent !== undefined && tryItContent !== null

  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    return getTabFromHash(hasTryIt) || defaultTab
  })

  // Sync hash → state on popstate (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash(hasTryIt)
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [hasTryIt])

  // Update URL hash when tab changes
  const handleTabChange = useCallback((value: string) => {
    if (!isValidTab(value, hasTryIt)) return
    setActiveTab(value)
    window.history.replaceState(null, '', `#${value}`)
  }, [hasTryIt])

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={cn(
            'grid w-full',
            hasTryIt ? 'grid-cols-3 max-w-md' : 'grid-cols-2 max-w-xs'
          )}
        >
          <TabsTrigger value="think">{thinkLabel}</TabsTrigger>
          <TabsTrigger value="see">{seeLabel}</TabsTrigger>
          {hasTryIt && <TabsTrigger value="try-it">{tryItLabel}</TabsTrigger>}
        </TabsList>

        <TabsContent
          value="think"
          forceMount
          data-tab-value="think"
          className="mt-4 space-y-6"
        >
          {thinkContent}
        </TabsContent>

        <TabsContent
          value="see"
          forceMount
          data-tab-value="see"
          className="mt-4 space-y-8"
        >
          {seeContent}
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
