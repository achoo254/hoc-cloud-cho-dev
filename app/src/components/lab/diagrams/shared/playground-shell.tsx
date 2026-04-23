/**
 * Reusable playground shell with THINK/SEE/OUTPUT tabs pattern.
 * Provides consistent structure for all lab playgrounds.
 * Syncs active tab with URL hash (#think, #see, #output) for persistence across reloads.
 *
 * OUTPUT tab renders chỉ khi `outputContent` được truyền vào. `seeExtraContent`
 * được append vào cuối SEE tab (dành cho walkthrough lab-renderer đẩy xuống).
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type TabValue = 'think' | 'see' | 'output'

interface PlaygroundShellProps {
  thinkContent: React.ReactNode
  seeContent: React.ReactNode
  /** Hiển thị ở cuối tab SEE (thường là Walkthrough từ lab-renderer). */
  seeExtraContent?: React.ReactNode
  /** Khi có, bật tab OUTPUT (quiz/flashcards/try-at-home). */
  outputContent?: React.ReactNode
  defaultTab?: TabValue
  thinkLabel?: string
  seeLabel?: string
  outputLabel?: string
  className?: string
}

function isValidTab(value: string, hasOutput: boolean): value is TabValue {
  return value === 'think' || value === 'see' || (hasOutput && value === 'output')
}

function getTabFromHash(hasOutput: boolean): TabValue | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1).toLowerCase()
  return isValidTab(hash, hasOutput) ? (hash as TabValue) : null
}

export function PlaygroundShell({
  thinkContent,
  seeContent,
  seeExtraContent,
  outputContent,
  defaultTab = 'think',
  thinkLabel = 'THINK',
  seeLabel = 'SEE',
  outputLabel = 'OUTPUT',
  className,
}: PlaygroundShellProps) {
  const hasOutput = outputContent !== undefined && outputContent !== null

  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    return getTabFromHash(hasOutput) || defaultTab
  })

  // Sync hash → state on popstate (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash(hasOutput)
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [hasOutput])

  // Update URL hash when tab changes
  const handleTabChange = useCallback((value: string) => {
    if (!isValidTab(value, hasOutput)) return
    setActiveTab(value)
    window.history.replaceState(null, '', `#${value}`)
  }, [hasOutput])

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className={cn(
            'grid w-full',
            hasOutput ? 'grid-cols-3 max-w-md' : 'grid-cols-2 max-w-xs'
          )}
        >
          <TabsTrigger value="think">{thinkLabel}</TabsTrigger>
          <TabsTrigger value="see">{seeLabel}</TabsTrigger>
          {hasOutput && <TabsTrigger value="output">{outputLabel}</TabsTrigger>}
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
