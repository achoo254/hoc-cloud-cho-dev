/**
 * CompletionBanner — sticky-bottom celebration shown when completed_at
 * transitions null → value within the same session (not on reload of an
 * already-completed lab).
 *
 * Non-blocking by design: sticky at viewport bottom, dismiss button,
 * auto-hides after 8s.
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useProgress } from '@/lib/hooks/use-progress'

interface CompletionBannerProps {
  labSlug: string
  labTitle: string
  className?: string
}

const AUTO_HIDE_MS = 8000

export function CompletionBanner({ labSlug, labTitle, className }: CompletionBannerProps) {
  const { entry, isLoading } = useProgress(labSlug)
  const prevCompletedRef = useRef<number | null | undefined>(undefined)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Defer baseline until query settles — otherwise a slow cold-cache load
    // records `null` before the real completed_at arrives, and the ensuing
    // null → value transition fires the banner for an already-completed lab.
    if (isLoading) return

    const curr = entry?.completed_at ?? null

    // First post-load settle — record baseline without firing banner (prevents reload replay).
    if (prevCompletedRef.current === undefined) {
      prevCompletedRef.current = curr
      return
    }

    // Transition null → value fires the celebration exactly once.
    if (prevCompletedRef.current == null && curr != null) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), AUTO_HIDE_MS)
      prevCompletedRef.current = curr
      return () => clearTimeout(t)
    }

    prevCompletedRef.current = curr
  }, [entry?.completed_at, isLoading])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)]',
        'rounded-xl border border-border bg-card shadow-lg px-4 py-3',
        'flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in-0 duration-300',
        className,
      )}
    >
      <span className="text-xl" aria-hidden="true">🎉</span>
      <p className="text-sm flex-1 min-w-0">
        Đã hoàn thành lab <strong className="font-semibold">{labTitle}</strong> — tiếp tục lab kế tiếp nhé.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="flex-none text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
        aria-label="Đóng thông báo"
      >
        Đóng
      </button>
    </div>
  )
}
