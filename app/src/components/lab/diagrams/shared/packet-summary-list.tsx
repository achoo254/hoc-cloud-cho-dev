/**
 * Left panel: scrollable list of packet summaries.
 * Keyboard-accessible listbox — select packet by click or keyboard.
 */

import type { DecodedPacket } from './packet-types'

interface PacketSummaryListProps {
  packets: DecodedPacket[]
  selectedIdx: number
  onSelect: (i: number) => void
}

export function PacketSummaryList({ packets, selectedIdx, onSelect }: PacketSummaryListProps) {
  if (packets.length === 0) {
    return (
      <div className="flex items-center justify-center rounded border p-4 text-xs text-muted-foreground">
        Không có packet nào
      </div>
    )
  }

  return (
    <ul
      role="listbox"
      aria-label="Danh sách packet"
      className="max-h-[480px] overflow-y-auto rounded border p-2 font-mono text-xs md:max-h-[600px]"
    >
      {packets.map((pkt, idx) => {
        const isSelected = idx === selectedIdx
        return (
          <li key={idx} role="option" aria-selected={isSelected}>
            <button
              type="button"
              onClick={() => onSelect(idx)}
              className={[
                'w-full rounded px-2 py-1 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                // Mobile: single-line truncate; desktop: allow wrap
                'overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal md:overflow-visible',
                isSelected
                  ? 'bg-primary/10 ring-1 ring-primary'
                  : 'hover:bg-muted/50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="mr-2 select-none text-muted-foreground">
                {String(pkt.index).padStart(4, ' ')}
              </span>
              <span className="mr-2 text-muted-foreground">{pkt.timestamp}</span>
              {pkt.summary}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
