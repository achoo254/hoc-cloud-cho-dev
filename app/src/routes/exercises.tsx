/**
 * exercises.tsx — Route /exercises. Catalog mục Bài Tập (owner-gated).
 * Không phải owner (API 401/403 hoặc isOwner=false) → forbidden state.
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ExerciseCatalogGrid } from '@/components/exercise/exercise-catalog-grid'
import { getExercisesIndex, ApiError } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

function Forbidden() {
  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Về Labs
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" aria-hidden="true" /> Mục riêng tư
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Mục Bài Tập chỉ dành cho owner. Đăng nhập bằng tài khoản owner để xem.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ExercisesPage() {
  const { isOwner, isLoading: authLoading } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercisesIndex,
    enabled: isOwner, // không fetch nếu FE đã biết không phải owner
    retry: false,
  })

  if (authLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!isOwner || (error instanceof ApiError && (error.status === 401 || error.status === 403))) {
    return <Forbidden />
  }

  // Lỗi khác (5xx, mạng) — báo rõ thay vì hiện catalog rỗng gây hiểu nhầm "hết bài".
  if (error) {
    return (
      <div className="container py-8">
        <h1 className="mb-4 text-xl font-semibold tracking-tight">Bài Tập</h1>
        <p className="text-destructive">
          Lỗi tải danh sách bài tập. Thử tải lại trang.
        </p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Bài Tập</h1>
        <span className="text-sm text-muted-foreground">
          {data?.length ?? 0} bài
        </span>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <ExerciseCatalogGrid exercises={data ?? []} />
      )}
    </div>
  )
}
