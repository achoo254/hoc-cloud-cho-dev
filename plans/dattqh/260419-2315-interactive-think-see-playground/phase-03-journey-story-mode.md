# Phase 03 — Packet Journey story mode (SEE)

**Priority:** P1 | **Effort:** 1.5d | **Status:** ✅ complete | **Depends:** phase-02

## Goal
Canvas 2 cột (client ↔ routers ↔ server) với 4 layer slots mỗi device. Timeline scrubber auto-play theo `walkthrough[]`.

## Related files
- `app/src/components/lab/diagrams/packet-journey.tsx` — NEW main simulator
- `app/src/components/lab/diagrams/device-node.tsx` — NEW, device + 4 layer slots
- `app/src/components/lab/diagrams/journey-reducer.ts` — NEW, `useReducer` frame state
- `app/src/components/lab/diagrams/frame-mapper.ts` — NEW, derive frames từ `walkthrough[]`

## Frame mapping
Mỗi `walkthrough[i]` → 1 frame với:
```ts
type Frame = {
  stepIdx: number
  narration: { what: string; why: string }
  packetPath: Array<{ device: 'client' | 'router' | 'server'; layer: 1|2|3|4 }>
  highlight: { protocol?: string; device?: string }
  code?: string
  observeWith?: string
}
```
Heuristic tự detect device/layer dựa trên `step.what` keywords (DNS, ARP, routing, ICMP echo, reply) — hardcode cho pilot lab, YAGNI generic.

## Implementation steps
1. `frame-mapper.ts`: hardcoded mapping `walkthrough[i] → Frame` cho tcp-ip-packet-journey (~8-10 frames).
2. `journey-reducer.ts`: state = `{ frameIdx, isPlaying, speed }`. Actions: `PLAY`, `PAUSE`, `NEXT`, `PREV`, `SEEK`, `SET_SPEED`, `TICK`.
3. `device-node.tsx`: 3 devices rendered bằng D3 `scaleLinear` (x position), mỗi node 4 layer slots (reuse layer-stack từ phase-02 ở dạng compact).
4. `packet-journey.tsx`:
   - Top: narration panel (from current frame).
   - Middle: canvas với devices + animated packet dot.
   - Bottom: timeline scrubber (shadcn Slider) + play/pause button.
   - Packet animated qua `packetPath` dùng Framer Motion `animate` prop với `transition.duration = baseDuration / speed`.
5. Auto-advance khi `isPlaying`: `useEffect` setTimeout → `TICK` → next frame. Stop khi hết.
6. Default speed 1x, expose 0.5x / 1x / 2x speed buttons.
7. Story mode là default tab trong playground. Phase 04 thêm Step tab.

## Acceptance criteria
- Scrubber đi từ frame 0 → cuối khớp `walkthrough.length`.
- Narration panel update đúng step khi scrub.
- Packet path animate qua đúng devices + layers.
- Play → chạy từ current tới hết, pause giữ state.
- Speed button đổi tốc độ animation.

## Risks
- Frame mapping: **hardcode** 8 Frame objects theo step index — không dùng heuristic (xem [RED TEAM #10]).
- Timing drift khi scrub nhanh → animation token pattern (xem [RED TEAM #3]).

## [RED TEAM] Required changes

### #10 — Bỏ heuristic, hardcode frames
Step 1 sửa lại:
```ts
// frame-mapper.ts — hardcoded, không heuristic keywords
export const TCP_IP_FRAMES: Frame[] = [
  { stepIdx: 0, narration: {...}, packetPath: [{ device: 'client', layer: 4 }, { device: 'dnsServer', layer: 4 }], ... },
  // ... 8 frames tổng, mỗi frame map 1-1 step index
  { stepIdx: 7, narration: {...}, packetPath: [], /* comparison question — narration-only */ },
]
```
- Step 0 DNS: thêm entity `dnsServer` (thứ 4), không gượng ép vào client/router/server.
- Step 7 (comparison question): narration-only, không animate.
- CI test: `frames.length === lab.walkthrough.length`, fail build nếu miss.

### #3 — Timer cleanup + animation token (CRITICAL)
Step 5 sửa lại:
```ts
// journey-reducer.ts — add monotonic animationId
state = { frameIdx, isPlaying, speed, animationId }

// trong component: useEffect auto-advance
useEffect(() => {
  if (!isPlaying) return
  const id = setTimeout(() => dispatch({ type: 'TICK' }), baseDuration / speed)
  return () => clearTimeout(id)  // CRITICAL
}, [isPlaying, frameIdx, speed])

// Framer animation guard
<motion.circle
  animate={...}
  onAnimationComplete={() => {
    if (currentAnimationId === latestAnimationIdRef.current) commit()
  }}
/>
```
- SEEK/PAUSE/NEXT/PREV dispatch đều bump `animationId` → animation cũ chết lặng.
- Scrub = instant teleport (`transition: { duration: 0 }`), play = animated.
- Unit test: unmount-mid-play không "setState on unmounted" warning.

### Step mode absorbed here ([RED TEAM #5])
Thêm keyboard handlers trong story mode:
- `← →` = dispatch PREV/NEXT (scope: check `event.target` không phải input/slider/[role=dialog]).
- `Space` = toggle PLAY/PAUSE.
Không cần tab switcher — story mode đã có scrubber + Next/Prev buttons.

### ~~Analytics tracking~~ (CẮT — Validation S2)
Self-learning repo, không user base. Không instrumentation.
