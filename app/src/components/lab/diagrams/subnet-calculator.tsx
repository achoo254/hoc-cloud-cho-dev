/**
 * Subnet Calculator (THINK section for IPv4 lab)
 * Interactive calculator showing binary breakdown, network info, and usable hosts.
 *
 * Input: IP/CIDR (e.g., 192.168.10.100/26)
 * Output: Network address, broadcast, mask, usable range, binary visualization
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Copy, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

interface SubnetInfo {
  ip: string
  cidr: number
  networkAddress: string
  broadcastAddress: string
  subnetMask: string
  wildcardMask: string
  usableHosts: number
  firstUsable: string
  lastUsable: string
  totalAddresses: number
  ipBinary: string[]
  networkBits: number
  hostBits: number
}

const PRESET_EXAMPLES = [
  { label: '/24 (Class C)', value: '192.168.1.100/24' },
  { label: '/26 (4 subnets)', value: '192.168.10.100/26' },
  { label: '/28 (small)', value: '10.0.0.50/28' },
  { label: '/30 (point-to-point)', value: '172.16.0.1/30' },
] as const

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((p) => parseInt(p, 10))
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return null
  return octets
}

function ipToNumber(octets: number[]): number {
  return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]
}

function numberToIP(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.')
}

function calculateSubnet(input: string): SubnetInfo | null {
  const match = input.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)
  if (!match) return null

  const [, ip, cidrStr] = match
  const cidr = parseInt(cidrStr, 10)
  if (cidr < 0 || cidr > 32) return null

  const octets = parseIPv4(ip)
  if (!octets) return null

  const ipNum = ipToNumber(octets)
  const hostBits = 32 - cidr
  const networkBits = cidr

  // Create mask: cidr bits of 1s followed by (32-cidr) bits of 0s
  const mask = cidr === 0 ? 0 : (~0 << hostBits) >>> 0
  const wildcardNum = ~mask >>> 0

  const networkNum = (ipNum & mask) >>> 0
  const broadcastNum = (networkNum | wildcardNum) >>> 0

  const totalAddresses = Math.pow(2, hostBits)
  const usableHosts = hostBits <= 1 ? totalAddresses : totalAddresses - 2

  // First/last usable
  const firstUsableNum = hostBits <= 1 ? networkNum : networkNum + 1
  const lastUsableNum = hostBits <= 1 ? broadcastNum : broadcastNum - 1

  // Binary representation of each octet
  const ipBinary = octets.map((o) => o.toString(2).padStart(8, '0'))

  return {
    ip,
    cidr,
    networkAddress: numberToIP(networkNum),
    broadcastAddress: numberToIP(broadcastNum),
    subnetMask: numberToIP(mask),
    wildcardMask: numberToIP(wildcardNum),
    usableHosts,
    firstUsable: numberToIP(firstUsableNum),
    lastUsable: numberToIP(lastUsableNum),
    totalAddresses,
    ipBinary,
    networkBits,
    hostBits,
  }
}

function BinaryDisplay({ info }: { info: SubnetInfo }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Binary Representation</p>
      <div className="font-mono text-sm bg-muted/50 p-3 rounded-lg overflow-x-auto">
        <div className="flex flex-wrap gap-1">
          {info.ipBinary.map((octet, octetIdx) => (
            <div key={octetIdx} className="flex">
              {octet.split('').map((bit, bitIdx) => {
                const globalBitIdx = octetIdx * 8 + bitIdx
                const isNetworkBit = globalBitIdx < info.networkBits
                return (
                  <motion.span
                    key={bitIdx}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: globalBitIdx * 0.02 }}
                    className={cn(
                      'w-4 h-6 flex items-center justify-center text-xs rounded',
                      isNetworkBit
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {bit}
                  </motion.span>
                )
              })}
              {octetIdx < 3 && <span className="mx-1 text-muted-foreground">.</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20" />
            Network ({info.networkBits} bits)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/20" />
            Host ({info.hostBits} bits)
          </span>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'network' | 'broadcast' | 'mask'
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const highlightClass = {
    network: 'text-emerald-600 dark:text-emerald-400',
    broadcast: 'text-amber-600 dark:text-amber-400',
    mask: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('font-mono text-sm', highlight && highlightClass[highlight])}>
          {value}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  )
}

export function SubnetCalculator() {
  const [input, setInput] = useState('192.168.10.100/26')
  const [error, setError] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const subnetInfo = useMemo(() => {
    if (!input.trim()) {
      setError(null)
      return null
    }
    const result = calculateSubnet(input)
    if (!result) {
      setError('Invalid format. Use IP/CIDR (e.g., 192.168.10.100/26)')
      return null
    }
    setError(null)
    return result
  }, [input])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Subnet Calculator
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter IP/CIDR to see network details and binary breakdown.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="192.168.10.100/26"
            className={cn('font-mono', error && 'border-destructive')}
            aria-label="IP/CIDR input"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {PRESET_EXAMPLES.map((preset) => (
            <Button
              key={preset.value}
              size="sm"
              variant={input === preset.value ? 'default' : 'outline'}
              className="text-xs"
              onClick={() => setInput(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {subnetInfo && (
          <motion.div
            key={subnetInfo.ip + subnetInfo.cidr}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Binary visualization */}
            <BinaryDisplay info={subnetInfo} />

            {/* Network info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium mb-2">Network Info</p>
                <InfoRow label="Network Address" value={subnetInfo.networkAddress} highlight="network" />
                <InfoRow label="Broadcast Address" value={subnetInfo.broadcastAddress} highlight="broadcast" />
                <InfoRow label="Subnet Mask" value={subnetInfo.subnetMask} highlight="mask" />
                <InfoRow label="Wildcard Mask" value={subnetInfo.wildcardMask} />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-medium mb-2">Host Range</p>
                <InfoRow label="Total Addresses" value={subnetInfo.totalAddresses.toLocaleString()} />
                <InfoRow label="Usable Hosts" value={subnetInfo.usableHosts.toLocaleString()} />
                <InfoRow label="First Usable" value={subnetInfo.firstUsable} />
                <InfoRow label="Last Usable" value={subnetInfo.lastUsable} />
              </div>
            </div>

            {/* Quick facts */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p>
                <strong>Block size:</strong> {subnetInfo.totalAddresses} addresses per subnet
              </p>
              <p className="text-muted-foreground">
                CIDR /{subnetInfo.cidr} = {subnetInfo.networkBits} network bits + {subnetInfo.hostBits} host bits
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
