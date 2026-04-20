/**
 * ErrorBoundary for diagram playground lazy loading.
 * RED TEAM #9: Catch ChunkLoadError → fallback to text renderer.
 */

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  hasError: boolean
}

export class PlaygroundErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      console.warn('[Playground] Chunk load failed, falling back to text renderer:', error.message)
    } else {
      console.error('[Playground] Unexpected render error:', error, info.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}
