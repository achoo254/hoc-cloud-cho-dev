/**
 * spaced-repetition-preview-card.tsx — Guest-mode preview of review scheduler.
 * Shows a mock review queue with SM-2 style intervals. No CTA inside.
 */

import { motion } from 'framer-motion'
import { Brain, Clock3, RotateCcw, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'

interface ReviewItem {
  topic: string
  module: string
  due: string
  interval: string
  ease: 'Mới' | 'Ôn lại' | 'Thuần thục'
}

const SAMPLE_QUEUE: ReviewItem[] = [
  { topic: 'Subnet & CIDR', module: 'Networking', due: 'Hôm nay', interval: '1 ngày', ease: 'Ôn lại' },
  { topic: 'TCP/IP Packet Journey', module: 'Networking', due: 'Ngày mai', interval: '3 ngày', ease: 'Mới' },
  { topic: 'DNS Resolution Flow', module: 'Networking', due: '3 ngày nữa', interval: '7 ngày', ease: 'Thuần thục' },
  { topic: 'HTTP Request Lifecycle', module: 'Networking', due: '1 tuần nữa', interval: '14 ngày', ease: 'Thuần thục' },
]

const easeStyles: Record<ReviewItem['ease'], string> = {
  'Mới': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  'Ôn lại': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Thuần thục': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
}

export function SpacedRepetitionPreviewCard() {
  const reduce = useReducedMotionPreference()

  return (
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-violet-500/[0.06] to-transparent"
        aria-hidden="true"
      />

      <CardHeader className="relative flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
            <Brain className="h-4 w-4 text-violet-500" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-lg">Ôn tập thông minh</CardTitle>
            <CardDescription>
              Lên lịch ôn bài theo spaced repetition (SM-2): nhắc đúng lúc sắp quên để ghi nhớ lâu dài.
            </CardDescription>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1 text-[10px] uppercase tracking-wider">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Xem trước
        </Badge>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Lịch ôn tập tuần này
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Khoảng cách tăng dần
          </span>
        </div>

        <ul className="space-y-2" aria-label="Lịch ôn tập minh họa">
          {SAMPLE_QUEUE.map((item, i) => (
            <motion.li
              key={item.topic}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.06, ease: 'easeOut' }}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.topic}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {item.module} · cách {item.interval}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs font-medium tabular-nums">{item.due}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${easeStyles[item.ease]}`}
                >
                  {item.ease}
                </span>
              </div>
            </motion.li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground">
          Ảnh minh họa quy trình ôn tập. Đăng nhập để nhận lịch ôn bài được cá nhân hóa theo lab đã học.
        </p>
      </CardContent>
    </Card>
  )
}
