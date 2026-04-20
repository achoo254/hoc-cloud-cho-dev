/**
 * SVG export utilities for diagram playground.
 * Phase 06: SVG-only export with DOMPurify sanitization (RED TEAM #4).
 * PNG export CUT per RED TEAM #7.
 */

import DOMPurify from 'dompurify'

export function exportSvg(svg: SVGSVGElement, filename: string) {
  // Serialize SVG to string
  const serializer = new XMLSerializer()
  const raw = serializer.serializeToString(svg)

  // Sanitize to prevent XSS (RED TEAM #4 — CRITICAL)
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover'],
  })

  // Create Blob and download
  const blob = new Blob([clean], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Delay revoke to ensure Safari/mobile browsers complete download
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function generateExportFilename(labSlug: string, frameIdx?: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const framePart = frameIdx !== undefined ? `-frame-${frameIdx}` : ''
  return `${labSlug}${framePart}-${date}.svg`
}
