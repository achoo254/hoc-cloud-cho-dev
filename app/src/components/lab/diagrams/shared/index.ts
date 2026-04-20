/**
 * Shared components for lab diagram playgrounds.
 * Import from this barrel file for consistent playground development.
 *
 * Usage:
 * import {
 *   useWalkthroughState,
 *   WalkthroughControls,
 *   NarrationPanel,
 *   ConceptCardList,
 *   PlaygroundShell,
 * } from './shared'
 */

// State management
export { useWalkthroughState } from './use-walkthrough-state'
export type {
  WalkthroughState,
  WalkthroughAction,
} from './use-walkthrough-state'

// UI Components
export { WalkthroughControls } from './walkthrough-controls'
export { NarrationPanel } from './narration-panel'
export type { NarrationContent } from './narration-panel'
export { ConceptCardList } from './concept-card-list'
export type { ConceptItem, ConceptColorScheme } from './concept-card-list'
export { PlaygroundShell } from './playground-shell'
