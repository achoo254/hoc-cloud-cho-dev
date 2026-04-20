export { NetworkTopology } from './network-topology'
export * from './network-icons'
export * from './types'

// Example configurations for common network topologies
import type { TopologyConfig } from './types'

export const EXAMPLE_HOME_NETWORK: TopologyConfig = {
  width: 700,
  height: 300,
  autoLoop: true,
  loopDelay: 1500,
  nodes: [
    { id: 'client', type: 'client', label: 'Client', x: 80, y: 150 },
    { id: 'router', type: 'router', label: 'Router', x: 230, y: 150 },
    { id: 'modem', type: 'modem', label: 'Modem', x: 380, y: 150 },
    { id: 'cloud', type: 'cloud', label: 'Internet', x: 530, y: 150 },
    { id: 'server', type: 'server', label: 'Server', x: 650, y: 150 },
  ],
  links: [
    { id: 'l1', source: 'client', target: 'router' },
    { id: 'l2', source: 'router', target: 'modem' },
    { id: 'l3', source: 'modem', target: 'cloud' },
    { id: 'l4', source: 'cloud', target: 'server' },
  ],
  packets: [
    { id: 'req', path: ['client', 'router', 'modem', 'cloud', 'server'], color: '#22c55e', speed: 600 },
  ],
}

export const EXAMPLE_DNS_LOOKUP: TopologyConfig = {
  width: 700,
  height: 350,
  autoLoop: true,
  loopDelay: 2000,
  nodes: [
    { id: 'client', type: 'client', label: 'Client', x: 100, y: 175 },
    { id: 'router', type: 'router', label: 'Router', x: 280, y: 175 },
    { id: 'dns', type: 'dns', label: 'DNS Server', x: 280, y: 70 },
    { id: 'cloud', type: 'cloud', label: 'Internet', x: 460, y: 175 },
    { id: 'server', type: 'server', label: 'Web Server', x: 620, y: 175 },
  ],
  links: [
    { id: 'l1', source: 'client', target: 'router' },
    { id: 'l2', source: 'router', target: 'dns' },
    { id: 'l3', source: 'router', target: 'cloud' },
    { id: 'l4', source: 'cloud', target: 'server' },
  ],
  packets: [
    { id: 'dns-query', path: ['client', 'router', 'dns'], color: '#3b82f6', speed: 500 },
    { id: 'dns-response', path: ['dns', 'router', 'client'], color: '#8b5cf6', speed: 500 },
  ],
}

// DevOps-style: Full request/response flow with realistic components
export const EXAMPLE_DEVOPS_FLOW: TopologyConfig = {
  width: 800,
  height: 500,
  autoLoop: true,
  loopDelay: 1500,
  nodes: [
    // Left side: Client + DNS
    { id: 'client', type: 'client', label: 'Client', x: 100, y: 80 },
    { id: 'dns', type: 'dns', label: 'DNS Resolver', x: 280, y: 80 },

    // Middle: Network path
    { id: 'router', type: 'router', label: 'Router/NAT', x: 100, y: 200 },
    { id: 'isp', type: 'cloud', label: 'ISP Network', x: 280, y: 200 },
    { id: 'internet', type: 'cloud', label: 'Internet', x: 460, y: 200 },

    // Right side: Server infrastructure
    { id: 'firewall', type: 'firewall', label: 'Firewall', x: 640, y: 200 },
    { id: 'lb', type: 'switch', label: 'Load Balancer', x: 640, y: 320 },
    { id: 'server', type: 'server', label: 'Web Server', x: 640, y: 440 },
  ],
  links: [
    // DNS lookup
    { id: 'l-dns-q', source: 'client', target: 'dns' },

    // Request path
    { id: 'l1', source: 'client', target: 'router' },
    { id: 'l2', source: 'router', target: 'isp' },
    { id: 'l3', source: 'isp', target: 'internet' },
    { id: 'l4', source: 'internet', target: 'firewall' },
    { id: 'l5', source: 'firewall', target: 'lb' },
    { id: 'l6', source: 'lb', target: 'server' },
  ],
  packets: [
    // Step 1: DNS Query (blue)
    { id: 'dns-q', path: ['client', 'dns'], color: '#3b82f6', speed: 700 },
    // Step 2: DNS Response (purple)
    { id: 'dns-r', path: ['dns', 'client'], color: '#8b5cf6', speed: 700 },
    // Step 3: HTTP Request (green)
    { id: 'req', path: ['client', 'router', 'isp', 'internet', 'firewall', 'lb', 'server'], color: '#22c55e', speed: 600 },
    // Step 4: HTTP Response (orange)
    { id: 'res', path: ['server', 'lb', 'firewall', 'internet', 'isp', 'router', 'client'], color: '#f59e0b', speed: 600 },
  ],
}

// Simplified vertical flow
export const EXAMPLE_VERTICAL_FLOW: TopologyConfig = {
  width: 300,
  height: 550,
  autoLoop: true,
  loopDelay: 1200,
  nodes: [
    { id: 'client', type: 'client', label: 'Client', x: 150, y: 50 },
    { id: 'router', type: 'router', label: 'Local Router', x: 150, y: 130 },
    { id: 'isp', type: 'modem', label: 'ISP', x: 150, y: 210 },
    { id: 'internet', type: 'cloud', label: 'Internet', x: 150, y: 290 },
    { id: 'lb', type: 'switch', label: 'Load Balancer', x: 150, y: 370 },
    { id: 'server', type: 'server', label: 'Web Server', x: 150, y: 450 },
  ],
  links: [
    { id: 'l1', source: 'client', target: 'router' },
    { id: 'l2', source: 'router', target: 'isp' },
    { id: 'l3', source: 'isp', target: 'internet' },
    { id: 'l4', source: 'internet', target: 'lb' },
    { id: 'l5', source: 'lb', target: 'server' },
  ],
  packets: [
    { id: 'req', path: ['client', 'router', 'isp', 'internet', 'lb', 'server'], color: '#22c55e', speed: 400 },
    { id: 'res', path: ['server', 'lb', 'internet', 'isp', 'router', 'client'], color: '#f59e0b', speed: 400 },
  ],
}

export const EXAMPLE_CORPORATE_NETWORK: TopologyConfig = {
  width: 800,
  height: 400,
  autoLoop: true,
  loopDelay: 1500,
  nodes: [
    { id: 'client1', type: 'client', label: 'PC 1', x: 80, y: 100 },
    { id: 'client2', type: 'client', label: 'PC 2', x: 80, y: 250 },
    { id: 'switch', type: 'switch', label: 'Switch', x: 220, y: 175 },
    { id: 'firewall', type: 'firewall', label: 'Firewall', x: 360, y: 175 },
    { id: 'router', type: 'router', label: 'Router', x: 500, y: 175 },
    { id: 'cloud', type: 'cloud', label: 'Internet', x: 640, y: 175 },
    { id: 'server', type: 'server', label: 'Server', x: 750, y: 175 },
  ],
  links: [
    { id: 'l1', source: 'client1', target: 'switch' },
    { id: 'l2', source: 'client2', target: 'switch' },
    { id: 'l3', source: 'switch', target: 'firewall' },
    { id: 'l4', source: 'firewall', target: 'router' },
    { id: 'l5', source: 'router', target: 'cloud' },
    { id: 'l6', source: 'cloud', target: 'server' },
  ],
  packets: [
    { id: 'req1', path: ['client1', 'switch', 'firewall', 'router', 'cloud', 'server'], color: '#22c55e', speed: 500 },
    { id: 'req2', path: ['client2', 'switch', 'firewall', 'router', 'cloud', 'server'], color: '#f59e0b', speed: 500 },
  ],
}
