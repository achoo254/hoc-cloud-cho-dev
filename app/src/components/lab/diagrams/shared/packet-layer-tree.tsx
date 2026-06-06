/**
 * Right-top panel: collapsible protocol layer tree for a decoded packet.
 * Click a field to highlight it in the hex view; click again to deselect.
 */

import type { DecodedField, DecodedLayer, DecodedPacket } from './packet-types'

interface PacketLayerTreeProps {
  packet: DecodedPacket | null
  highlightedField: DecodedField | null
  onSelectField: (f: DecodedField | null) => void
}

function LayerSection({
  layer,
  highlightedField,
  onSelectField,
}: {
  layer: DecodedLayer
  highlightedField: DecodedField | null
  onSelectField: (f: DecodedField | null) => void
}) {
  return (
    <details open className="group">
      <summary className="cursor-pointer select-none rounded px-1 py-0.5 font-semibold hover:bg-muted/50">
        {layer.name}
      </summary>
      <ul className="mt-1 space-y-0.5 pl-3">
        {layer.fields.map((field, fi) => {
          const isSelected = highlightedField === field
          return (
            <li key={fi}>
              <button
                type="button"
                onClick={() => onSelectField(isSelected ? null : field)}
                className={[
                  'w-full rounded px-2 py-0.5 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'hover:bg-muted/50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="text-muted-foreground">{field.name}:</span>
                {' '}
                <span className="font-medium">{field.value}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export function PacketLayerTree({ packet, highlightedField, onSelectField }: PacketLayerTreeProps) {
  if (!packet) {
    return (
      <div className="flex items-center justify-center rounded border p-4 text-xs text-muted-foreground">
        Chọn 1 packet để xem chi tiết
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-y-auto rounded border p-3 text-xs">
      <div className="space-y-2">
        {packet.layers.map((layer, li) => (
          <LayerSection
            key={li}
            layer={layer}
            highlightedField={highlightedField}
            onSelectField={onSelectField}
          />
        ))}
      </div>
    </div>
  )
}
