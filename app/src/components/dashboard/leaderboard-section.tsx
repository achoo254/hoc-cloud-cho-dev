import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Award } from 'lucide-react'
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
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
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors',
        isCurrentUser && 'bg-primary/10 border border-primary/20'
      )}
    >
      <RankBadge rank={entry.rank} />
      <Avatar className="h-8 w-8">
        <AvatarImage src={entry.avatarUrl} alt={entry.username} />
        <AvatarFallback>{entry.username[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.username}</p>
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
  const { user } = useAuth()
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
          <p className="text-muted-foreground text-sm py-4 text-center">
            Chưa có ai hoàn thành lab nào. Hãy là người đầu tiên!
          </p>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={entry.githubId}
                entry={entry}
                isCurrentUser={user?.githubId === entry.githubId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
