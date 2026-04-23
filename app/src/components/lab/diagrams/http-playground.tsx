/**
 * HTTP Interactive Playground
 * Uses shared PlaygroundShell for consistent THINK/SEE tabs pattern.
 *
 * THINK: HttpConceptCards (tldr items)
 * SEE: HttpVisualizer (request/response, status codes, HTTP versions, TLS)
 */

import { HttpConceptCards } from './http-concept-cards'
import { HttpVisualizer } from './http-visualizer'
import { PlaygroundShell } from './shared'
import type { DiagramComponentProps } from './registry'

export function HttpPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <HttpConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">HTTP Protocol Animation</h3>
            <HttpVisualizer />
          </section>
        </div>
      }
    />
  )
}
