/**
 * Reusable walkthrough player controls.
 * Includes: Reset, Prev, Play/Pause, Next, Speed selector, Export button.
 */

import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExportButton } from '../export-button'
import type { WalkthroughState, WalkthroughAction } from './use-walkthrough-state'

interface WalkthroughControlsProps {
  state: WalkthroughState
  dispatch: React.Dispatch<WalkthroughAction>
  totalFrames: number
  svgRef?: React.RefObject<SVGSVGElement>
  labSlug?: string
  showExport?: boolean
  speedOptions?: number[]
}

export function WalkthroughControls({
  state,
  dispatch,
  totalFrames,
  svgRef,
  labSlug = 'lab',
  showExport = true,
  speedOptions = [0.5, 1, 2],
}: WalkthroughControlsProps) {
  const isFirst = state.frameIdx === 0
  const isLast = state.frameIdx === totalFrames - 1

  return (
    <div className="space-y-4">
      {/* Timeline scrubber */}
      <div className="space-y-2">
        <input
          type="range"
          value={state.frameIdx}
          min={0}
          max={totalFrames - 1}
          step={1}
          onChange={(e) => dispatch({ type: 'SEEK', idx: Number(e.target.value) })}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          aria-label="Timeline"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {state.frameIdx + 1}</span>
          <span>{totalFrames} steps</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'RESET' })}
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'PREV' })}
          disabled={isFirst}
          aria-label="Previous step"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          onClick={() => dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' })}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'NEXT' })}
          disabled={isLast}
          aria-label="Next step"
        >
          <SkipForward className="w-4 h-4" />
        </Button>

        {/* Speed selector */}
        <div className="flex items-center gap-1 ml-4">
          {speedOptions.map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={state.speed === speed ? 'default' : 'ghost'}
              onClick={() => dispatch({ type: 'SET_SPEED', speed })}
              className="text-xs px-2"
            >
              {speed}x
            </Button>
          ))}
        </div>

        {/* Export button */}
        {showExport && svgRef && (
          <ExportButton
            svgRef={svgRef}
            labSlug={labSlug}
            frameIdx={state.frameIdx}
          />
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-center text-muted-foreground">
        ← → to navigate, Space to play/pause
      </p>
    </div>
  )
}
