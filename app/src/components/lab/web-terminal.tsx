import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

import type { LabContent } from '@/lib/schema-lab'

type Status = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed'

interface WebTerminalProps {
  lab: LabContent
}

/**
 * xterm.js terminal wired to `/ws/terminal/:labSlug`. SessionId is kept in
 * sessionStorage so a tab refresh re-attaches to the same tmux session on
 * the server. Exponential backoff on reconnect (1s → 16s, capped).
 */
export function WebTerminal({ lab }: WebTerminalProps) {
  const labSlug = lab.slug
  const termHostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('connecting')
  const [queuePosition, setQueuePosition] = useState<number | null>(null)

  useEffect(() => {
    if (!termHostRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: { background: '#1a1b26', foreground: '#a9b1d6' },
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termHostRef.current)
    fitAddon.fit()

    const sidKey = `lab-sid:${labSlug}`
    let sid = sessionStorage.getItem(sidKey)
    if (!sid) {
      sid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36)).slice(0, 8).replace(/-/g, '')
      sessionStorage.setItem(sidKey, sid)
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${proto}//${window.location.host}/ws/terminal/${encodeURIComponent(labSlug)}?sid=${sid}`

    let ws: WebSocket | null = null
    let retry = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null
    let disposed = false

    // Cloudflare free/pro cắt WS sau ~100s idle. Gửi zero-byte message định kỳ
    // để edge proxy giữ connection sống; server bỏ qua empty frame.
    const KEEPALIVE_MS = 60_000

    const connect = () => {
      if (disposed) return
      setStatus(retry === 0 ? 'connecting' : 'reconnecting')
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        retry = 0
        setStatus('connected')
        if (keepaliveTimer) clearInterval(keepaliveTimer)
        keepaliveTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            try { ws.send('') } catch {}
          }
        }, KEEPALIVE_MS)
      }
      ws.onmessage = (evt) => {
        const data = evt.data
        if (typeof data === 'string') {
          // Server may send small JSON control frames before terminal data.
          if (data.length > 0 && data[0] === '{') {
            try {
              const msg = JSON.parse(data)
              if (msg?.type === 'queue' && typeof msg.position === 'number') {
                setQueuePosition(msg.position)
                return
              }
            } catch {
              // Not JSON — fall through to terminal write.
            }
          }
          setQueuePosition(null)
          term.write(data)
        } else if (data instanceof ArrayBuffer) {
          setQueuePosition(null)
          term.write(new Uint8Array(data))
        } else if (data instanceof Blob) {
          data.arrayBuffer().then((buf) => term.write(new Uint8Array(buf)))
        }
      }
      ws.onerror = () => { setStatus('error') }
      ws.onclose = () => {
        if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null }
        if (disposed) return
        setStatus('reconnecting')
        retry = Math.min(retry + 1, 5)
        const delay = Math.min(1000 * 2 ** (retry - 1), 16000)
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    const dataSub = term.onData((data) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(data)
    })

    const handleResize = () => {
      try { fitAddon.fit() } catch {}
    }
    window.addEventListener('resize', handleResize)

    connect()

    return () => {
      disposed = true
      window.removeEventListener('resize', handleResize)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (keepaliveTimer) clearInterval(keepaliveTimer)
      dataSub.dispose()
      try { ws?.close() } catch {}
      term.dispose()
    }
  }, [labSlug])

  const statusDot = status === 'connected' ? 'bg-green-500'
    : status === 'error' ? 'bg-red-500'
    : status === 'closed' ? 'bg-gray-500'
    : 'bg-yellow-500 animate-pulse'

  const statusLabel =
    status === 'connected' ? 'Connected'
    : status === 'error' ? 'Connection failed'
    : status === 'reconnecting' ? 'Reconnecting…'
    : status === 'closed' ? 'Closed'
    : 'Connecting…'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
        <span className="text-xs text-muted-foreground">{statusLabel}</span>
      </div>
      {queuePosition !== null && (
        <div className="bg-yellow-500/10 text-yellow-600 px-3 py-2 rounded-md text-sm">
          Đang chờ trong hàng đợi: vị trí {queuePosition}
        </div>
      )}
      <div
        ref={termHostRef}
        className="rounded-lg overflow-hidden border border-border"
        style={{ height: '400px' }}
      />
    </div>
  )
}
