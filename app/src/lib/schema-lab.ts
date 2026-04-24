/**
 * Zod schema v3 for lab content — "THINK · SEE · TRY IT" structure.
 * Source of truth cho lab shape (FE parse API responses + seed fixtures).
 * Uses .passthrough() on all domain-specific objects to tolerate variance.
 */

import { z } from 'zod'

// ── Diagram (optional interactive playground) ─────────────────────────────────
// RED TEAM #6: Single variant for now; extend to discriminatedUnion when needed.

import { DIAGRAM_REGISTRY_KEYS } from '@/components/lab/diagrams/registry'

const registryKeys = DIAGRAM_REGISTRY_KEYS as [string, ...string[]]

export const DiagramSchema = z.object({
  type: z.literal('custom'),
  component: z.enum(registryKeys),
})

export type DiagramConfig = z.infer<typeof DiagramSchema>

// ── THINK section ─────────────────────────────────────────────────────────────

export const TldrItemSchema = z
  .object({
    why: z.string(),
    whyBreaks: z.string(),
    deploymentUse: z.string().optional(),
    what: z.string().optional(),
    // Domain-specific extras (networking layers, DHCP steps, CIDR terms…)
    layer: z.string().optional(),
    name: z.string().optional(),
    pdu: z.string().optional(),
    device: z.string().optional(),
    protocol: z.string().optional(),
    step: z.union([z.string(), z.number()]).optional(),
    src_dst: z.string().optional(),
    port: z.union([z.string(), z.number()]).optional(),
    payload: z.string().optional(),
    term: z.string().optional(),
    value: z.string().optional(),
  })
  .passthrough()

// ── SEE section ───────────────────────────────────────────────────────────────

export const WalkthroughStepSchema = z
  .object({
    step: z.union([z.string(), z.number()]),
    what: z.string(),
    why: z.string(),
    whyBreaks: z.string().optional(),
    observeWith: z.string().optional(),
    code: z.string().optional(),
    failModes: z
      .array(
        z.union([
          z.string(),
          z
            .object({ symptom: z.string(), evidence: z.string().optional() })
            .passthrough(),
        ]),
      )
      .optional(),
    fixSteps: z
      .array(
        z.union([
          z.string(),
          z
            .object({
              step: z.string(),
              command: z.string().optional(),
            })
            .passthrough(),
        ]),
      )
      .optional(),
  })
  .passthrough()

// ── TRY IT section ────────────────────────────────────────────────────────────

export const QuizItemSchema = z
  .object({
    q: z.string(),
    options: z.array(z.string()).min(2),
    correct: z.number().int().min(0),
    whyCorrect: z.string().optional(),
    whyWrong: z
      .union([z.string(), z.array(z.string()), z.record(z.string())])
      .optional(),
  })
  .passthrough()

export const FlashcardSchema = z
  .object({
    front: z.string(),
    back: z.string(),
    why: z.string().optional(),
  })
  .passthrough()

export const TryAtHomeSchema = z
  .object({
    cmd: z.string(),
    why: z.string(),
    observeWith: z.string().optional(),
  })
  .passthrough()

// ── Misconceptions (THINK depth upgrade) ──────────────────────────────────────
// All 8 labs backfilled 2026-04-24: now required with min 2 items per lab.

export const MisconceptionSchema = z
  .object({
    wrong: z.string(),
    right: z.string(),
    why: z.string(),
  })
  .passthrough()

// ── Full lab fixture ──────────────────────────────────────────────────────────

export const LabFixtureSchema = z.object({
  id: z.number().int(),
  slug: z.string().min(1),
  module: z.string().min(1),
  title: z.string().min(1),
  estimated_minutes: z.number().int().positive(),
  content_hash: z.string().min(1),
  updated_at: z.number().int(),

  tldr: z.array(TldrItemSchema).min(1),
  walkthrough: z.array(WalkthroughStepSchema).min(1),
  quiz: z.array(QuizItemSchema).min(1),
  flashcards: z.array(FlashcardSchema).min(1),
  try_at_home: z.array(TryAtHomeSchema).min(1),

  // THINK depth upgrade — required ≥2 items (all 8 labs backfilled 2026-04-24)
  misconceptions: z.array(MisconceptionSchema).min(2),

  // Optional interactive playground config (Phase 01)
  diagram: DiagramSchema.optional(),
})

// ── Convenience re-export namespace ──────────────────────────────────────────

export const LabSchemas = {
  TldrItemSchema,
  WalkthroughStepSchema,
  QuizItemSchema,
  FlashcardSchema,
  TryAtHomeSchema,
  MisconceptionSchema,
  LabFixtureSchema,
}

// ── Inferred TypeScript types ─────────────────────────────────────────────────

export type TldrItem = z.infer<typeof TldrItemSchema>
export type WalkthroughStep = z.infer<typeof WalkthroughStepSchema>
export type QuizItem = z.infer<typeof QuizItemSchema>
export type Flashcard = z.infer<typeof FlashcardSchema>
export type TryAtHome = z.infer<typeof TryAtHomeSchema>
export type Misconception = z.infer<typeof MisconceptionSchema>
/** Full parsed lab fixture — use as prop type for <LabRenderer>. */
export type LabContent = z.infer<typeof LabFixtureSchema>
