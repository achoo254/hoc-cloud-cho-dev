/**
 * Shared info panel cho 2 diagrams (three-column-mapping + osi-seven-layer).
 *
 * Hiển thị chi tiết khi user click vào TCP/IP layer / OSI layer / protocol chip.
 * Render HTML thường (không phải SVG) để screen-reader đọc được + có thể copy text.
 */

import { X } from 'lucide-react'
import { OSI_LAYERS, TCPIP_LAYERS, PROTOCOL_INFO } from './constants'

export type Selection =
  | { kind: 'tcpip'; idx: number }
  | { kind: 'osi'; num: number }
  | { kind: 'proto'; name: string; groupIdx: number }

interface Props {
  selection: Selection | null
  onClose: () => void
}

export function InfoPanel({ selection, onClose }: Props) {
  if (!selection) return null

  let title = ''
  let subtitle = ''
  let desc = ''
  let details: string[] = []
  let extras: Array<{ label: string; value: string }> = []
  let accentFill = '#64748b'
  let accentText = '#0f172a'

  if (selection.kind === 'tcpip') {
    const t = TCPIP_LAYERS[selection.idx]
    const osiList = t.osiNums
      .map((n) => `L${n} ${OSI_LAYERS.find((o) => o.num === n)?.name ?? ''}`)
      .join(', ')
    title = `TCP/IP · ${t.name}`
    subtitle = `Gộp OSI: ${osiList}`
    desc = t.desc
    details = t.details
    extras = [{ label: 'Vai trò', value: t.role }]
    accentFill = t.fill
    accentText = t.text
  } else if (selection.kind === 'osi') {
    const o = OSI_LAYERS.find((x) => x.num === selection.num)!
    title = `OSI L${o.num} · ${o.name}`
    subtitle = `PDU: ${o.pdu}`
    desc = o.desc
    details = o.details
    accentFill = o.fill
    accentText = o.text
  } else {
    const p = PROTOCOL_INFO[selection.name]
    const t = TCPIP_LAYERS[selection.groupIdx]
    title = `${selection.name}${p?.full ? ` · ${p.full}` : ''}`
    subtitle = `Thuộc tầng TCP/IP: ${t.name}`
    desc = p?.desc ?? ''
    details = p?.details ?? []
    if (p?.port) extras = [{ label: 'Port', value: p.port }]
    accentFill = t.fill
    accentText = t.text
  }

  return (
    <div
      role="region"
      aria-label="Chi tiết phần tử đã chọn"
      className="relative rounded-lg border border-border bg-card p-4 shadow-sm"
      style={{ borderLeftColor: accentFill, borderLeftWidth: 4 }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng chi tiết"
        className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-1 pr-8">
        <span
          className="inline-block w-3 h-3 rounded-sm"
          style={{ background: accentFill }}
          aria-hidden="true"
        />
        <h4 className="font-bold text-base" style={{ color: accentText }}>
          {title}
        </h4>
      </div>
      {subtitle && <p className="text-sm text-muted-foreground mb-2">{subtitle}</p>}
      {desc && <p className="text-sm leading-relaxed mb-2">{desc}</p>}
      {extras.length > 0 && (
        <dl className="mt-2 mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {extras.map((e) => (
            <div key={e.label} className="contents">
              <dt className="font-semibold text-muted-foreground">{e.label}:</dt>
              <dd>{e.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {details.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Góc nhìn dev
          </p>
          <ul className="space-y-1.5 text-sm leading-relaxed list-disc list-outside ml-4 marker:text-muted-foreground">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
