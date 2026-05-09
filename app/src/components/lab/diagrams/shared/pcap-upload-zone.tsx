/**
 * Drag-and-drop / click-to-browse upload zone for .pcap files.
 * Validates size, calls parsePcap, maps errors to user-friendly Vietnamese messages.
 */

import { useRef, useState } from 'react'
import { parsePcap } from './pcap-parser'
import type { DecodedPacket, PcapParseError } from './packet-types'

interface PcapUploadZoneProps {
  onParsed: (packets: DecodedPacket[], truncated: boolean) => void
  onError: (message: string) => void
  maxBytes?: number
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

const ERROR_MESSAGES: Record<PcapParseError, string> = {
  INVALID_MAGIC: 'Không phải file PCAP hợp lệ',
  PCAPNG_UNSUPPORTED:
    'File PCAPNG (.pcapng) chưa hỗ trợ. Dùng `tcpdump -w file.pcap` (không thêm flag --pcapng)',
  TOO_LARGE: 'File quá lớn (max 5 MB). Dùng `tcpdump -c 100` để giới hạn số packet',
  MALFORMED: 'File hỏng hoặc không đúng format PCAP classic',
  UNKNOWN_LINK_TYPE:
    'Link type không hỗ trợ. Hỗ trợ: Ethernet (`-i eth0`) hoặc Linux SLL (`-i any`)',
}

type DropState = 'idle' | 'dragover' | 'parsing'

export function PcapUploadZone({
  onParsed,
  onError,
  maxBytes = DEFAULT_MAX_BYTES,
}: PcapUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropState, setDropState] = useState<DropState>('idle')

  async function handleFile(file: File) {
    if (file.size > maxBytes) {
      onError('File quá lớn (max 5 MB). Dùng `tcpdump -c 100` để giới hạn số packet')
      return
    }

    setDropState('parsing')
    try {
      const buf = await file.arrayBuffer()
      const result = parsePcap(buf)
      if (result.ok) {
        onParsed(result.packets, result.truncated)
      } else {
        onError(ERROR_MESSAGES[result.error] ?? result.message)
      }
    } catch {
      onError('Đã xảy ra lỗi khi đọc file. Vui lòng thử lại.')
    } finally {
      setDropState('idle')
    }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault()
    setDropState('dragover')
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDropState('dragover')
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    // Only reset to idle if leaving the drop zone (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDropState('idle')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropState('idle')
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // reset so same file can be selected again
    e.target.value = ''
  }

  const isParsing = dropState === 'parsing'
  const isDragOver = dropState === 'dragover'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PCAP file"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isParsing && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!isParsing) inputRef.current?.click()
        }
      }}
      className={[
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
        'cursor-pointer select-none p-8 text-center text-sm transition-colors',
        isDragOver
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/30',
        isParsing ? 'pointer-events-none opacity-60' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pcap,.cap"
        className="hidden"
        onChange={onInputChange}
      />

      {isParsing ? (
        <span className="font-mono text-xs">Đang parse...</span>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <span className="font-medium">Kéo file .pcap vào đây hoặc click để chọn</span>
          <span className="text-xs opacity-60">Tối đa 5 MB · PCAP classic · Ethernet / Linux SLL</span>
        </>
      )}
    </div>
  )
}
