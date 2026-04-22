/**
 * Shared QueryClient singleton.
 *
 * Exists outside the React tree so react-router loaders can pre-fetch data
 * via `queryClient.ensureQueryData` in parallel with the route chunk.
 * The Provider in `main.tsx` consumes the same instance.
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})
