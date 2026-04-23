/**
 * Typed fetch wrapper for Hono backend API.
 * All requests go through Vite proxy → http://localhost:3000
 */

import type { SearchResponse } from '@/lib/schema-search'
import type { LabContent } from '@/lib/schema-lab'

export interface LabIndexEntry {
  slug: string
  title: string
  module: string
  estimated_minutes: number
  updated_at: number
  tags: string[]
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ── Auth types ──────────────────────────────────────────────────────────────

export interface User {
  firebaseUid: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
}

export async function getMe(): Promise<{ user: User | null }> {
  const res = await fetch('/api/me')
  if (!res.ok) return { user: null }
  return res.json()
}

export async function logout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST' })
}

// ── Leaderboard types ───────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  odid: string
  displayName: string | null
  photoUrl: string | null
  completedCount: number
  avgScore: number | null
  lastActive: number
}

export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const res = await fetch('/api/leaderboard')
  if (!res.ok) return { leaderboard: [] }
  return res.json()
}

// ── Lab types (mirrors server schema v3) ────────────────────────────────────

export interface Lab {
  slug: string
  title: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  description?: string
}

export interface ProgressEntry {
  lab_slug: string
  /** Unix seconds — first time the lab was opened (set once on insert) */
  opened_at: number | null
  /** Unix seconds — latest mount of the lab (bumped on every /touch) */
  last_opened_at?: number | null
  /** Unix seconds — earliest completion mark (quiz-full or flashcards-mastered) */
  completed_at: number | null
  quiz_score: number | null
  /** Unix seconds — mongoose auto-updated timestamp of latest write */
  last_updated?: number | null
}

export interface ProgressResponse {
  progress: ProgressEntry[]
}

/**
 * Upsert payload — BE controls `opened_at` via $setOnInsert, so FE never sends it.
 * `completed_at` is Unix seconds; BE applies $min so earliest wins.
 */
export interface ProgressUpsertPayload {
  lab_slug: string
  completed_at?: number | null
  quiz_score?: number | null
}

// Re-export server search result type so callers get the real BE shape
// (preview / rank / file_path), not a stale local guess.
export type { SearchResult } from '@/lib/schema-search'

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /api/progress */
export const getProgress = () => request<ProgressResponse>('/api/progress')

/** POST /api/progress — upsert one entry */
export const upsertProgress = (entry: ProgressUpsertPayload) =>
  request<{ ok: boolean }>('/api/progress', {
    method: 'POST',
    body: JSON.stringify(entry),
  })

/** POST /api/progress/touch — bump lastOpenedAt + $setOnInsert openedAt */
export const touchProgress = (labSlug: string) =>
  request<{ ok: boolean }>('/api/progress/touch', {
    method: 'POST',
    body: JSON.stringify({ lab_slug: labSlug }),
  })

/** GET /api/search?q=<query> — unwraps `{results: [...]}` to a bare array. */
export const searchLabs = async (q: string) => {
  const res = await request<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
  return res.results
}

/** GET /api/labs — returns lightweight catalog from MongoDB */
export const getLabsIndex = async (): Promise<LabIndexEntry[]> => {
  const res = await request<{ labs: LabIndexEntry[] }>('/api/labs')
  return res.labs
}

/** GET /api/labs/:slug — returns full lab content, or null on 404 */
export const getLabContent = async (slug: string): Promise<LabContent | null> => {
  const res = await fetch(`/api/labs/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => res.statusText))
  const { lab } = (await res.json()) as { lab: LabContent }
  return lab
}

/** POST /api/progress/migrate — merge guest bucket into the authed user */
export interface MigrateProgressResponse {
  ok: boolean
  imported?: number
  batchId: string
  status: 'completed' | 'already_applied' | 'in_progress'
}

export const migrateProgress = (batchId: string) =>
  request<MigrateProgressResponse>('/api/progress/migrate', {
    method: 'POST',
    body: JSON.stringify({ batchId }),
  })

/** GET /healthz */
export const getHealth = () =>
  request<{ status: string; db: string }>('/healthz')
