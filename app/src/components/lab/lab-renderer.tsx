/**
 * Top-level lab content renderer.
 * Renders sections trong 3 tab THINK/SEE/TRY IT:
 *   THINK:  TLDR table (hoặc playground THINK nếu có diagram)
 *   SEE:    Playground SEE (nếu có) + Walkthrough steps
 *   TRY IT: Quiz + Flashcards + Try-at-home commands
 * Khi có playground, tab state do playground quản (nó nhận Walkthrough + TRY IT làm slot).
 * Khi không có playground, lab-renderer tự dựng Tabs với 3 tab.
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from '@/components/lab/code-block'
import { QuizBlock } from '@/components/lab/quiz-block'
import { FlashcardSM2 } from '@/components/lab/flashcard-sm2'
import { ProgressStepper } from '@/components/lab/progress-stepper'
import { CompletionBanner } from '@/components/lab/completion-banner'
import { useProgress } from '@/lib/hooks/use-progress'
import { diagramRegistry, type DiagramRegistryKey } from '@/components/lab/diagrams/registry'
import { PlaygroundErrorBoundary } from '@/components/lab/diagrams/playground-error-boundary'
import { MisconceptionsSection } from '@/components/lab/misconceptions-section'
import type { LabContent, TldrItem, WalkthroughStep, TryAtHome } from '@/lib/schema-lab'

// Feature flag (RED TEAM #12) + query override
const PLAYGROUND_ENABLED = import.meta.env.VITE_ENABLE_DIAGRAM_PLAYGROUND !== 'false'
const getTextOverride = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('textMode') === '1'

interface LabRendererProps {
  lab: LabContent
  className?: string
}

type TabValue = 'think' | 'see' | 'try-it'

function isValidTab(value: string): value is TabValue {
  return value === 'think' || value === 'see' || value === 'try-it'
}

function getTabFromHash(): TabValue | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.slice(1).toLowerCase()
  return isValidTab(hash) ? (hash as TabValue) : null
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({
  phase,
  title,
  description,
}: {
  phase: 'THINK' | 'SEE' | 'TRY_IT'
  title: string
  description?: string
}) {
  const phaseColors: Record<typeof phase, string> = {
    THINK:  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    SEE:    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    TRY_IT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  }
  const phaseLabels: Record<typeof phase, string> = {
    THINK:  'THINK',
    SEE:    'SEE',
    TRY_IT: 'TRY IT',
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', phaseColors[phase])}>
          {phaseLabels[phase]}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// ── Playground skeleton (loading state) ───────────────────────────────────────

function PlaygroundSkeleton() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 animate-pulse">
      <div className="h-6 w-48 bg-muted rounded mb-4 mx-auto" />
      <div className="h-40 bg-muted/50 rounded" />
    </div>
  )
}

// ── Playground section ────────────────────────────────────────────────────────

function PlaygroundSection({
  lab,
  seeExtraContent,
  tryItContent,
}: {
  lab: LabContent
  seeExtraContent?: React.ReactNode
  tryItContent?: React.ReactNode
}) {
  if (!lab.diagram || lab.diagram.type !== 'custom') return null

  const componentKey = lab.diagram.component as DiagramRegistryKey
  const DiagramComponent = diagramRegistry[componentKey]

  if (!DiagramComponent) {
    console.warn(`[LabRenderer] Unknown diagram component: ${componentKey}`)
    return null
  }

  return (
    <PlaygroundErrorBoundary
      fallback={
        <div className="text-center py-8 text-muted-foreground">
          Failed to load interactive playground. Showing text version below.
        </div>
      }
    >
      <Suspense fallback={<PlaygroundSkeleton />}>
        <DiagramComponent
          lab={lab}
          seeExtraContent={seeExtraContent}
          tryItContent={tryItContent}
        />
      </Suspense>
    </PlaygroundErrorBoundary>
  )
}

// ── THINK: TLDR section ───────────────────────────────────────────────────────

function TldrSection({ items }: { items: TldrItem[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        phase="THINK"
        title="Tổng quan"
        description="Khái niệm cốt lõi — tại sao quan trọng & hậu quả khi lỗi."
      />
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-4 space-y-2"
          >
            {item.what && (
              <p className="text-sm font-semibold text-foreground">{item.what}</p>
            )}
            {item.name && !item.what && (
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
            )}
            {item.term && !item.what && !item.name && (
              <p className="text-sm font-semibold text-foreground">{item.term}</p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Why: </span>
              <span dangerouslySetInnerHTML={{ __html: item.why }} />
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-destructive">Breaks when: </span>
              <span dangerouslySetInnerHTML={{ __html: item.whyBreaks }} />
            </p>
            {item.deploymentUse && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-blue-600 dark:text-blue-400">Deploy: </span>
                <span dangerouslySetInnerHTML={{ __html: item.deploymentUse }} />
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── SEE: Walkthrough section ──────────────────────────────────────────────────

function WalkthroughSection({ steps }: { steps: WalkthroughStep[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        phase="SEE"
        title="Hướng dẫn từng bước"
        description="Quan sát chính xác những gì xảy ra."
      />
      <ol className="space-y-4">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-4">
            <div className="flex-none mt-1">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">
                {idx + 1}
              </span>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <p className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: step.what }} />
              <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: step.why }} />
              {step.code && (
                <CodeBlock code={step.code} lang="bash" />
              )}
              {step.observeWith && (
                <p className="text-xs text-muted-foreground italic">
                  Observe with: <span dangerouslySetInnerHTML={{ __html: step.observeWith }} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ── Try-at-home sub-section (rendered inside TRY IT tab) ──────────────────────

function TryAtHomeSection({ items }: { items: TryAtHome[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Thực hành tại nhà
      </h3>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1.5">
          <CodeBlock code={item.cmd} lang="bash" />
          <p className="text-sm text-muted-foreground px-1">
            <span className="font-medium text-foreground">Tại sao: </span>
            <span dangerouslySetInnerHTML={{ __html: item.why }} />
          </p>
          {item.observeWith && (
            <p className="text-xs text-muted-foreground px-1 italic">
              Quan sát với: <span dangerouslySetInnerHTML={{ __html: item.observeWith }} />
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── TRY IT: Quiz + Flashcards + Try-at-home composed block ────────────────────

function TryItBlock({
  lab,
  onQuizScore,
  onAllMastered,
}: {
  lab: LabContent
  onQuizScore: (score: number) => void
  onAllMastered: () => void
}) {
  return (
    <section className="space-y-8">
      <SectionHeading
        phase="TRY_IT"
        title="Thực hành"
        description="Quiz, flashcards, và lệnh thực hành."
      />

      <div id="section-quiz" className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Trắc nghiệm
        </h3>
        <QuizBlock items={lab.quiz} onScore={onQuizScore} />
      </div>

      <div id="section-flashcards" className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Thẻ ghi nhớ
        </h3>
        <FlashcardSM2
          cards={lab.flashcards}
          labSlug={lab.slug}
          onAllMastered={onAllMastered}
        />
      </div>

      <div id="section-commands">
        <TryAtHomeSection items={lab.try_at_home} />
      </div>
    </section>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function LabRenderer({ lab, className }: LabRendererProps) {
  const { update, touch } = useProgress(lab.slug)

  // Ping /touch once per mount — BE $setOnInsert keeps openedAt stable while
  // lastOpenedAt bumps each time. StrictMode guard via ref avoids dup write.
  const openedRef = useRef(false)
  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    touch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Gắn target="_blank" + rel an toàn cho MỌI <a href> nằm trong lab content
  // (kể cả HTML render bằng dangerouslySetInnerHTML từ `why` / `whyBreaks` /
  // playground concept-cards). MutationObserver bắt cả node mount sau
  // (lazy playgrounds, tab chuyển, quiz reveal…).
  const articleRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const root = articleRef.current
    if (!root) return
    const patchLinks = (scope: ParentNode) => {
      scope.querySelectorAll('a[href]').forEach((a) => {
        if (a.getAttribute('target') !== '_blank') a.setAttribute('target', '_blank')
        if (!a.getAttribute('rel')) a.setAttribute('rel', 'noopener noreferrer')
      })
    }
    patchLinks(root)
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) patchLinks(node as Element)
        })
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [lab.slug])

  function handleQuizScore(score: number) {
    // Only forward fields with real values — prevents races with flashcard
    // mastery from nulling out completed_at on partial scores.
    // Guard `lab.quiz.length > 0` so a lab with no quiz doesn't auto-complete
    // via score === 0.
    const isFullScore = lab.quiz.length > 0 && score === lab.quiz.length
    if (isFullScore) {
      update({ completed_at: Math.floor(Date.now() / 1000), quiz_score: score })
    } else {
      update({ quiz_score: score })
    }
  }

  function handleAllMastered() {
    // Only send completed_at — omitting quiz_score prevents the race
    // where a prior partial quiz score gets nulled by this callback.
    update({ completed_at: Math.floor(Date.now() / 1000) })
  }

  // Check if interactive playground should render (RED TEAM #12, #14)
  const hasPlayground = PLAYGROUND_ENABLED && !getTextOverride() && lab.diagram?.type === 'custom'

  const seeComposed = (
    <div id="section-see">
      <WalkthroughSection steps={lab.walkthrough} />
    </div>
  )

  const tryItComposed = (
    <TryItBlock
      lab={lab}
      onQuizScore={handleQuizScore}
      onAllMastered={handleAllMastered}
    />
  )

  return (
    <article ref={articleRef} className={cn('lab-article max-w-3xl mx-auto space-y-8 py-6 px-4', className)}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{lab.module}</Badge>
          <Badge variant="secondary" className="text-xs">~{lab.estimated_minutes} min</Badge>
        </div>
        <h1 className="text-2xl font-bold">{lab.title}</h1>
        <ProgressStepper labSlug={lab.slug} />
      </header>

      <CompletionBanner labSlug={lab.slug} labTitle={lab.title} />

      <Separator />

      {/* Khi có playground, playground quản tab (THINK/SEE/TRY IT) — lab-renderer đẩy
          SEE extra (walkthrough) và TRY IT (quiz/flashcards/try-at-home) xuống dưới dạng slot. */}
      {hasPlayground ? (
        <div id="section-playground">
          <PlaygroundSection
            lab={lab}
            seeExtraContent={seeComposed}
            tryItContent={tryItComposed}
          />
        </div>
      ) : (
        <LabTabsWithoutPlayground
          lab={lab}
          seeComposed={seeComposed}
          tryItComposed={tryItComposed}
        />
      )}
    </article>
  )
}

// ── Tabs wrapper khi không có playground ──────────────────────────────────────

function LabTabsWithoutPlayground({
  lab,
  seeComposed,
  tryItComposed,
}: {
  lab: LabContent
  seeComposed: React.ReactNode
  tryItComposed: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState<TabValue>(() => getTabFromHash() || 'think')

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash()
      if (tab) setActiveTab(tab)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleTabChange = useCallback((value: string) => {
    if (!isValidTab(value)) return
    setActiveTab(value)
    window.history.replaceState(null, '', `#${value}`)
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="think">THINK</TabsTrigger>
        <TabsTrigger value="see">SEE</TabsTrigger>
        <TabsTrigger value="try-it">TRY IT</TabsTrigger>
      </TabsList>

      <TabsContent
        value="think"
        forceMount
        data-tab-value="think"
        className="mt-4"
      >
        <div id="section-think" className="space-y-6">
          <MisconceptionsSection items={lab.misconceptions} />
          <TldrSection items={lab.tldr} />
        </div>
      </TabsContent>

      <TabsContent
        value="see"
        forceMount
        data-tab-value="see"
        className="mt-4 space-y-8"
      >
        {seeComposed}
      </TabsContent>

      <TabsContent
        value="try-it"
        forceMount
        data-tab-value="try-it"
        className="mt-4"
      >
        {tryItComposed}
      </TabsContent>
    </Tabs>
  )
}
