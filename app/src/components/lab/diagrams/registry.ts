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
  TcpUdpPlayground: lazy(() =>
    import('./tcp-udp-playground').then((m) => ({
      default: m.TcpUdpPlayground,
    }))
  ),
  IcmpPingPlayground: lazy(() =>
    import('./icmp-ping-playground').then((m) => ({
      default: m.IcmpPingPlayground,
    }))
  ),
  DhcpPlayground: lazy(() =>
    import('./dhcp-playground').then((m) => ({
      default: m.DhcpPlayground,
    }))
  ),
  ArpPlayground: lazy(() =>
    import('./arp-playground').then((m) => ({
      default: m.ArpPlayground,
    }))
  ),
  HttpPlayground: lazy(() =>
    import('./http-playground').then((m) => ({
      default: m.HttpPlayground,
    }))
  ),
  DnsPlayground: lazy(() =>
    import('./dns-playground').then((m) => ({
      default: m.DnsPlayground,
    }))
  ),
} as const satisfies Record<string, React.LazyExoticComponent<DiagramComponent>>

export type DiagramRegistryKey = keyof typeof diagramRegistry

export const DIAGRAM_REGISTRY_KEYS = Object.keys(diagramRegistry) as DiagramRegistryKey[]
