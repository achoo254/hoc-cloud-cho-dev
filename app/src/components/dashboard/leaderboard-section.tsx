import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Award, Sparkles, UserRound } from 'lucide-react'
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return <span className="text-muted-foreground w-5 text-center">{rank}</span>
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const name = entry.displayName ?? 'Anonymous'
  const initial = name[0]?.toUpperCase() ?? '?'
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors',
        isCurrentUser && 'bg-primary/10 border border-primary/20'
      )}
    >
      <RankBadge rank={entry.rank} />
      <Avatar className="h-8 w-8">
        <AvatarImage src={entry.photoUrl ?? undefined} alt={name} />
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
      </div>
      <div className="text-right text-sm">
        <p className="font-semibold">{entry.completedCount} labs</p>
        <p className="text-muted-foreground">
          {entry.avgScore != null ? `${entry.avgScore}% avg` : 'N/A'}
        </p>
      </div>
    </div>
  )
}

// Podium empty-state — gold/silver/bronze ghost slots.
const PODIUM_SLOTS = [
  { rank: 2, height: 'h-16', icon: Medal,  color: 'text-gray-400',   ring: 'ring-gray-400/30',   bg: 'bg-gray-400/5' },
  { rank: 1, height: 'h-24', icon: Trophy, color: 'text-yellow-500', ring: 'ring-yellow-500/40', bg: 'bg-yellow-500/5' },
  { rank: 3, height: 'h-12', icon: Award,  color: 'text-amber-600',  ring: 'ring-amber-600/30',  bg: 'bg-amber-600/5' },
] as const

function LeaderboardEmptyState() {
  return (
    <div className="py-4">
      {/* Podium */}
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {PODIUM_SLOTS.map(({ rank, height, icon: Icon, color, ring, bg }) => (
          <div key={rank} className="flex w-20 flex-col items-center sm:w-24">
            <div className={cn('mb-2 flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background', ring, bg)}>
              <UserRound className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
            </div>
            <div
              className={cn(
                'flex w-full flex-col items-center justify-start rounded-t-md border border-b-0 border-dashed border-border/80 bg-muted/20 pt-2',
                height,
              )}
            >
              <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />
              <span className="mt-1 text-[11px] font-semibold tabular-nums text-muted-foreground">#{rank}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Divider line under podium */}
      <div className="border-t border-border/60" />

      {/* Message */}
      <div className="mt-4 flex flex-col items-center gap-2 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-yellow-500" aria-hidden="true" />
          Bảng xếp hạng đang chờ người mở hàng
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Hoàn thành lab đầu tiên để chiếm ngôi vị <span className="font-medium text-foreground">#1</span> và ghi tên mình lên đỉnh podium.
        </p>
      </div>
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function LeaderboardSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
    staleTime: 5 * 60 * 1000,
  })

  const leaderboard = data?.leaderboard ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Bảng xếp hạng
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : leaderboard.length === 0 ? (
          <LeaderboardEmptyState />
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={entry.odid}
                entry={entry}
                isCurrentUser={false}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
