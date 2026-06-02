/**
 * exercise-catalog-grid.tsx — grid Card cho mục Bài Tập (owner-gated).
 * Mirror nhẹ lab-catalog-grid, bỏ progress/status badge.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Tag, ArrowRight } from 'lucide-react'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ExerciseIndexEntry } from '@/lib/api'

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

export function ExerciseCatalogGrid({ exercises }: { exercises: ExerciseIndexEntry[] }) {
  const reduce = useReducedMotionPreference()

  if (exercises.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa có bài tập nào. Tạo bài tập mới qua seed script.
      </p>
    )
  }

  return (
    <motion.div
      variants={gridVariants}
      initial={reduce ? false : 'hidden'}
      animate="visible"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      {exercises.map((ex) => (
        <motion.div
          key={ex.slug}
          variants={cardVariants}
          whileHover={reduce ? {} : { y: -4, scale: 1.015, transition: { duration: 0.18 } }}
          whileTap={reduce ? {} : { scale: 0.98 }}
        >
          <Link
            to={`/exercise/${ex.slug}`}
            className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Mở bài tập: ${ex.title}`}
          >
            <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="line-clamp-2 text-sm font-semibold leading-snug">
                  {ex.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {ex.estimated_minutes != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {ex.estimated_minutes}m
                    </span>
                  )}
                  {ex.topic && (
                    <span className="flex items-center gap-1 capitalize">
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {ex.topic}
                    </span>
                  )}
                </div>
                {ex.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ex.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="h-4 px-1.5 text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <span>Xem bài tập</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
