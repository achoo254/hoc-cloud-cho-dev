/**
 * Dev smoke-test route — /dev/playground
 * Loads dns.json fixture, validates via Zod, renders all Phase-02 components.
 * Only intended for development; not linked from production nav.
 */

import { useMemo } from 'react'
import { LabFixtureSchema, type LabContent } from '@/lib/schema-lab'
import { LabRenderer } from '@/components/lab/lab-renderer'
import { QuizBlock } from '@/components/lab/quiz-block'
import { FlashcardSM2 } from '@/components/lab/flashcard-sm2'
import { CodeBlock } from '@/components/lab/code-block'
import { MermaidDiagram } from '@/components/lab/mermaid-diagram'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
// Static import — Vite resolves JSON via rollup json plugin (built-in)
import dnsRaw from '@/fixtures/dns.json'

// ── Parse once at module level — throws at dev startup if schema breaks ───────

function parseDns(): LabContent {
  const result = LabFixtureSchema.safeParse(dnsRaw)
  if (!result.success) {
    console.error('[dev-playground] Zod parse errors:', result.error.flatten())
    throw new Error(`DNS fixture failed Zod validation: ${result.error.message}`)
  }
  return result.data
}

// ── Sample data for isolated component demos ──────────────────────────────────

const SAMPLE_CODE = `# Check which DNS resolver your system uses
cat /etc/resolv.conf

# Query DNS with dig (shows full resolution path)
dig +trace google.com

# Flush DNS cache on Ubuntu
sudo systemd-resolve --flush-caches`

const SAMPLE_MERMAID = `sequenceDiagram
  participant C as Client
  participant R as Recursive Resolver
  participant Root as Root Server
  participant TLD as .com TLD
  participant Auth as Authoritative NS
  C->>R: Who is google.com?
  R->>Root: Who handles .com?
  Root-->>R: TLD nameservers
  R->>TLD: Who handles google.com?
  TLD-->>R: Authoritative NS
  R->>Auth: What is google.com IP?
  Auth-->>R: 142.250.x.x
  R-->>C: 142.250.x.x (cached TTL 300s)`

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevPlaygroundPage() {
  const lab = useMemo(parseDns, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">DEV ONLY</Badge>
            <h1 className="text-xl font-bold">Phase 02 — Component Playground</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Smoke-test for all Phase-02 components using the DNS lab fixture.
          </p>
        </header>

        <Separator />

        {/* ── 1. Isolated CodeBlock ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">CodeBlock (bash)</h2>
          <CodeBlock code={SAMPLE_CODE} lang="bash" />
          <CodeBlock
            code={`{"slug":"dns","module":"01-networking","estimated_minutes":45}`}
            lang="json"
          />
        </section>

        <Separator />

        {/* ── 2. Isolated MermaidDiagram ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">MermaidDiagram</h2>
          <MermaidDiagram chart={SAMPLE_MERMAID} />
          {/* Bad chart — should render error gracefully */}
          <MermaidDiagram chart="this is not valid mermaid @@##" />
        </section>

        <Separator />

        {/* ── 3. Isolated QuizBlock ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">QuizBlock (3 items from DNS)</h2>
          <QuizBlock
            items={lab.quiz.slice(0, 3)}
            onScore={(s) => console.info('[playground] quiz score:', s)}
          />
        </section>

        <Separator />

        {/* ── 4. Isolated FlashcardSM2 ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">FlashcardSM2 (first 3 cards)</h2>
          <FlashcardSM2
            cards={lab.flashcards.slice(0, 3)}
            labSlug="dns-playground"
          />
        </section>

        <Separator />

        {/* ── 5. Full LabRenderer ── */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">LabRenderer (full DNS lab)</h2>
          <div className="border border-dashed border-border rounded-xl overflow-hidden">
            <LabRenderer lab={lab} />
          </div>
        </section>
      </div>
    </div>
  )
}
