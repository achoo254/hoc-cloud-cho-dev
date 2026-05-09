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
import { MisconceptionsSection } from '../misconceptions-section'
import { PacketDecoder } from './shared/packet-decoder'
import { httpCapture } from './shared/sample-captures/http-capture'
import type { DiagramComponentProps } from './registry'

export function HttpPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <MisconceptionsSection items={lab.misconceptions} />
          <HttpConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">HTTP Protocol Animation</h3>
            <HttpVisualizer />
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-4">tcpdump capture — HTTP request/response</h3>
            <PacketDecoder defaultPackets={httpCapture} title="HTTP over TCP (sample capture)" />
          </section>
        </div>
      }
    />
  )
}
