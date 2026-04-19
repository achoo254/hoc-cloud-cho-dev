/**
 * React Query hook for lab progress — GET with cache, POST with optimistic update.
 * Wraps /api/progress via existing api.ts wrapper.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProgress,
  upsertProgress,
  type ProgressEntry,
  type ProgressResponse,
} from '@/lib/api'

const QUERY_KEY = ['progress'] as const

export interface UseProgressReturn {
  /** Null when loading or not found */
  progress: ProgressEntry | null
  isLoading: boolean
  /** Upsert a progress entry; lab_slug is injected automatically */
  update: (patch: Omit<ProgressEntry, 'lab_slug'>) => void
  isUpdating: boolean
}

/**
 * Hook for a single lab's progress entry.
 * @param labSlug - slug from the lab fixture (e.g. "dns")
 */
export function useProgress(labSlug: string): UseProgressReturn {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<ProgressResponse>({
    queryKey: QUERY_KEY,
    queryFn: getProgress,
    staleTime: 60_000,
  })

  const progress =
    data?.progress.find((p) => p.lab_slug === labSlug) ?? null

  const mutation = useMutation({
    mutationFn: (patch: Omit<ProgressEntry, 'lab_slug'>) =>
      upsertProgress({
        lab_slug: labSlug,
        completed_at: patch.completed_at,
        quiz_score: patch.quiz_score,
        // upsertProgress accepts string | undefined, not null
        opened_at: patch.opened_at ?? undefined,
      }),

    // Optimistic update — splice the new entry into the cached list
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<ProgressResponse>(QUERY_KEY)

      queryClient.setQueryData<ProgressResponse>(QUERY_KEY, (old) => {
        if (!old) return old
        const filtered = old.progress.filter((p) => p.lab_slug !== labSlug)
        const updated: ProgressEntry = {
          lab_slug: labSlug,
          opened_at: patch.opened_at ?? null,
          completed_at: patch.completed_at ?? null,
          quiz_score: patch.quiz_score ?? null,
        }
        return { ...old, progress: [...filtered, updated] }
      })

      return { previous }
    },

    // Roll back on error
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEY, ctx.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  return {
    progress,
    isLoading,
    update: (patch) => mutation.mutate(patch),
    isUpdating: mutation.isPending,
  }
}
