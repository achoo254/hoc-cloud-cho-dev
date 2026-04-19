/**
 * Flashcard deck with SM-2 spaced repetition.
 * Flip animation via Framer Motion rotateY.
 * Per-card state persisted in localStorage keyed by `srs:{labSlug}:{idx}`.
 */

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotionPreference } from '@/lib/hooks/use-reduced-motion-preference'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { sm2, type SM2Card, type SM2Quality, type SM2Result } from '@/lib/sm2'
import type { Flashcard } from '@/lib/schema-lab'

interface FlashcardSM2Props {
  cards: Flashcard[]
  labSlug: string
  className?: string
  /** Fired once when every card has been reviewed with Good/Easy (ef >= 2.5, reps >= 1) */
  onAllMastered?: () => void
}

type StoredCard = SM2Result

function storageKey(labSlug: string, idx: number) {
  return `srs:${labSlug}:${idx}`
}

function loadCard(labSlug: string, idx: number): SM2Card {
  try {
    const raw = localStorage.getItem(storageKey(labSlug, idx))
    if (!raw) return {}
    return JSON.parse(raw) as SM2Card
  } catch {
    return {}
  }
}

function saveCard(labSlug: string, idx: number, result: StoredCard) {
  try {
    localStorage.setItem(storageKey(labSlug, idx), JSON.stringify(result))
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

const QUALITY_BUTTONS: { label: string; quality: SM2Quality; variant: string }[] = [
  { label: 'Again', quality: 1, variant: 'border-red-500/60 hover:bg-red-500/10 text-red-500' },
  { label: 'Hard',  quality: 2, variant: 'border-orange-500/60 hover:bg-orange-500/10 text-orange-500' },
  { label: 'Good',  quality: 3, variant: 'border-blue-500/60 hover:bg-blue-500/10 text-blue-500' },
  { label: 'Easy',  quality: 4, variant: 'border-green-500/60 hover:bg-green-500/10 text-green-500' },
]

/** A card is "mastered" when it has been reviewed with Good or Easy at least once */
function isCardMastered(labSlug: string, idx: number): boolean {
  const stored = loadCard(labSlug, idx) as SM2Result | SM2Card
  const reps = 'reps' in stored ? (stored.reps ?? 0) : 0
  const ef = 'ef' in stored ? (stored.ef ?? 0) : 0
  return reps >= 1 && ef >= 2.5
}

export function FlashcardSM2({ cards, labSlug, className, onAllMastered }: FlashcardSM2Props) {
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  // Tracks how many reviews done this session (for display only)
  const [reviewed, setReviewed] = useState(0)
  // Guard: only fire onAllMastered once
  const masteredFiredRef = useRef(false)

  const card = cards[current]
  const reduce = useReducedMotionPreference()

  function handleFlip() {
    setFlipped((f) => !f)
  }

  function handleRate(quality: SM2Quality) {
    const stored = loadCard(labSlug, current)
    const result = sm2(stored, quality)
    saveCard(labSlug, current, result)
    setReviewed((r) => r + 1)

    // Check all-mastered after saving this card
    if (!masteredFiredRef.current && onAllMastered) {
      const allMastered = cards.every((_, idx) =>
        idx === current
          ? result.reps >= 1 && result.ef >= 2.5   // use result for current card
          : isCardMastered(labSlug, idx),
      )
      if (allMastered) {
        masteredFiredRef.current = true
        onAllMastered()
      }
    }

    // Advance to next card (wrap around)
    setCurrent((c) => (c + 1) % cards.length)
    setFlipped(false)
  }

  const storedState = loadCard(labSlug, current)
  const daysUntil =
    'due' in storedState && typeof (storedState as StoredCard).due === 'number'
      ? Math.round(((storedState as StoredCard).due - Date.now()) / 86_400_000)
      : null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Card {current + 1} / {cards.length}</span>
        <span>{reviewed} reviewed this session</span>
      </div>

      {/* Flip card */}
      <div
        className="relative h-48 cursor-pointer select-none"
        style={{ perspective: 1000 }}
        onClick={handleFlip}
        role="button"
        aria-label={flipped ? 'Show front' : 'Flip to reveal answer'}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFlip() }}
      >
        <motion.div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={reduce ? {} : { rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.35, ease: 'easeInOut' }}
        >
          {/* Front face — hidden when reduced-motion + flipped (no 3D transform available) */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl border border-border bg-card p-5',
              'flex flex-col items-center justify-center text-center',
              reduce && flipped ? 'invisible' : '',
            )}
            style={reduce ? undefined : { backfaceVisibility: 'hidden' }}
          >
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Front</p>
            <p className="font-medium text-base leading-relaxed">{card.front}</p>
            <p className="mt-3 text-xs text-muted-foreground">Click to flip</p>
          </div>

          {/* Back face — rotated 180deg so it shows when parent is flipped.
              In reduced-motion mode: shown via visibility toggle instead of 3D. */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl border border-primary/40 bg-primary/5 p-5',
              'flex flex-col items-center justify-center text-center',
              reduce && !flipped ? 'invisible' : '',
            )}
            style={reduce ? undefined : { backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Answer</p>
            <p className="font-medium text-base leading-relaxed">{card.back}</p>
            {card.why && (
              <p className="mt-2 text-xs text-muted-foreground italic">{card.why}</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Due date chip */}
      {daysUntil !== null && (
        <p className="text-xs text-center text-muted-foreground">
          Next review: {daysUntil <= 0 ? 'now' : `in ${daysUntil}d`}
        </p>
      )}

      {/* Rating buttons — only show after flip */}
      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex gap-2 justify-center flex-wrap"
        >
          {QUALITY_BUTTONS.map(({ label, quality, variant }) => (
            <button
              key={quality}
              onClick={(e) => { e.stopPropagation(); handleRate(quality) }}
              className={cn(
                'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                variant,
              )}
            >
              {label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Navigation hint when not flipped */}
      {!flipped && cards.length > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCurrent((c) => (c - 1 + cards.length) % cards.length); setFlipped(false) }}
          >
            ← Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setCurrent((c) => (c + 1) % cards.length); setFlipped(false) }}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
