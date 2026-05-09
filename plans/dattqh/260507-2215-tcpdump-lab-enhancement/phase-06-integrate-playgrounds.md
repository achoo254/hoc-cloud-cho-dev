---
phase: 6
status: completed
priority: high
estimated_hours: 0.5
depends_on: [3, 4, 5]
---

# Phase 06 — Integrate vào 2 Playground

## Goal

Thêm `<PacketDecoder/>` vào SEE section của `icmp-ping-playground` và `http-playground` mà KHÔNG sửa `registry.ts` / `lab-model.js` / schema.

## Files Modified

- `app/src/components/lab/diagrams/icmp-ping-playground.tsx`
- `app/src/components/lab/diagrams/http-playground.tsx`

## Changes — `icmp-ping-playground.tsx`

```tsx
import { IcmpPingConceptCards } from './icmp-ping-concept-cards'
import { IcmpPingVisualizer } from './icmp-ping-visualizer'
import { PlaygroundShell } from './shared'
import { MisconceptionsSection } from '../misconceptions-section'
import { PacketDecoder } from './shared/packet-decoder'                      // NEW
import { icmpPingCapture } from './shared/sample-captures/icmp-ping-capture' // NEW
import type { DiagramComponentProps } from './registry'

export function IcmpPingPlayground({ lab, seeExtraContent, tryItContent }: DiagramComponentProps) {
  return (
    <PlaygroundShell
      seeExtraContent={seeExtraContent}
      tryItContent={tryItContent}
      thinkContent={
        <div className="space-y-8">
          <MisconceptionsSection items={lab.misconceptions} />
          <IcmpPingConceptCards items={lab.tldr} />
        </div>
      }
      seeContent={
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">ICMP Ping & Traceroute Animation</h3>
            <IcmpPingVisualizer />
          </section>
          {/* NEW */}
          <section>
            <h3 className="text-lg font-semibold mb-4">tcpdump capture — ICMP echo</h3>
            <PacketDecoder defaultPackets={icmpPingCapture} />
          </section>
        </div>
      }
    />
  )
}
```

## Changes — `http-playground.tsx`

Tương tự, thêm section sau visualizer hiện có:
```tsx
<section>
  <h3 className="text-lg font-semibold mb-4">tcpdump capture — HTTP request/response</h3>
  <PacketDecoder defaultPackets={httpCapture} />
</section>
```

## Implementation Steps

1. Read current `icmp-ping-playground.tsx` và `http-playground.tsx` để xác nhận structure
2. Apply edit: thêm imports + section
3. Verify lazy loading vẫn work (PacketDecoder import direct OK vì playground đã được lazy-load qua registry)
4. Run dev server, navigate đến lab `icmp-ping`, click tab SEE → verify decoder render
5. Same với lab `http`

## Success Criteria

- [ ] Playground render PacketDecoder dưới existing visualizer
- [ ] Click packet/field → highlight bytes work
- [ ] Tab Upload .pcap accept file thật
- [ ] Không break visualizer cũ
- [ ] Bundle size tăng < 30 KB (sample captures hardcoded byte arrays nhẹ)

## Risks

- Bundle size phình do hardcode bytes → check `pnpm --dir app run build` size diff
- Conflict với responsive của visualizer cũ → test 375px
