/**
 * lab-viewer.tsx
 *
 * Route: /lab/:slug
 * Loads a single lab dynamically via content-loader.getLab() and
 * renders it with <LabRenderer>. Shows a skeleton while loading
 * and a 404 card if the slug is not found.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LabRenderer } from '@/components/lab/lab-renderer'
import { getLab } from '@/lib/content-loader'
import type { LabContent } from '@/lib/schema-lab'

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LabSkeleton() {
  return (
    <div className="container py-8 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded mb-6" />
      <div className="space-y-4">
        <div className="h-6 w-64 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-5/6 bg-muted rounded" />
        <div className="h-4 w-4/6 bg-muted rounded" />
      </div>
    </div>
  )
}

// ── 404 card ──────────────────────────────────────────────────────────────────

function LabNotFound({ slug }: { slug: string }) {
  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Labs
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">404</Badge>
            <Badge variant="outline">Lab not found</Badge>
          </div>
          <CardTitle className="mt-2">Lab not found: {slug}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No lab exists with slug{' '}
            <code className="font-mono text-sm bg-muted px-1 rounded">{slug}</code>.
            Check the URL or go back to the labs index.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; lab: LabContent }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export default function LabViewerPage() {
  const { slug } = useParams<{ slug: string }>()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!slug) {
      setState({ status: 'not-found' })
      return
    }

    // Reset to loading on slug change (navigation between labs)
    setState({ status: 'loading' })

    let cancelled = false

    getLab(slug)
      .then((lab) => {
        if (cancelled) return
        if (lab === null) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'found', lab })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[lab-viewer] Failed to load lab "${slug}":`, err)
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  if (state.status === 'loading') {
    return <LabSkeleton />
  }

  if (state.status === 'not-found') {
    return <LabNotFound slug={slug ?? ''} />
  }

  if (state.status === 'error') {
    return (
      <div className="container py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Labs
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <Badge variant="destructive">Error</Badge>
            <CardTitle className="mt-2">Failed to load lab</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground font-mono text-sm">{state.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Labs
        </Link>
      </Button>
      <LabRenderer lab={state.lab} />
    </div>
  )
}
