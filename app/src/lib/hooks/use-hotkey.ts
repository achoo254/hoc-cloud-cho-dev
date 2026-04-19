/**
 * useHotkey — bind keyboard shortcuts with mod-key normalisation.
 * 'mod' maps to Ctrl on Windows/Linux and Cmd (Meta) on macOS.
 *
 * Ignores shortcuts when focus is inside <input>, <textarea>, or
 * [contenteditable] unless `ignoreInputs` is explicitly set to false.
 *
 * @example
 *   useHotkey(['mod+k'], () => setOpen(true))
 */

import { useEffect, useRef } from 'react'

type HotkeyHandler = (event: KeyboardEvent) => void

interface UseHotkeyOptions {
  /**
   * When true (default), the hotkey fires even when focus is in an input.
   * Set false to suppress while typing.
   */
  ignoreInputs?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const IS_MAC =
  typeof navigator !== 'undefined' &&
  /mac/i.test(navigator.platform)

interface ParsedHotkey {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

function parseHotkey(combo: string): ParsedHotkey {
  const parts = combo.toLowerCase().split('+')
  return {
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    // Last segment is the actual key
    key: parts[parts.length - 1] ?? '',
  }
}

function matchesHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean {
  const modPressed = IS_MAC ? event.metaKey : event.ctrlKey
  return (
    (!parsed.mod || modPressed) &&
    (!parsed.shift || event.shiftKey) &&
    (!parsed.alt || event.altKey) &&
    event.key.toLowerCase() === parsed.key
  )
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHotkey(
  combos: string[],
  handler: HotkeyHandler,
  options: UseHotkeyOptions = {},
): void {
  const { ignoreInputs = true } = options

  // Keep handler ref stable so we don't re-attach listener on every render
  const handlerRef = useRef<HotkeyHandler>(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  const parsedRef = useRef<ParsedHotkey[]>(combos.map(parseHotkey))
  useEffect(() => {
    parsedRef.current = combos.map(parseHotkey)
  }, [combos.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (ignoreInputs && isInputTarget(event.target)) return

      for (const parsed of parsedRef.current) {
        if (matchesHotkey(event, parsed)) {
          event.preventDefault()
          handlerRef.current(event)
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ignoreInputs])
}
