/**
 * SVG Network Device Icons
 * Minimalist style, consistent 48x48 viewBox
 */

import type { DeviceType } from './types'

interface IconProps {
  size?: number
  className?: string
}

export const ClientIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Monitor */}
    <rect x="8" y="8" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="24" y1="32" x2="24" y2="38" stroke="currentColor" strokeWidth="2" />
    <line x1="16" y1="38" x2="32" y2="38" stroke="currentColor" strokeWidth="2" />
    {/* Screen glow */}
    <rect x="12" y="12" width="24" height="16" rx="1" fill="currentColor" opacity="0.2" />
  </svg>
)

export const RouterIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Router body */}
    <rect x="6" y="16" width="36" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Antennas */}
    <line x1="14" y1="16" x2="10" y2="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="10" cy="5" r="2" fill="currentColor" />
    <line x1="34" y1="16" x2="38" y2="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="38" cy="5" r="2" fill="currentColor" />
    {/* LEDs */}
    <circle cx="14" cy="24" r="2" fill="#22c55e" />
    <circle cx="22" cy="24" r="2" fill="#22c55e" />
    <circle cx="30" cy="24" r="2" fill="#f59e0b" />
  </svg>
)

export const SwitchIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Switch body */}
    <rect x="4" y="18" width="40" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Ports */}
    {[10, 18, 26, 34].map((x) => (
      <rect key={x} x={x} y="22" width="4" height="4" fill="currentColor" opacity="0.6" />
    ))}
    {/* LED strip */}
    <line x1="8" y1="34" x2="40" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.3" />
  </svg>
)

export const ServerIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Server stack */}
    <rect x="10" y="6" width="28" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="10" y="19" width="28" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="10" y="32" width="28" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Drive indicators */}
    <circle cx="32" cy="11" r="2" fill="#22c55e" />
    <circle cx="32" cy="24" r="2" fill="#22c55e" />
    <circle cx="32" cy="37" r="2" fill="#f59e0b" />
    {/* Vents */}
    <line x1="14" y1="11" x2="26" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="14" y1="24" x2="26" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="14" y1="37" x2="26" y2="37" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </svg>
)

export const ModemIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Modem body - vertical */}
    <rect x="16" y="4" width="16" height="36" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* LEDs */}
    <circle cx="24" cy="12" r="2" fill="#22c55e" />
    <circle cx="24" cy="20" r="2" fill="#22c55e" />
    <circle cx="24" cy="28" r="2" fill="#3b82f6" />
    {/* Base */}
    <rect x="14" y="40" width="20" height="4" rx="1" fill="currentColor" opacity="0.3" />
  </svg>
)

export const CloudIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Internet cloud */}
    <path
      d="M38 28c2.2 0 4-1.8 4-4s-1.8-4-4-4c0-5.5-4.5-10-10-10-4.3 0-8 2.7-9.4 6.5C17.4 16.2 16.2 16 15 16c-4.4 0-8 3.6-8 8s3.6 8 8 8h23z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    {/* Globe lines inside */}
    <ellipse cx="24" cy="24" rx="6" ry="4" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="24" y1="18" x2="24" y2="30" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </svg>
)

export const DnsIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* DNS Server - database style */}
    <ellipse cx="24" cy="12" rx="14" ry="6" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M10 12v24c0 3.3 6.3 6 14 6s14-2.7 14-6V12" stroke="currentColor" strokeWidth="2" fill="none" />
    <ellipse cx="24" cy="24" rx="14" ry="6" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* DNS text */}
    <text x="24" y="38" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="bold">DNS</text>
  </svg>
)

export const FirewallIcon = ({ size = 48, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Brick wall */}
    <rect x="6" y="10" width="36" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Bricks pattern */}
    <line x1="6" y1="18" x2="42" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="6" y1="26" x2="42" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="24" y1="10" x2="24" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="15" y1="18" x2="15" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="33" y1="18" x2="33" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="24" y1="26" x2="24" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    {/* Shield/flame indicator */}
    <circle cx="24" cy="24" r="4" fill="#ef4444" opacity="0.6" />
  </svg>
)

// Icon map for dynamic rendering
export const NetworkIconMap: Record<DeviceType, React.FC<IconProps>> = {
  client: ClientIcon,
  router: RouterIcon,
  switch: SwitchIcon,
  server: ServerIcon,
  modem: ModemIcon,
  cloud: CloudIcon,
  dns: DnsIcon,
  firewall: FirewallIcon,
}

export function getNetworkIcon(type: DeviceType): React.FC<IconProps> {
  return NetworkIconMap[type] || ClientIcon
}
