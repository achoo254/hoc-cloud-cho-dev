/**
 * Diagram component registry — maps fixture `diagram.component` → lazy React component.
 * Phase 01: Only TcpIpJourneyPlayground registered; add more as pilots validate.
 */

import { lazy, type ComponentType } from 'react'
import type { LabContent } from '@/lib/schema-lab'

export interface DiagramComponentProps {
  lab: LabContent
}

type DiagramComponent = ComponentType<DiagramComponentProps>

export const diagramRegistry = {
  TcpIpJourneyPlayground: lazy(() =>
    import('./tcp-ip-journey-playground').then((m) => ({
      default: m.TcpIpJourneyPlayground,
    }))
  ),
  IPv4Playground: lazy(() =>
    import('./ipv4-playground').then((m) => ({
      default: m.IPv4Playground,
    }))
  ),
} as const satisfies Record<string, React.LazyExoticComponent<DiagramComponent>>

export type DiagramRegistryKey = keyof typeof diagramRegistry

export const DIAGRAM_REGISTRY_KEYS = Object.keys(diagramRegistry) as DiagramRegistryKey[]
