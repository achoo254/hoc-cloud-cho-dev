/**
 * SM-2 spaced repetition algorithm — pure function, no side effects.
 * Ported from labs/_shared/lab-template.js lines 28–43.
 *
 * Quality mapping (matches UI labels):
 *   1 = Again  (quality 0 internally — reset)
 *   2 = Hard   (quality 1)
 *   3 = Good   (quality 2)
 *   4 = Easy   (quality 3)
 */

export type SM2Quality = 1 | 2 | 3 | 4

export interface SM2Card {
  /** Easiness factor, default 2.5 */
  ef?: number
  /** Current interval in days, default 0 */
  interval?: number
  /** Number of successful reps, default 0 */
  reps?: number
}

export interface SM2Result {
  ef: number
  interval: number
  reps: number
  /** Unix ms timestamp of next review */
  due: number
  /** Unix ms timestamp when rated */
  lastReviewed: number
}

/**
 * Compute next SM-2 state given the current card state and user quality rating.
 * Returns a new object — does not mutate input.
 *
 * Internal quality mapping from UI label → SM-2 q value:
 *   Again=1 → 0, Hard=2 → 3, Good=3 → 4, Easy=4 → 5
 */
export function sm2(card: SM2Card, quality: SM2Quality): SM2Result {
  const now = Date.now()
  let { ef = 2.5, interval = 0, reps = 0 } = card

  // Map UI quality (1–4) to SM-2 internal q (0, 3, 4, 5)
  const qMap: Record<SM2Quality, number> = { 1: 0, 2: 3, 3: 4, 4: 5 }
  const internalQ = qMap[quality]

  if (quality === 1) {
    // Again → full reset
    reps = 0
    interval = 0
  } else {
    reps += 1
    // Interval schedule per rep count
    if (reps === 1) {
      interval = quality === 2 ? 1 : quality === 3 ? 1 : 3
    } else if (reps === 2) {
      interval = quality === 2 ? 3 : quality === 3 ? 6 : 10
    } else {
      interval = Math.round(interval * ef)
    }
    // Update easiness factor (SM-2 formula)
    ef = Math.max(
      1.3,
      ef + (0.1 - (5 - internalQ) * (0.08 + (5 - internalQ) * 0.02)),
    )
  }

  const due = now + interval * 86_400_000
  return { ef, interval, reps, due, lastReviewed: now }
}
