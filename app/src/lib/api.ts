/**
 * Typed fetch wrapper for Hono backend API.
 * All requests go through Vite proxy → http://localhost:3000
 */

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

export interface SearchResult {
  slug: string
  title: string
  snippet: string
  score: number
}

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /api/progress */
export const getProgress = () => request<ProgressResponse>('/api/progress')

/** POST /api/progress — upsert one entry */
export const upsertProgress = (entry: Omit<ProgressEntry, 'opened_at'> & { opened_at?: string }) =>
  request<{ ok: boolean }>('/api/progress', {
    method: 'POST',
    body: JSON.stringify(entry),
  })

/** GET /api/search?q=<query> */
export const searchLabs = (q: string) =>
  request<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`)

/** GET /healthz */
export const getHealth = () =>
  request<{ status: string; db: string }>('/healthz')
