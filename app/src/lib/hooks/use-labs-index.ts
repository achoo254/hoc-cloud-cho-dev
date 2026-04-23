/**
 * React Query hook for the lab catalog (GET /api/labs).
 * Long staleTime because the index changes only on fixture sync.
 */

import { useQuery } from '@tanstack/react-query'
import { getLabsIndex, type LabIndexEntry } from '@/lib/api'

export const LABS_INDEX_QUERY_KEY = ['labs', 'index'] as const

export function useLabsIndex() {
  return useQuery<LabIndexEntry[]>({
    queryKey: LABS_INDEX_QUERY_KEY,
    queryFn: getLabsIndex,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  })
}
