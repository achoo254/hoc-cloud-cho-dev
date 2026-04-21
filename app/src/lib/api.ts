/**
 * Typed fetch wrapper for Hono backend API.
 * All requests go through Vite proxy → http://localhost:3000
 */

import type { SearchResponse } from '@/lib/schema-search'

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
  githubId: number
  username: string
  avatarUrl: string
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
  githubId: number
  username: string
  avatarUrl: string
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
  opened_at: string | null
  completed_at: string | null
  quiz_score: number | null
}

export interface ProgressResponse {
  uuid: string
  progress: ProgressEntry[]
}

// Re-export server search result type so callers get the real BE shape
// (preview / rank / file_path), not a stale local guess.
export type { SearchResult } from '@/lib/schema-search'

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /api/progress */
export const getProgress = () => request<ProgressResponse>('/api/progress')

/** POST /api/progress — upsert one entry */
export const upsertProgress = (entry: Omit<ProgressEntry, 'opened_at'> & { opened_at?: string }) =>
  request<{ ok: boolean }>('/api/progress', {
    method: 'POST',
    body: JSON.stringify(entry),
  })

/** GET /api/search?q=<query> — unwraps `{results: [...]}` to a bare array. */
export const searchLabs = async (q: string) => {
  const res = await request<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
  return res.results
}

/** GET /healthz */
export const getHealth = () =>
  request<{ status: string; db: string }>('/healthz')
