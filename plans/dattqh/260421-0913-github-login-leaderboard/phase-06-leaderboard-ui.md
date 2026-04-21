# Phase 6: Leaderboard UI

**Priority:** P1 | **Status:** completed | **Effort:** 3h

## Context Links
- [Phase 4: API Updates](phase-04-api-updates.md) — leaderboard API
- [Current dashboard-layout.tsx](../../../app/src/components/dashboard/dashboard-layout.tsx)

## Overview

Create leaderboard component showing top learners. Add to homepage dashboard. Display username, avatar, completed count, average score.

## Key Insights

- Leaderboard is public (no auth required to view)
- Show top 50 users with at least 1 completion
- Highlight current user's row if logged in
- Responsive: card on mobile, table on desktop

## Requirements

**Functional:**
- Show rank, avatar, username, completed count, avg score
- Highlight current user's position
- Link to user's GitHub profile (optional)

**Non-functional:**
- Load leaderboard with React Query (5 min stale)
- Skeleton loading state
- Handle empty state (no users yet)

## Related Code Files

**Create:**
- `app/src/components/dashboard/leaderboard-section.tsx`

**Modify:**
- `app/src/lib/api.ts` — add leaderboard endpoint
- `app/src/components/dashboard/dashboard-layout.tsx` — add leaderboard

## Implementation Steps

1. Add API function in `app/src/lib/api.ts`:
   ```ts
   export interface LeaderboardEntry {
     rank: number;
     githubId: number; // [RED TEAM FIX] For unique key
     username: string;
     avatarUrl: string;
     completedCount: number;
     avgScore: number | null; // [RED TEAM FIX] null = no quiz taken
     lastActive: number;
   }

   export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[] }> {
     const res = await fetch('/api/leaderboard');
     if (!res.ok) return { leaderboard: [] };
     return res.json();
   }
   ```

2. Create `app/src/components/dashboard/leaderboard-section.tsx`:
   ```tsx
   import { useQuery } from '@tanstack/react-query';
   import { Trophy, Medal, Award } from 'lucide-react';
   import { getLeaderboard, type LeaderboardEntry } from '@/lib/api';
   import { useAuth } from '@/contexts/auth-context';
   import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   import { Skeleton } from '@/components/ui/skeleton';
   import { cn } from '@/lib/utils';

   function RankBadge({ rank }: { rank: number }) {
     if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
     if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
     if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
     return <span className="text-muted-foreground w-5 text-center">{rank}</span>;
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
           {/* [RED TEAM FIX] Display N/A for null avg_score */}
           <p className="text-muted-foreground">
             {entry.avgScore != null ? `${entry.avgScore}% avg` : 'N/A'}
           </p>
         </div>
       </div>
     );
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
     );
   }

   export function LeaderboardSection() {
     const { user } = useAuth();
     const { data, isLoading } = useQuery({
       queryKey: ['leaderboard'],
       queryFn: getLeaderboard,
       staleTime: 5 * 60 * 1000, // 5 min
     });

     const leaderboard = data?.leaderboard ?? [];

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
               {/* [RED TEAM FIX] Use githubId for key and comparison instead of username */}
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
     );
   }
   ```

3. Update `app/src/components/dashboard/dashboard-layout.tsx`:
   ```tsx
   import { LeaderboardSection } from './leaderboard-section';
   // ...
   // Add after RoadmapSection in the two-column grid:
   <div className="grid gap-8 md:grid-cols-2">
     <DueSection ... />
     <RoadmapSection ... />
   </div>

   {/* Leaderboard — full width */}
   <LeaderboardSection />
   ```

## Todo List

- [x] Add leaderboard types and API to `api.ts`
- [x] Create `leaderboard-section.tsx`
- [x] Update `dashboard-layout.tsx` — add LeaderboardSection
- [x] Test: leaderboard loads and displays
- [x] Test: current user highlighted
- [x] Test: empty state when no completions
- [x] Test: responsive layout

## Success Criteria

- Leaderboard shows top 10 users on homepage
- Current user's row highlighted
- Rank badges for top 3 (trophy, medal, award)
- Skeleton loading state
- Empty state message when no data

## UI Design

```
┌─────────────────────────────────────────┐
│ 🏆 Bảng xếp hạng                        │
├─────────────────────────────────────────┤
│ 🥇 [avatar] username1      12 labs 95%  │
│ 🥈 [avatar] username2       8 labs 88%  │
│ 🥉 [avatar] username3       6 labs 92%  │
│  4 [avatar] username4       5 labs 85%  │ ← highlighted if current user
│  5 [avatar] username5       4 labs 78%  │
│ ...                                     │
└─────────────────────────────────────────┘
```
