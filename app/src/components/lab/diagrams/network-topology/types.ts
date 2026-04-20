/**
 * Types for Network Topology Diagram
 */

export type DeviceType = 'client' | 'router' | 'switch' | 'server' | 'modem' | 'cloud' | 'dns' | 'firewall'

export interface NetworkNode {
  id: string
  type: DeviceType
  label: string
  x: number
  y: number
}

export interface NetworkLink {
  id: string
  source: string
  target: string
  label?: string
}

export interface PacketConfig {
  id: string
  path: string[] // Array of node IDs: ['client', 'router', 'server']
  color?: string
  speed?: number // Duration in ms for one segment
}

export interface TopologyConfig {
  nodes: NetworkNode[]
  links: NetworkLink[]
  packets: PacketConfig[]
  width?: number
  height?: number
  autoLoop?: boolean
  loopDelay?: number // Delay between loops in ms
}
