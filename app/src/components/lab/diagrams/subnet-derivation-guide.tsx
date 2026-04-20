'use client'

/**
 * Subnet Derivation Guide - Step-by-step explanation of how to derive
 * network address, broadcast address, and usable host range from a subnet.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Copy, Check } from 'lucide-react'
import { CodeBlock } from '@/components/lab/code-block'

interface SubnetDerivationGuideProps {
  className?: string
}

function InlineCode({ children, copyText }: { children: React.ReactNode; copyText?: string }) {
  const [copied, setCopied] = useState(false)
  const text = copyText || (typeof children === 'string' ? children : '')

  const handleCopy = async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative flex items-center bg-muted/50 rounded-lg px-4 py-3 font-mono text-sm group">
      <span className="flex-1">{children}</span>
      {text && (
        <button
          onClick={handleCopy}
          className="ml-2 p-1.5 rounded hover:bg-muted-foreground/20 transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  )
}

const JS_CODE = `// === BITWISE CHEAT SHEET ===
// <<  : dịch trái (nhân 2^n)     | 1 << 8 = 256
// >>  : dịch phải có dấu        | -256 >> 8 = -1
// >>> : dịch phải KHÔNG dấu     | -1 >>> 0 = 4294967295
// &   : AND từng bit            | 0b1100 & 0b1010 = 0b1000
// |   : OR từng bit             | 0b1100 | 0b1010 = 0b1110
// ~   : đảo bit (NOT)           | ~0 = -1 (tất cả bit 1)
// >>> 0 : trick convert sang unsigned 32-bit (IP cần số dương)

// IP string → Number (vd: "192.168.1.1" → 3232235777)
const ip2num = (ip) => ip.split('.').reduce((a, b) => (a << 8) | +b, 0) >>> 0

// Number → IP string (vd: 3232235777 → "192.168.1.1")
const num2ip = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

// CIDR → Subnet Mask (vd: 24 → 0xFFFFFF00 = 255.255.255.0)
const cidr2mask = (cidr) => (~0 << (32 - cidr)) >>> 0

// Block size = số IP trong subnet (vd: /26 → 64)
const blockSize = (cidr) => 1 << (32 - cidr)

// Network address = IP AND Mask
const network = (ip, cidr) => num2ip(ip2num(ip) & cidr2mask(cidr))

// Broadcast = Network OR (đảo Mask)
const broadcast = (ip, cidr) => {
  const mask = cidr2mask(cidr)
  return num2ip((ip2num(ip) & mask) | (~mask >>> 0))
}

// Usable hosts = Block size - 2 (trừ network + broadcast)
const usableHosts = (cidr) => (1 << (32 - cidr)) - 2`

const PYTHON_CODE = `import ipaddress

net = ipaddress.ip_network('192.168.1.100/26', strict=False)

net.network_address   # 192.168.1.64
net.broadcast_address # 192.168.1.127
net.netmask           # 255.255.255.192
net.num_addresses - 2 # 62 usable hosts
list(net.hosts())[0]  # First usable: 192.168.1.65
list(net.hosts())[-1] # Last usable: 192.168.1.126`

const BASH_CODE = `# Với ipcalc (apt install ipcalc)
ipcalc 192.168.1.100/26

# Không có ipcalc? Dùng Python one-liner
python3 -c "import ipaddress; n=ipaddress.ip_network('192.168.1.100/26', 0); \\
  print(f'Network: {n.network_address}'); \\
  print(f'Broadcast: {n.broadcast_address}'); \\
  print(f'Usable: {n.num_addresses - 2}')"`

export function SubnetDerivationGuide({ className }: SubnetDerivationGuideProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Section 1: Concrete Example - Broadcast */}
      <section className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <span>🎯</span> Ví dụ cụ thể: Tìm Broadcast Address
        </h4>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Subnet:</p>
          <InlineCode copyText="192.168.1.0/24">192.168.1.0/24</InlineCode>

          <ul className="text-sm text-muted-foreground list-disc list-inside">
            <li>/24 → 24 bit network, 8 bit host</li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Host bits:</p>
          <InlineCode copyText="00000000 → 11111111">00000000 → 11111111</InlineCode>

          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>👉</span> Khi = toàn 1:
          </p>
          <InlineCode copyText="255">11111111  =  255</InlineCode>

          <p className="text-sm text-muted-foreground">→ Địa chỉ broadcast là:</p>
          <InlineCode copyText="192.168.1.255">192.168.1.255</InlineCode>
        </div>
      </section>

      <hr className="border-border" />

      {/* Section 2: Real-world Meaning */}
      <section className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <span>📦</span> Ý nghĩa thực tế
        </h4>

        <p className="text-sm text-muted-foreground">Khi gửi packet tới:</p>
        <InlineCode copyText="192.168.1.255">192.168.1.255</InlineCode>

        <div className="text-sm text-muted-foreground space-y-2">
          <p className="flex items-center gap-2">
            <span>👉</span> Điều xảy ra:
          </p>
          <ul className="list-disc list-inside ml-6 space-y-1">
            <li>TẤT CẢ máy trong mạng đều nhận</li>
            <li>Dùng trong:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>ARP request</li>
                <li>DHCP discover</li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <hr className="border-border" />

      {/* Section 3: Network Address */}
      <section className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <span>🏠</span> Network Address
        </h4>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Host bits = toàn 0:</p>
          <InlineCode copyText="0">00000000  =  0</InlineCode>

          <p className="text-sm text-muted-foreground">→ Địa chỉ network là:</p>
          <InlineCode copyText="192.168.1.0">192.168.1.0</InlineCode>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="flex items-center gap-2">
              <span>👉</span> Ý nghĩa:
            </p>
            <ul className="list-disc list-inside ml-6">
              <li>Đại diện cho CẢ subnet</li>
              <li>Router dùng trong routing table</li>
              <li className="text-destructive">KHÔNG gán cho máy cụ thể</li>
            </ul>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Section 4: Usable Range */}
      <section className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <span>💻</span> Dải IP sử dụng được
        </h4>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-2">First usable:</p>
              <InlineCode copyText="192.168.1.1">192.168.1.1</InlineCode>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">Last usable:</p>
              <InlineCode copyText="192.168.1.254">192.168.1.254</InlineCode>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Công thức:</p>
            <p className="text-muted-foreground font-mono">
              Usable hosts = 2^(32 - CIDR) - 2
            </p>
            <p className="text-muted-foreground font-mono mt-1">
              /24 → 2^8 - 2 = 256 - 2 = <span className="text-primary font-bold">254</span> hosts
            </p>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* Section 5: Quick Mental Math */}
      <section className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <span>⚡</span> Nhẩm nhanh
        </h4>

        <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
          <p className="text-muted-foreground">
            Cho IP <span className="font-mono text-primary">192.168.1.100/26</span>, tìm network:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>/26 → block size = 2^(32-26) = 2^6 = <span className="font-bold text-foreground">64</span></li>
            <li>100 ÷ 64 = 1 dư 36 → network = 1 × 64 = <span className="font-bold text-foreground">64</span></li>
            <li>Network: <span className="font-mono text-primary">192.168.1.64</span></li>
            <li>Broadcast: 64 + 64 - 1 = <span className="font-mono text-primary">192.168.1.127</span></li>
          </ol>
        </div>
      </section>

      <hr className="border-border" />

      {/* Section 6: Code Formulas */}
      <section className="space-y-4">
        <h4 className="text-base font-semibold flex items-center gap-2">
          <span>🧑‍💻</span> Code Formulas
        </h4>

        <div className="space-y-4">
          {/* JavaScript */}
          <div>
            <p className="text-sm font-medium text-amber-500 mb-2">JavaScript / TypeScript</p>
            <CodeBlock code={JS_CODE} lang="javascript" />
          </div>

          {/* Python */}
          <div>
            <p className="text-sm font-medium text-emerald-500 mb-2">Python</p>
            <CodeBlock code={PYTHON_CODE} lang="python" />
          </div>

          {/* Bash */}
          <div>
            <p className="text-sm font-medium text-cyan-500 mb-2">Bash</p>
            <CodeBlock code={BASH_CODE} lang="bash" />
          </div>

          {/* Key formulas summary */}
          <div className="bg-primary/10 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">📐 Công thức ghi nhớ:</p>
            <ul className="font-mono text-xs space-y-1 text-muted-foreground">
              <li><span className="text-primary">Block size</span> = 2^(32 - CIDR) = 256 / 2^(CIDR - 24)</li>
              <li><span className="text-primary">Network</span> = IP & Mask = floor(lastOctet / blockSize) × blockSize</li>
              <li><span className="text-primary">Broadcast</span> = Network + blockSize - 1</li>
              <li><span className="text-primary">Usable</span> = blockSize - 2</li>
              <li><span className="text-primary">Mask octet</span> = 256 - blockSize</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
