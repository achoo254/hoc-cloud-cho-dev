/**
 * VictoriaLogs interactive playground.
 * THINK: misconceptions + concept cards (từ lab.tldr).
 * SEE:   mode-switcher 3 chế độ — Kiến trúc & Luồng / LogsQL / Dựng stack — + walkthrough (seeExtraContent).
 * TRY IT: quiz/flashcards/try-at-home (tryItContent từ lab-renderer).
 *
 * Tách logic theo file: vlogs-architecture-flow / vlogs-logsql-playground / vlogs-pipeline-stepper.
 */

import { useState } from 'react'
import { Network, Search, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlaygroundShell, ConceptCardList, type ConceptItem } from './shared'
import { MisconceptionsSection } from '../misconceptions-section'
import { VlogsArchitectureFlow } from './vlogs-architecture-flow'
import { VlogsLogsqlPlayground } from './vlogs-logsql-playground'
import { VlogsPipelineStepper } from './vlogs-pipeline-stepper'
import type { DiagramComponentProps } from './registry'
import type { TldrItem } from '@/lib/schema-lab'

// ── tldr → ConceptItem ────────────────────────────────────────────────────
function tldrToConceptItems(items: TldrItem[]): ConceptItem[] {
  return items.map((item) => {
    const title =
      item.what || item.term || item.name || item.layer || 'Khái niệm'
    const details: ConceptItem['details'] = []
    if (item.whyBreaks) {
      details.push({ label: 'Hỏng khi', content: item.whyBreaks, variant: 'destructive' })
    }
    if (item.deploymentUse) {
      details.push({ label: 'Triển khai', content: item.deploymentUse, variant: 'info' })
    }
    return { title, value: item.value, description: item.why, details }
  })
}

// ── SEE mode switcher ───────────────────────────────────────────────────────
type SeeMode = 'arch' | 'logsql' | 'pipeline'

const SEE_MODES: { id: SeeMode; label: string; icon: typeof Network }[] = [
  { id: 'arch', label: 'Kiến trúc & Luồng', icon: Network },
  { id: 'logsql', label: 'LogsQL', icon: Search },
  { id: 'pipeline', label: 'Dựng stack', icon: ListOrdered },
]

function SeeModeContent({ mode }: { mode: SeeMode }) {
  if (mode === 'arch') return <VlogsArchitectureFlow />
  if (mode === 'logsql') return <VlogsLogsqlPlayground />
  return <VlogsPipelineStepper />
}

export function VictoriaLogsPlayground({
  lab,
  seeExtraContent,
  tryItContent,
}: DiagramComponentProps) {
  const [seeMode, setSeeMode] = useState<SeeMode>('arch')

  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <MisconceptionsSection items={lab.misconceptions} />
          <ConceptCardList
            items={tldrToConceptItems(lab.tldr)}
            title="Khái niệm cốt lõi"
            subtitle="Chạm vào từng thẻ để xem cơ chế & khi nào hỏng."
          />
        </div>
      }
      seeContent={
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chế độ minh hoạ">
            {SEE_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={seeMode === id}
                onClick={() => setSeeMode(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  seeMode === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <SeeModeContent mode={seeMode} />
        </div>
      }
    />
  )
}
