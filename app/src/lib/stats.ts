/**
 * stats.ts — Pure stat helpers ported from labs/_shared/index-stats.js.
 * All functions are side-effect free and operate only on data passed in.
 * localStorage reads are isolated to buildHeatmapFromStorage() — called
 * explicitly so callers can substitute test data.
 */

import type { ProgressEntry } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeatmapDay {
  date: string  // YYYY-MM-DD
  count: number
}

/** Raw SRS card state stored under localStorage key `srs:<lab_slug>` */
interface SrsCard {
  interval?: number
  lastReviewed?: number
  ts?: number
  last?: number
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

/**
 * Build heatmap for the last `days` calendar days.
 * progressEntries: server-side ProgressEntry[] (opened_at / completed_at dates).
 * Supplements with localStorage SRS review timestamps.
 */
export function computeHeatmap(
  progressEntries: ProgressEntry[],
  days = 90,
): HeatmapDay[] {
  const countMap = new Map<string, number>()

  // 1. Count server-side activity (opened_at + completed_at per day)
  for (const p of progressEntries) {
    for (const ts of [p.opened_at, p.completed_at]) {
      if (!ts) continue
      const d = ts.slice(0, 10) // YYYY-MM-DD
      countMap.set(d, (countMap.get(d) ?? 0) + 1)
    }
  }

  // 2. Supplement with localStorage SRS review timestamps
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith('srs:')) continue
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const e: SrsCard | SrsCard[] | null = JSON.parse(raw) as SrsCard | SrsCard[] | null
      if (!e) continue

      const entries = Array.isArray(e) ? e : [e]
      for (const card of entries) {
        const ts = card.lastReviewed ?? card.ts ?? card.last
        if (!ts) continue
        const d = new Date(ts).toISOString().slice(0, 10)
        countMap.set(d, (countMap.get(d) ?? 0) + 1)
      }
    }
  } catch {
    // localStorage unavailable (SSR, private browsing, quota) — degrade silently
  }

  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: countMap.get(key) ?? 0 }
  })
}

/**
 * Bucket a review count into a heat level 0–4.
 * Mirrors bucketLevel() from index-sections-stats.js.
 */
export function bucketHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (!count) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 9) return 3
  return 4
}

// ── Streak ────────────────────────────────────────────────────────────────────

/**
 * Return the current consecutive-day streak.
 * Counts backwards from today.  A day counts if any progress entry was
 * opened/completed OR any SRS card was reviewed on that day.
 */
export function computeStreak(progressEntries: ProgressEntry[]): number {
  const heatmap = computeHeatmap(progressEntries, 365) // look back up to 1 year
  let streak = 0
  // Walk backwards from today (last element) and count consecutive active days
  for (let i = heatmap.length - 1; i >= 0; i--) {
    if (heatmap[i].count > 0) {
      streak++
    } else {
      // Allow today to have 0 yet still maintain streak (early in the day)
      if (i === heatmap.length - 1) continue
      break
    }
  }
  return streak
}

// ── Completed count ───────────────────────────────────────────────────────────

const QUIZ_PASS_THRESHOLD = 0.8

/**
 * Count labs where quiz_score >= threshold (default 0.8 = 80%).
 */
export function computeCompleted(
  progressEntries: ProgressEntry[],
  threshold = QUIZ_PASS_THRESHOLD,
): number {
  return progressEntries.filter(
    (p) => p.quiz_score !== null && p.quiz_score >= threshold,
  ).length
}

// ── SM-2 due items ────────────────────────────────────────────────────────────

export interface DueItem {
  labSlug: string
  /** Number of cards due today */
  dueCount: number
  /** Number of brand-new unseen cards */
  newCount: number
}

/**
 * Return labs that have SM-2 cards due today.
 * srsData: record of { labSlug → array of card states } read from localStorage.
 * Falls back to scanning localStorage directly when srsData is not supplied.
 */
export function getDueItems(
  _progressEntries: ProgressEntry[],
  srsData?: Record<string, SrsCard[]>,
): DueItem[] {
  const now = Date.now()
  const result: DueItem[] = []

  const dataMap: Record<string, SrsCard[]> = srsData ?? readSrsFromStorage()

  for (const [key, cards] of Object.entries(dataMap)) {
    let dueCount = 0
    let newCount = 0

    for (const card of cards) {
      if (!card.interval || card.interval === 0) {
        newCount++
      } else {
        // A card is due when now >= lastReviewed + interval days
        const lastMs = card.lastReviewed ?? card.ts ?? card.last ?? 0
        const dueMs = lastMs + (card.interval ?? 0) * 86_400_000
        if (now >= dueMs) dueCount++
      }
    }

    if (dueCount > 0 || newCount > 0) {
      result.push({ labSlug: key.replace(/^srs:/, ''), dueCount, newCount })
    }
  }

  return result.sort((a, b) => b.dueCount - a.dueCount)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function readSrsFromStorage(): Record<string, SrsCard[]> {
  const out: Record<string, SrsCard[]> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith('srs:')) continue
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const parsed: SrsCard | SrsCard[] | null = JSON.parse(raw) as SrsCard | SrsCard[] | null
      if (!parsed) continue
      out[k] = Array.isArray(parsed) ? parsed : [parsed]
    }
  } catch { /* ignore */ }
  return out
}
