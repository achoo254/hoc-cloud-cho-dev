/**
 * Reusable playground shell with THINK/SEE tabs pattern.
 * Provides consistent structure for all lab playgrounds.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface PlaygroundShellProps {
  thinkContent: React.ReactNode
  seeContent: React.ReactNode
  defaultTab?: 'think' | 'see'
  thinkLabel?: string
  seeLabel?: string
  className?: string
}

export function PlaygroundShell({
  thinkContent,
  seeContent,
  defaultTab = 'think',
  thinkLabel = 'THINK',
  seeLabel = 'SEE',
  className,
}: PlaygroundShellProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <Tabs defaultValue={defaultTab} className="w-full">
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
