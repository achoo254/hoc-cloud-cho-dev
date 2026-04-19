# Phase 05 — Sandbox mode + failure injection + persist

> **[RED TEAM #5] CUT FROM PILOT** — Sandbox là feature riêng biệt, thuộc plan v2 sau khi pilot validate learning hypothesis. Failure injection re-implement SEE layer interactive — text `failModes[]` hiện tại đã cover cho pilot. File giữ cho plan v2 với các fixes bắt buộc dưới đây.

**Priority:** P2 | **Effort:** 1d | **Status:** CUT (v2) | **Depends:** phase-03 (v2)

## Goal
User nhập IP/port/packet type + failure toggles → playground animate scenario tùy biến. Preset dropdown cho demo. Persist config vào localStorage.

## Related files
- `app/src/components/lab/diagrams/sandbox-controls.tsx` — NEW input form
- `app/src/components/lab/diagrams/sandbox-scenarios.ts` — NEW preset list + failure scenarios
- `app/src/components/lab/diagrams/journey-reducer.ts` — extend state cho sandbox
- `app/src/lib/hooks/use-persistent-state.ts` — NEW generic localStorage hook

## Sandbox config schema
```ts
const SandboxConfigSchema = z.object({
  preset: z.enum(['custom', 'curl-example', 'ping-8888', 'ssh-22']),
  sourceIp: z.string().regex(IPV4_REGEX),
  destIp: z.string().regex(IPV4_REGEX),
  destPort: z.number().int().min(1).max(65535),
  packetType: z.enum(['tcp-http', 'tcp-ssh', 'udp-dns', 'icmp-echo']),
  failures: z.object({
    dnsDown: z.boolean(),
    firewallBlockPort: z.boolean(),
    gatewayDown: z.boolean(),
    mtuMismatch: z.boolean(),
  }),
})
```

## Implementation steps
1. Build `sandbox-controls.tsx`: shadcn Form với input IP/port, Select preset, Switch cho failures, validate on-change qua Zod.
2. Preset chọn → populate inputs, user vẫn edit được (preset='custom' khi user edit).
3. `sandbox-scenarios.ts`: map (packetType, failures) → custom frames (reuse frame shape từ phase-03, chèn failure frame chỗ layer bị chặn).
4. `use-persistent-state.ts`: generic `useState` wrapper qua `localStorage`, key `sandbox:<lab-slug>`. SSR-safe (default value khi window undef).
5. Persist CHỈ `{ preset, sourceIp, destIp, destPort, packetType, failures }`. KHÔNG persist `frameIdx` / `isPlaying`.
6. "Run scenario" button → generate frames từ config → inject vào reducer, play từ frame 0.
7. "Reset sandbox" button → clear localStorage + reset form về default preset.
8. Failure animation: packet chuyển màu đỏ, dừng ở layer chết, overlay tooltip `"DNS fail — see failModes[0]"` link tới walkthrough step tương ứng.

## Acceptance criteria
- Zod validate reject invalid IP/port với error message.
- Preset dropdown populate inputs đúng.
- Toggle failure → animation dừng đúng layer.
- localStorage persist qua reload.
- Reset button clear state.
- No XSS: IP/port hiển thị escaped (React auto-escape, không dangerouslySetInnerHTML).

## Risks
- Preset list lệch content fixture → hardcode 4 preset là đủ cho pilot.
- Sandbox state conflict với Story mode → reducer có `mode: 'story' | 'step' | 'sandbox'` phân biệt.

## [RED TEAM] Required changes khi restore trong v2

### #1 — Discriminated union cho packetType (ICMP không có port)
Pilot lab là **ICMP ping + DNS**, không phải TCP/HTTP. Schema sai về mặt giáo dục.
```ts
const SandboxConfigSchema = z.discriminatedUnion('packetType', [
  z.object({ packetType: z.literal('icmp-echo'), sourceIp: IPv4, destIp: IPv4 }),
  z.object({ packetType: z.literal('udp-dns'),   sourceIp: IPv4, dnsServerIp: IPv4 }),
  z.object({ packetType: z.literal('tcp-http'),  sourceIp: IPv4, destIp: IPv4, destPort: Port }),
  z.object({ packetType: z.literal('tcp-ssh'),   sourceIp: IPv4, destIp: IPv4, destPort: Port }),
])
```
UI conditional: hide `destPort` input khi `packetType === 'icmp-echo'`.

### #8 — localStorage: Zod revalidate + version + try/catch
Step 4 sửa `use-persistent-state.ts`:
```ts
function hydrate<T>(key: string, schema: z.ZodSchema<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (parsed._v !== CURRENT_SCHEMA_VERSION) return fallback  // migration point
    const result = schema.safeParse(parsed)
    if (!result.success) { localStorage.removeItem(key); return fallback }
    return result.data
  } catch { return fallback }  // Safari private, quota, SyntaxError
}

function persist<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify({ _v: CURRENT_SCHEMA_VERSION, ...value })) }
  catch { /* quota exceeded, storage disabled — in-memory only */ }
}
```
Bỏ note "SSR-safe" (SPA-only, không cần).
Acceptance thêm: "corrupt localStorage / quota exceeded → graceful fallback, no crash".

### #4 (preview) — Nếu sandbox output feed vào export (phase-06), sanitize string fields trước render SVG `<text>`.
