/**
 * content-loader.ts
 *
 * Runtime access to generated lab content files.
 *
 * - getLab(slug)  → lazy dynamic import per lab (code-split)
 * - getIndex()    → synchronous metadata array from pre-built JSON
 *
 * In dev mode, each loaded lab is validated via Zod and a console.warn
 * fires if the shape diverges from the schema (e.g. after manual edits).
 * In production, validation is skipped — content was already validated
 * at build time by fixtures-to-ts.mjs.
 */

import type { LabContent } from '@/lib/schema-lab'
import labsIndex from '@/generated/labs-index.json'

// ── LabIndexEntry type ────────────────────────────────────────────────────────

export interface LabIndexEntry {
  slug: string
  title: string
  module: string
  estimated_minutes: number
  updated_at: number
  tags: string[]
}

// ── Vite lazy glob — one dynamic chunk per lab ────────────────────────────────
// Path is resolved relative to THIS file (app/src/lib/content-loader.ts).
// content/labs/ is 3 levels up (lib → src → app → repo-root) then down.

const labModules = import.meta.glob<{ default: LabContent }>('../../../content/labs/*.ts')

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Dynamically load a single lab by slug.
 * Returns null if the slug is not found in the glob map.
 * In development, validates the loaded content against LabFixtureSchema.
 */
export async function getLab(slug: string): Promise<LabContent | null> {
  // Build the glob key matching the pattern above — must match exactly
  const key = `../../../content/labs/${slug}.ts`

  const loader = labModules[key]
  if (!loader) return null

  const mod = await loader()
  const lab = mod.default

  // Dev-only runtime validation — warn on schema drift, never throw
  if (import.meta.env.DEV) {
    const { LabFixtureSchema } = await import('@/lib/schema-lab')
    const result = LabFixtureSchema.safeParse(lab)
    if (!result.success) {
      console.warn(
        `[content-loader] Schema validation failed for lab "${slug}":`,
        result.error.flatten(),
      )
    }
  }

  return lab
}

/**
 * Return all lab index entries synchronously.
 * Data comes from the pre-built app/src/generated/labs-index.json.
 * No network request — bundled at build time.
 */
export function getIndex(): LabIndexEntry[] {
  return labsIndex as LabIndexEntry[]
}
