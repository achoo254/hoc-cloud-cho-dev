/**
 * use-query-highlight.ts
 *
 * Scans text nodes inside a container ref, wraps matches of the `?q=` URL
 * query param in `<mark class="query-highlight">`, and scrolls the first
 * match into view. Re-runs when URL query or container content changes.
 *
 * Lab content loads async (lazy components, shiki, mermaid). We use
 * MutationObserver with a debounced pass so newly-rendered nodes also
 * receive highlighting.
 */

import { useEffect, type RefObject } from 'react'
import { useSearchParams } from 'react-router-dom'

const HIGHLIGHT_CLASS = 'query-highlight'
const HIGHLIGHT_TAG = 'MARK'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPattern(query: string): RegExp | null {
  const tokens = query.trim().split(/\s+/).filter((t) => t.length >= 2)
  if (tokens.length === 0) return null
  return new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'gi')
}

// Skip nodes inside these elements (avoid breaking code highlighting, inputs, etc.)
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'])

function shouldSkip(node: Node): boolean {
  let el: Node | null = node.parentNode
  while (el && el instanceof HTMLElement) {
    if (SKIP_TAGS.has(el.tagName)) return true
    if (el.classList?.contains(HIGHLIGHT_CLASS)) return true
    el = el.parentNode
  }
  return false
}

function clearHighlights(container: HTMLElement): void {
  const marks = container.querySelectorAll(`mark.${HIGHLIGHT_CLASS}`)
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parent.normalize()
  })
}

function applyHighlights(container: HTMLElement, pattern: RegExp): HTMLElement | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!node.nodeValue || node.nodeValue.trim().length === 0) return NodeFilter.FILTER_REJECT
      if (shouldSkip(node)) return NodeFilter.FILTER_REJECT
      // IMPORTANT: reset lastIndex — `g` flag persists state across calls
      pattern.lastIndex = 0
      return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    },
  })

  const targets: Text[] = []
  let cur: Node | null
  while ((cur = walker.nextNode())) targets.push(cur as Text)

  let firstMark: HTMLElement | null = null

  for (const textNode of targets) {
    const text = textNode.nodeValue ?? ''
    pattern.lastIndex = 0
    const parts = text.split(pattern)
    const frag = document.createDocumentFragment()
    for (const part of parts) {
      const matcher = new RegExp(`^(?:${pattern.source.slice(1, -1)})$`, 'i')
      if (matcher.test(part)) {
        const mark = document.createElement(HIGHLIGHT_TAG)
        mark.className = HIGHLIGHT_CLASS
        mark.textContent = part
        frag.appendChild(mark)
        if (!firstMark) firstMark = mark as HTMLElement
      } else if (part.length > 0) {
        frag.appendChild(document.createTextNode(part))
      }
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  }

  return firstMark
}

export function useQueryHighlight(containerRef: RefObject<HTMLElement>): void {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const pattern = buildPattern(query)
    clearHighlights(container)
    if (!pattern) return

    let scrolled = false
    let rafId = 0

    const run = () => {
      const first = applyHighlights(container, pattern)
      if (first && !scrolled) {
        scrolled = true
        first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    // Initial pass + debounced re-run on DOM mutations (lazy-loaded sections)
    run()

    let pending = false
    const observer = new MutationObserver(() => {
      if (pending) return
      pending = true
      rafId = requestAnimationFrame(() => {
        pending = false
        run()
      })
    })
    observer.observe(container, { childList: true, subtree: true, characterData: true })

    return () => {
      observer.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
      clearHighlights(container)
    }
  }, [containerRef, query])
}
