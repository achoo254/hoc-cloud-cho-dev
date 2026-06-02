/**
 * exercise-viewer.tsx — Route /exercise/:slug. Render 1 bài tập (owner-gated).
 * 403/401 → forbidden; 404 → not-found.
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExerciseRenderer } from '@/components/exercise/exercise-renderer'
import { getExerciseContent, ApiError, type ExerciseContent } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

type LoadState =
  | { status: 'loading' }
  | { status: 'found'; exercise: ExerciseContent }
  | { status: 'not-found' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }

function BackBar() {
  return (
    <Button variant="ghost" size="sm" asChild className="mb-6">
      <Link to="/exercises">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Về Bài Tập
      </Link>
    </Button>
  )
}

export default function ExerciseViewerPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isOwner, isLoading: authLoading } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (authLoading) return
    if (!isOwner) {
      setState({ status: 'forbidden' })
      return
    }
    if (!slug) {
      setState({ status: 'not-found' })
      return
    }
    setState({ status: 'loading' })
    let cancelled = false
    getExerciseContent(slug)
      .then((exercise) => {
        if (cancelled) return
        setState(exercise === null ? { status: 'not-found' } : { status: 'found', exercise })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setState({ status: 'forbidden' })
          return
        }
        setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [slug, isOwner, authLoading])

  if (state.status === 'loading' || authLoading) {
    return (
      <div className="container py-8 animate-pulse">
        <div className="mb-6 h-8 w-32 rounded bg-muted" />
        <div className="space-y-4">
          <div className="h-6 w-64 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (state.status === 'forbidden') {
    return (
      <div className="container py-8">
        <BackBar />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" aria-hidden="true" /> Mục riêng tư
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bài tập chỉ dành cho owner.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.status === 'not-found') {
    return (
      <div className="container py-8">
        <BackBar />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">404</Badge>
              <Badge variant="outline">Không tìm thấy</Badge>
            </div>
            <CardTitle className="mt-2">Không có bài tập: {slug}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="container py-8">
        <BackBar />
        <Card>
          <CardHeader>
            <Badge variant="destructive">Error</Badge>
            <CardTitle className="mt-2">Lỗi tải bài tập</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-muted-foreground">{state.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <BackBar />
      <ExerciseRenderer exercise={state.exercise} />
    </div>
  )
}
