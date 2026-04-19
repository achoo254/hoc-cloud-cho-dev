/**
 * use-reduced-motion-preference.ts
 *
 * Re-exports Framer Motion's useReducedMotion as the project-canonical hook.
 * All components MUST import from here instead of framer-motion directly so
 * that future swaps (e.g. custom MediaQuery impl) stay in one place.
 *
 * Returns `true` when the OS has "Reduce motion" enabled, `false` otherwise.
 * When `true`, components should skip transforms (y, scale, rotateY) but may
 * keep simple opacity fades for accessibility-compliant feedback.
 */
export { useReducedMotion as useReducedMotionPreference } from 'framer-motion'
