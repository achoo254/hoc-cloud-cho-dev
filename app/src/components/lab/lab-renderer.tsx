/**
 * Top-level lab content renderer.
 * Renders sections in THINK → SEE → SHIP order (all visible on all devices):
 *   PLAYGROUND: Interactive diagram (if available)
 *   THINK: TLDR table
 *   SEE:   Walkthrough steps
 *   SHIP:  Quiz, Flashcards, Try-at-home commands
 */

import { useEffect, useRef, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CodeBlock } from '@/components/lab/code-block'
import { QuizBlock } from '@/components/lab/quiz-block'
import { FlashcardSM2 } from '@/components/lab/flashcard-sm2'
import { ProgressBar } from '@/components/lab/progress-bar'
import { useProgress } from '@/lib/hooks/use-progress'
import { diagramRegistry, type DiagramRegistryKey } from '@/components/lab/diagrams/registry'
import { PlaygroundErrorBoundary } from '@/components/lab/diagrams/playground-error-boundary'
import { WebTerminal } from '@/components/lab/web-terminal'
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

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({
  phase,
  title,
  description,
}: {
  phase: 'THINK' | 'SEE' | 'SHIP' | 'OUTPUT'
  title: string
  description?: string
}) {
  const phaseColors: Record<typeof phase, string> = {
    THINK:  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    SEE:    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    SHIP:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    OUTPUT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', phaseColors[phase])}>
          {phase}
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

// ── Playground section (desktop only via CSS) ─────────────────────────────────

function PlaygroundSection({ lab }: { lab: LabContent }) {
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
        <DiagramComponent lab={lab} />
      </Suspense>
    </PlaygroundErrorBoundary>
  )
}

// ── Terminal section (optional, via lab.terminal.enabled) ────────────────────

function TerminalSection({ lab }: { lab: LabContent }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        phase="SEE"
        title="Terminal thực hành"
        description="Shell tmux chạy trong container lab — gõ lệnh và quan sát trực tiếp."
      />
      <WebTerminal lab={lab} />
    </section>
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
              {item.why}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-destructive">Breaks when: </span>
              {item.whyBreaks}
            </p>
            {item.deploymentUse && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-blue-600 dark:text-blue-400">Deploy: </span>
                {item.deploymentUse}
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

// ── SHIP: Try-at-home section ─────────────────────────────────────────────────

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

// ── Main renderer ─────────────────────────────────────────────────────────────

export function LabRenderer({ lab, className }: LabRendererProps) {
  const { update } = useProgress(lab.slug)

  // Mark opened once per mount — BE applies $setOnInsert so later calls are no-ops
  // for openedAt. StrictMode guard via ref avoids the duplicate write in dev.
  const openedRef = useRef(false)
  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    update({ completed_at: null, quiz_score: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQuizScore(score: number) {
    update({
      completed_at: score === lab.quiz.length ? Math.floor(Date.now() / 1000) : null,
      quiz_score: score,
    })
  }

  // Check if interactive playground should render (RED TEAM #12, #14)
  const hasPlayground = PLAYGROUND_ENABLED && !getTextOverride() && lab.diagram?.type === 'custom'
  const hasTerminal = lab.terminal?.enabled === true

  return (
    <article className={cn('max-w-3xl mx-auto space-y-8 py-6 px-4', className)}>
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{lab.module}</Badge>
          <Badge variant="secondary" className="text-xs">~{lab.estimated_minutes} min</Badge>
        </div>
        <h1 className="text-2xl font-bold">{lab.title}</h1>
        <ProgressBar labSlug={lab.slug} />
      </header>

      <Separator />

      {/* Interactive Playground (if available) */}
      {hasPlayground && (
        <div id="section-playground">
          <PlaygroundSection lab={lab} />
        </div>
      )}

      {hasPlayground && <Separator />}

      {/* Terminal — optional interactive shell, renders alongside playground */}
      {hasTerminal && (
        <>
          <div id="section-terminal">
            <TerminalSection lab={lab} />
          </div>
          <Separator />
        </>
      )}

      {/* THINK: TLDR section — ẩn khi playground đã render TLDR (Concept Cards / LayerStack) */}
      {!hasPlayground && (
        <>
          <div id="section-think">
            <TldrSection items={lab.tldr} />
          </div>
          <Separator />
        </>
      )}

      {/* SEE: Walkthrough section — always visible on all devices */}
      <div id="section-see">
        <WalkthroughSection steps={lab.walkthrough} />
      </div>

      <Separator />

      {/* SHIP — anchored sub-sections for TOC */}
      <section className="space-y-8">
        <SectionHeading
          phase="OUTPUT"
          title="Thực hành"
          description="Quiz, flashcards, và lệnh thực hành."
        />

        <div id="section-quiz" className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Trắc nghiệm
          </h3>
          <QuizBlock items={lab.quiz} onScore={handleQuizScore} />
        </div>

        <div id="section-flashcards" className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Thẻ ghi nhớ
          </h3>
          <FlashcardSM2
            cards={lab.flashcards}
            labSlug={lab.slug}
            onAllMastered={() => {
              update({
                completed_at: Math.floor(Date.now() / 1000),
                quiz_score: null,
              })
            }}
          />
        </div>

        <div id="section-commands">
          <TryAtHomeSection items={lab.try_at_home} />
        </div>
      </section>
    </article>
  )
}
