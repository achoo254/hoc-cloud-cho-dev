/**
 * PacketDecoder — orchestrator component for the 3-panel PCAP visualization UI.
 * Manages mode (sample/upload), packet selection, and field highlighting.
 * Wraps everything in PlaygroundErrorBoundary.
 */

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PlaygroundErrorBoundary } from '@/components/lab/diagrams/playground-error-boundary'
import { useIsDesktop } from '@/lib/hooks/use-media-query'
import type { DecodedField, DecodedPacket } from './packet-types'
import { PacketSummaryList } from './packet-summary-list'
import { PacketLayerTree } from './packet-layer-tree'
import { PacketHexView } from './packet-hex-view'
import { PcapUploadZone } from './pcap-upload-zone'

type Mode = 'sample' | 'upload'

interface PacketDecoderProps {
  defaultPackets: DecodedPacket[]
  title?: string
}

function PacketDecoderInner({ defaultPackets, title }: PacketDecoderProps) {
  const isDesktop = useIsDesktop()

  const [mode, setMode] = useState<Mode>('sample')
  const [uploadedPackets, setUploadedPackets] = useState<DecodedPacket[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [truncatedNotice, setTruncatedNotice] = useState(false)
  const [selectedPacketIdx, setSelectedPacketIdx] = useState(0)
  const [highlightedField, setHighlightedField] = useState<DecodedField | null>(null)

  const displayPackets = mode === 'sample' ? defaultPackets : uploadedPackets
  const selectedPacket = displayPackets[selectedPacketIdx] ?? null

  function handleModeChange(newMode: string) {
    setMode(newMode as Mode)
    setSelectedPacketIdx(0)
    setHighlightedField(null)
  }

  function handleParsed(packets: DecodedPacket[], truncated: boolean) {
    setUploadedPackets(packets)
    setUploadError(null)
    setTruncatedNotice(truncated)
    setSelectedPacketIdx(0)
    setHighlightedField(null)
  }

  function handleUploadError(message: string) {
    setUploadError(message)
    setTruncatedNotice(false)
  }

  function handleSelectPacket(idx: number) {
    setSelectedPacketIdx(idx)
    setHighlightedField(null)
  }

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      )}

      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList className="mb-2">
          <TabsTrigger value="sample">Sample captures</TabsTrigger>
          <TabsTrigger value="upload">Upload .pcap</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <div className="mb-3 space-y-2">
            <PcapUploadZone onParsed={handleParsed} onError={handleUploadError} />

            {uploadError && (
              <div
                role="alert"
                className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {uploadError}
              </div>
            )}

            {truncatedNotice && (
              <div
                role="status"
                className="rounded border border-yellow-400/40 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
              >
                File bị cắt ngắn — chỉ hiển thị tối đa số packet cho phép.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty state for upload mode with no packets */}
      {mode === 'upload' && displayPackets.length === 0 ? (
        <div className="flex items-center justify-center rounded border border-dashed p-8 text-xs text-muted-foreground">
          Kéo file .pcap vào vùng trên hoặc click để chọn
        </div>
      ) : (
        /* 3-panel grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Left: packet list */}
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Packets ({displayPackets.length})
            </p>
            <PacketSummaryList
              packets={displayPackets}
              selectedIdx={selectedPacketIdx}
              onSelect={handleSelectPacket}
            />
          </div>

          {/* Right: layer tree + hex view */}
          <div className="flex flex-col gap-3 md:col-span-2">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Protocol layers
              </p>
              <PacketLayerTree
                packet={selectedPacket}
                highlightedField={highlightedField}
                onSelectField={setHighlightedField}
              />
            </div>

            <details open={isDesktop}>
              <summary className="mb-1 cursor-pointer select-none text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
                Hex dump
              </summary>
              <PacketHexView
                packet={selectedPacket}
                highlightedField={highlightedField}
              />
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

export function PacketDecoder(props: PacketDecoderProps) {
  return (
    <PlaygroundErrorBoundary
      fallback={
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Không thể tải PacketDecoder. Vui lòng tải lại trang.
        </div>
      }
    >
      <PacketDecoderInner {...props} />
    </PlaygroundErrorBoundary>
  )
}
