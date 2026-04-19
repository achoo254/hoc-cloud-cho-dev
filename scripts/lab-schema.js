// Zod schema for lab content — schema v3 "THINK·SEE·SHIP" via DB columns.
// Loose base + optional domain extras to accommodate per-lab variance.
// Ported to `app/src/lib/schema-lab.ts` when scaffolding Phase 01.

import { z } from 'zod';

// TLDR item — "THINK" content. Core 4 pillars + optional domain fields.
const TldrItemSchema = z.object({
  // Core pillars (schema v2 legacy, required for THINK)
  why: z.string(),
  whyBreaks: z.string(),
  deploymentUse: z.string().optional(),

  // Common optional fields
  what: z.string().optional(),

  // Domain-specific extras (networking layers, DHCP steps, CIDR terms, etc.)
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
}).passthrough(); // tolerate extra fields, surface them at runtime

// Walkthrough step — "SEE" content.
const WalkthroughStepSchema = z.object({
  step: z.union([z.string(), z.number()]),
  what: z.string(),
  why: z.string(),
  whyBreaks: z.string().optional(),
  observeWith: z.string().optional(),
  code: z.string().optional(),
  failModes: z.array(z.union([
    z.string(),
    z.object({ symptom: z.string(), evidence: z.string().optional() }).passthrough(),
  ])).optional(),
  fixSteps: z.array(z.union([
    z.string(),
    z.object({ step: z.string(), command: z.string().optional() }).passthrough(),
  ])).optional(),
}).passthrough();

// Quiz item.
const QuizItemSchema = z.object({
  q: z.string(),
  options: z.array(z.string()).min(2),
  correct: z.number().int().min(0),
  whyCorrect: z.string().optional(),
  whyWrong: z.union([z.string(), z.array(z.string()), z.record(z.string())]).optional(),
}).passthrough();

// Flashcard.
const FlashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  why: z.string().optional(),
}).passthrough();

// Try-at-home command — "SHIP" content.
const TryAtHomeSchema = z.object({
  cmd: z.string(),
  why: z.string(),
  observeWith: z.string().optional(),
}).passthrough();

// Full lab fixture (mirrors dumped JSON shape from dump-lab-fixtures.js).
export const LabFixtureSchema = z.object({
  id: z.number().int(),
  slug: z.string().min(1),
  module: z.string().min(1),
  title: z.string().min(1),
  file_path: z.string().min(1),
  estimated_minutes: z.number().int().positive(),
  content_hash: z.string().min(1),
  updated_at: z.number().int(),

  tldr: z.array(TldrItemSchema).min(1),
  walkthrough: z.array(WalkthroughStepSchema).min(1),
  quiz: z.array(QuizItemSchema).min(1),
  flashcards: z.array(FlashcardSchema).min(1),
  try_at_home: z.array(TryAtHomeSchema).min(1),
});

export const LabSchemas = {
  TldrItemSchema,
  WalkthroughStepSchema,
  QuizItemSchema,
  FlashcardSchema,
  TryAtHomeSchema,
  LabFixtureSchema,
};
