/**
 * exercises.tsx — Route /exercises. Catalog mục Bài Tập (public).
 */

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { ExerciseCatalogGrid } from '@/components/exercise/exercise-catalog-grid'
import { getExercisesIndex } from '@/lib/api'

export default function ExercisesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercisesIndex,
    retry: false,
  })

  // Lỗi (5xx, mạng) — báo rõ thay vì hiện catalog rỗng gây hiểu nhầm "hết bài".
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
