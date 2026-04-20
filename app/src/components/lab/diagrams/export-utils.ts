/**
 * SVG export utilities for diagram playground.
 * Phase 06: SVG-only export with DOMPurify sanitization (RED TEAM #4).
 * PNG export CUT per RED TEAM #7.
 */

import DOMPurify from 'dompurify'

const SVG_STYLE_PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'fill-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
] as const

function inlineComputedStyles(svg: SVGSVGElement): SVGSVGElement {
  // Get all elements from original (in DOM, has computed styles)
  const originalElements = Array.from(svg.querySelectorAll('*'))

  // Clone the SVG
  const clone = svg.cloneNode(true) as SVGSVGElement
  const cloneElements = Array.from(clone.querySelectorAll('*'))

  // Add background rectangle (SVG has no background-color, need rect)
  const svgComputed = window.getComputedStyle(svg)
  const bgColor = svgComputed.getPropertyValue('background-color')
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', bgColor)
    clone.insertBefore(bgRect, clone.firstChild)
  }

  // Apply computed styles from original to clone by index
  originalElements.forEach((origEl, idx) => {
    const cloneEl = cloneElements[idx]
    if (!(origEl instanceof SVGElement) || !(cloneEl instanceof SVGElement)) return

    const computed = window.getComputedStyle(origEl)

    SVG_STYLE_PROPS.forEach((prop) => {
      const value = computed.getPropertyValue(prop)
      if (value && value !== 'none' && value !== 'normal') {
        cloneEl.style.setProperty(prop, value)
      }
    })

    // Handle text fill from CSS color property
    if (origEl instanceof SVGTextElement && cloneEl instanceof SVGTextElement) {
      const color = computed.getPropertyValue('color')
      if (color && !cloneEl.style.fill) {
        cloneEl.style.setProperty('fill', color)
      }
    }
  })

  return clone
}

export function exportSvg(svg: SVGSVGElement, filename: string) {
  // Inline computed styles so colors work standalone
  const styledSvg = inlineComputedStyles(svg)

  // Serialize SVG to string
  const serializer = new XMLSerializer()
  const raw = serializer.serializeToString(styledSvg)

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
