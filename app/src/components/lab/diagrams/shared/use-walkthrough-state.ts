/**
 * Reusable hook for walkthrough state management.
 * Provides play/pause, navigation, speed control, and keyboard handlers.
 */

import { useReducer, useEffect, useCallback } from 'react'

export interface WalkthroughState {
  frameIdx: number
  isPlaying: boolean
  speed: number
}

export type WalkthroughAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SEEK'; idx: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TICK' }
  | { type: 'RESET' }

interface UseWalkthroughStateOptions {
  totalFrames: number
  baseDuration?: number // ms between auto-advance ticks (default: 2000)
  initialSpeed?: number
}

function createReducer(totalFrames: number) {
  return function reducer(state: WalkthroughState, action: WalkthroughAction): WalkthroughState {
    switch (action.type) {
      case 'PLAY':
        return { ...state, isPlaying: true }
      case 'PAUSE':
        return { ...state, isPlaying: false }
      case 'NEXT':
        return {
          ...state,
          frameIdx: Math.min(state.frameIdx + 1, totalFrames - 1),
        }
      case 'PREV':
        return { ...state, frameIdx: Math.max(state.frameIdx - 1, 0) }
      case 'SEEK':
        return { ...state, frameIdx: Math.max(0, Math.min(action.idx, totalFrames - 1)) }
      case 'SET_SPEED':
        return { ...state, speed: action.speed }
      case 'TICK':
        if (state.frameIdx >= totalFrames - 1) {
          return { ...state, isPlaying: false }
        }
        return { ...state, frameIdx: state.frameIdx + 1 }
      case 'RESET':
        return { frameIdx: 0, isPlaying: false, speed: state.speed }
      default:
        return state
    }
  }
}

export function useWalkthroughState({
  totalFrames,
  baseDuration = 2000,
  initialSpeed = 1,
}: UseWalkthroughStateOptions) {
  const reducer = createReducer(totalFrames)
  const [state, dispatch] = useReducer(reducer, {
    frameIdx: 0,
    isPlaying: false,
    speed: initialSpeed,
  })

  // Auto-advance timer
  useEffect(() => {
    if (!state.isPlaying) return
    const id = setTimeout(
      () => dispatch({ type: 'TICK' }),
      baseDuration / state.speed
    )
    return () => clearTimeout(id)
  }, [state.isPlaying, state.frameIdx, state.speed, baseDuration])

  // Keyboard handlers
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const skipTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']
      if (skipTags.includes(target.tagName) || target.isContentEditable) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          dispatch({ type: 'PREV' })
          break
        case 'ArrowRight':
          e.preventDefault()
          dispatch({ type: 'NEXT' })
          break
        case ' ':
          e.preventDefault()
          dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' })
          break
      }
    },
    [state.isPlaying]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    state,
    dispatch,
    isFirst: state.frameIdx === 0,
    isLast: state.frameIdx === totalFrames - 1,
    totalFrames,
  }
}
