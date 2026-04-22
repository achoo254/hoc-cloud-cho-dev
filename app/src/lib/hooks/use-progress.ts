/**
 * React Query hook for lab progress — GET with 5-min cache, POST with
 * optimistic update + rollback on error.
 *
 * Exported overloads:
 *   useProgress(labSlug)  → { progress, entry, update, isLoading, isUpdating }
 *   useProgress()         → same shape; entry is null (used by StatsSection)
 *
 * Mutation key ['progress', labSlug] dedupes concurrent mutations per lab.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProgress,
  upsertProgress,
  type ProgressEntry,
  type ProgressResponse,
} from '@/lib/api'

/** Patch accepted by update() — BE owns opened_at, so FE only sends the rest. */
export type ProgressPatch = {
  completed_at?: number | null
  quiz_score?: number | null
}

// ── Query key ─────────────────────────────────────────────────────────────────

export const PROGRESS_QUERY_KEY = ['progress'] as const

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseProgressReturn {
  /** Full list of all progress entries for the current user */
  progress: ProgressEntry[]
  /** Single entry matching labSlug (null when no slug or not found) */
  entry: ProgressEntry | null
  isLoading: boolean
  /** Upsert a progress entry; lab_slug is auto-injected when labSlug is given */
  update: (patch: ProgressPatch) => void
  isUpdating: boolean
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgress(labSlug?: string): UseProgressReturn {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<ProgressResponse>({
    queryKey: PROGRESS_QUERY_KEY,
    queryFn: getProgress,
    staleTime: 5 * 60_000, // 5 minutes
  })

  const allProgress = data?.progress ?? []
  const entry = labSlug
    ? (allProgress.find((p) => p.lab_slug === labSlug) ?? null)
    : null

  const mutation = useMutation({
    // Dedupe concurrent mutations for the same lab
    mutationKey: labSlug ? ['progress', labSlug] : ['progress'],

    mutationFn: (patch: ProgressPatch) => {
      if (!labSlug) return Promise.resolve({ ok: true })
      return upsertProgress({
        lab_slug: labSlug,
        completed_at: patch.completed_at,
        quiz_score: patch.quiz_score,
      })
    },

    // Optimistic update — splice new entry into cached list immediately
    onMutate: async (patch) => {
      if (!labSlug) return undefined

      await queryClient.cancelQueries({ queryKey: PROGRESS_QUERY_KEY })
      const previous = queryClient.getQueryData<ProgressResponse>(PROGRESS_QUERY_KEY)

      const nowSec = Math.floor(Date.now() / 1000)

      queryClient.setQueryData<ProgressResponse>(PROGRESS_QUERY_KEY, (old) => {
        if (!old) return old
        const filtered = old.progress.filter((p) => p.lab_slug !== labSlug)
        const existing = old.progress.find((p) => p.lab_slug === labSlug)

        // Mirror BE semantics: opened_at is set once on insert; completed_at
        // uses $min so earliest wins; quiz_score always replaces.
        const updated: ProgressEntry = {
          lab_slug: labSlug,
          opened_at: existing?.opened_at ?? nowSec,
          completed_at:
            patch.completed_at != null
              ? Math.min(existing?.completed_at ?? patch.completed_at, patch.completed_at)
              : existing?.completed_at ?? null,
          quiz_score: patch.quiz_score ?? existing?.quiz_score ?? null,
        }
        return { ...old, progress: [...filtered, updated] }
      })

      return { previous }
    },

    // Roll back to previous state on error
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(PROGRESS_QUERY_KEY, ctx.previous)
      }
    },

    // Always refetch to sync with server truth
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY })
    },
  })

  return {
    progress: allProgress,
    entry,
    isLoading,
    update: (patch) => mutation.mutate(patch),
    isUpdating: mutation.isPending,
  }
}
