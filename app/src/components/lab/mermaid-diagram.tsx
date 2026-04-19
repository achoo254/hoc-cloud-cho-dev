/**
 * Client-side Mermaid diagram renderer — lazy-loads mermaid library.
 * Wraps render in error boundary to prevent cascade failures.
 */

import { Component, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ── Error boundary ────────────────────────────────────────────────────────────

interface ErrorBoundaryState { error: string | null }

class DiagramErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return { error: err instanceof Error ? err.message : String(err) }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Diagram error: {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

// ── Inner renderer ────────────────────────────────────────────────────────────

interface MermaidInnerProps {
  chart: string
  className?: string
}

function MermaidInner({ chart, className }: MermaidInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  const diagramId = `mermaid-${id}`
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        })

        const { svg } = await mermaid.render(diagramId, chart)
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
      }
    }

    render()
    return () => { cancelled = true }
    // diagramId is stable for the lifetime of this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        Diagram parse error: {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-x-auto rounded-lg bg-muted/30 p-4', className)}
      aria-label="Mermaid diagram"
    />
  )
}

// ── Public component ──────────────────────────────────────────────────────────

interface MermaidDiagramProps {
  chart: string
  className?: string
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  return (
    <DiagramErrorBoundary>
      <MermaidInner chart={chart} className={className} />
    </DiagramErrorBoundary>
  )
}
