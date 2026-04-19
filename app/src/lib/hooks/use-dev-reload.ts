/**
 * useDevReload — subscribes to server-sent events at /sse/reload in dev mode.
 * On receiving a "reload" event, triggers window.location.reload().
 * No-ops in production builds (import.meta.env.DEV guard).
 *
 * Server endpoint: GET /sse/reload (see server/lib/sse-reload.js)
 */

import { useEffect } from 'react'

export function useDevReload(): void {
  useEffect(() => {
    // Only active in Vite dev mode
    if (!import.meta.env.DEV) return

    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    function connect() {
      es = new EventSource('/sse/reload')

      es.addEventListener('reload', () => {
        window.location.reload()
      })

      es.onerror = () => {
        es?.close()
        es = null
        // Retry after 3 s to handle server restart
        retryTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (retryTimeout !== null) clearTimeout(retryTimeout)
      es?.close()
    }
  }, [])
}
