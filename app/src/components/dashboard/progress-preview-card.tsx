/**
 * progress-preview-card.tsx — Guest-mode preview of heatmap + streak stats.
 * Replaces the Google login CTA with a demonstrative feature teaser.
 * No auth action inside; login lives in the header.
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, CheckCircle2, Activity, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'

const WEEKS = 14
const DAYS = 7

// Deterministic pseudo-random intensity so the preview is stable across renders.
function buildSampleHeatmap(): number[][] {
  const grid: number[][] = []
  let seed = 1337
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let w = 0; w < WEEKS; w++) {
    const col: number[] = []
    for (let d = 0; d < DAYS; d++) {
      const r = rand()
      const recentBoost = w > WEEKS - 5 ? 0.25 : 0
      const v = r + recentBoost
      // bucket into 0..4
      if (v < 0.4) col.push(0)
      else if (v < 0.6) col.push(1)
      else if (v < 0.78) col.push(2)
      else if (v < 0.92) col.push(3)
      else col.push(4)
    }
    grid.push(col)
  }
  return grid
}

const levelClass = [
  'bg-muted/60',
  'bg-emerald-500/20',
  'bg-emerald-500/40',
  'bg-emerald-500/65',
  'bg-emerald-500/90',
]

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  accent: string
}

function StatTile({ icon, label, value, hint, accent }: StatTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums">{value}</span>
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        </div>
      </div>
    </div>
  )
}

export function ProgressPreviewCard() {
  const reduce = useReducedMotionPreference()
  const grid = useMemo(() => buildSampleHeatmap(), [])

  return (
    <Card className="relative overflow-hidden">
      {/* Soft decorative gradient to signal preview/atmosphere */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/[0.06] to-transparent"
        aria-hidden="true"
      />

      <CardHeader className="relative flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">Theo dõi tiến độ học</CardTitle>
          <CardDescription>
            Heatmap 90 ngày, streak liên tục và thống kê labs đã hoàn thành — mở khóa sau khi đăng nhập.
          </CardDescription>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1 text-[10px] uppercase tracking-wider">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Xem trước
        </Badge>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* Stat tiles — sample data, clearly labeled as preview */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            icon={<Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />}
            label="Streak hiện tại"
            value="7"
            hint="ngày"
            accent="bg-orange-500/10"
          />
          <StatTile
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
            label="Labs hoàn thành"
            value="12"
            hint="/ 47"
            accent="bg-emerald-500/10"
          />
          <StatTile
            icon={<Activity className="h-4 w-4 text-sky-500" aria-hidden="true" />}
            label="Ngày hoạt động"
            value="23"
            hint="/ 90 ngày"
            accent="bg-sky-500/10"
          />
        </div>

        {/* Mini heatmap */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Hoạt động 14 tuần gần nhất</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">Ít</span>
              {levelClass.map((c, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} aria-hidden="true" />
              ))}
              <span className="text-[10px]">Nhiều</span>
            </div>
          </div>

          <div
            className="flex gap-[3px]"
            role="img"
            aria-label="Heatmap minh họa hoạt động học tập trong 14 tuần"
          >
            {grid.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {col.map((lv, di) => (
                  <motion.span
                    key={di}
                    className={`h-3 w-3 rounded-[2px] ${levelClass[lv]}`}
                    initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.25,
                      delay: reduce ? 0 : (wi * DAYS + di) * 0.004,
                      ease: 'easeOut',
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Dữ liệu hiển thị là ảnh minh họa. Đăng nhập bằng nút ở góc trên bên phải để bắt đầu ghi nhận tiến độ của bạn.
        </p>
      </CardContent>
    </Card>
  )
}
