/**
 * Top-level lab content renderer.
 * Renders sections in THINK → SEE → SHIP order:
 *   THINK: TLDR table (or interactive playground on desktop)
 *   SEE:   Walkthrough steps (or interactive playground on desktop)
 *   SHIP:  Quiz, Flashcards, Try-at-home commands
 *
 * Phase 01: Added responsive playground switch (CSS-only, RED TEAM #14)
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
  phase: 'THINK' | 'SEE' | 'SHIP'
  title: string
  description?: string
}) {
  const phaseColors: Record<typeof phase, string> = {
    THINK: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    SEE:   'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    SHIP:  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
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

// ── THINK: TLDR section ───────────────────────────────────────────────────────

function TldrSection({ items }: { items: TldrItem[] }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        phase="THINK"
        title="TL;DR"
        description="Core concepts — why they matter & what breaks when they fail."
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
        title="Walkthrough"
        description="Step-by-step — observe exactly what happens."
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
              <p className="font-medium text-sm">{step.what}</p>
              <p className="text-sm text-muted-foreground">{step.why}</p>
              {step.code && (
                <CodeBlock code={step.code} lang="bash" />
              )}
              {step.observeWith && (
                <p className="text-xs text-muted-foreground italic">
                  Observe with: {step.observeWith}
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
    <section className="space-y-4">
      <SectionHeading
        phase="SHIP"
        title="Try at Home"
        description="Commands you can run right now."
      />
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="space-y-1.5">
            <CodeBlock code={item.cmd} lang="bash" />
            <p className="text-sm text-muted-foreground px-1">
              <span className="font-medium text-foreground">Why: </span>
              {item.why}
            </p>
            {item.observeWith && (
              <p className="text-xs text-muted-foreground px-1 italic">
                Observe with: {item.observeWith}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function LabRenderer({ lab, className }: LabRendererProps) {
  const { update } = useProgress(lab.slug)

  // Fire opened_at once per mount — useRef guard prevents double-fire in StrictMode
  const openedRef = useRef(false)
  useEffect(() => {
    if (openedRef.current) return
    openedRef.current = true
    update({ opened_at: new Date().toISOString(), completed_at: null, quiz_score: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQuizScore(score: number) {
    update({
      opened_at: new Date().toISOString(),
      completed_at: score === lab.quiz.length ? new Date().toISOString() : null,
      quiz_score: score,
    })
  }

  // Check if interactive playground should render (RED TEAM #12, #14)
  const hasPlayground = PLAYGROUND_ENABLED && !getTextOverride() && lab.diagram?.type === 'custom'

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

      {/* THINK + SEE: Playground (desktop) or Text (mobile) — CSS-only switch */}
      {hasPlayground ? (
        <>
          {/* Desktop: Interactive playground replaces THINK + SEE */}
          <div className="hidden md:block" id="section-playground">
            <PlaygroundSection lab={lab} />
          </div>

          {/* Mobile: Text fallback for THINK + SEE */}
          <div className="md:hidden space-y-8">
            <div id="section-think">
              <TldrSection items={lab.tldr} />
            </div>
            <Separator />
            <div id="section-see">
              <WalkthroughSection steps={lab.walkthrough} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* No playground: always show text THINK + SEE */}
          <div id="section-think">
            <TldrSection items={lab.tldr} />
          </div>
          <Separator />
          <div id="section-see">
            <WalkthroughSection steps={lab.walkthrough} />
          </div>
        </>
      )}

      <Separator />

      {/* SHIP — anchored sub-sections for TOC */}
      <section className="space-y-8">
        <SectionHeading
          phase="SHIP"
          title="Practice"
          description="Quiz, flashcards, and hands-on commands."
        />

        <div id="section-quiz" className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Quiz
          </h3>
          <QuizBlock items={lab.quiz} onScore={handleQuizScore} />
        </div>

        <div id="section-flashcards" className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Flashcards
          </h3>
          <FlashcardSM2
            cards={lab.flashcards}
            labSlug={lab.slug}
            onAllMastered={() => {
              update({
                opened_at: null,
                completed_at: new Date().toISOString(),
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
