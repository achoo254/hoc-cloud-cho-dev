import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { searchLabs, type SearchResult } from '@/lib/api'
import { Search } from 'lucide-react'

/** Search page — queries /api/search via React Query */
export default function SearchPage() {
  const [query, setQuery] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', query],
    queryFn: () => searchLabs(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Search Labs</h1>
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search labs... (min 2 chars)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3 max-w-lg">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <p className="text-destructive text-sm">Failed to fetch search results. Is the server running?</p>
      )}

      {/* Results */}
      {data && data.length === 0 && (
        <p className="text-muted-foreground text-sm">No results for &quot;{query}&quot;.</p>
      )}
      {data && data.length > 0 && (
        <div className="space-y-3 max-w-lg">
          {data.map((result: SearchResult) => (
            <Link
              key={result.slug}
              to={`/lab/${result.slug}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">{result.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {result.preview && (
                  <CardDescription
                    className="[&_mark]:bg-primary/20 [&_mark]:text-foreground [&_mark]:rounded [&_mark]:px-0.5"
                    // preview is server-produced HTML with <mark> highlights (trusted).
                    dangerouslySetInnerHTML={{ __html: result.preview }}
                  />
                )}
              </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Empty query hint */}
      {query.length < 2 && !isLoading && (
        <p className="text-muted-foreground text-sm">Type at least 2 characters to search.</p>
      )}
    </div>
  )
}
