---
title: Red Team Review — Interactive THINK/SEE Playground
date: 2026-04-19
plan: plans/dattqh/260419-2315-interactive-think-see-playground/plan.md
reviewers: [security-adversary, failure-mode-analyst, assumption-destroyer, scope-complexity-critic]
raw_findings: 38
cap: 15
---

# Red Team — 15 findings (cap)

Severity: 4 Critical · 8 High · 3 Medium

| # | Finding | Severity | Lens | Target |
|---|---------|---------:|------|--------|
| 1 | Walkthrough lab là ICMP+DNS, schema lại giả định TCP/HTTP + port | Critical | Assumption | phase-05, plan.md success |
| 2 | Success criteria chỉ đo shipping, không đo learning → pilot không thể pass/fail | Critical | Scope | plan.md |
| 3 | Story-mode setTimeout không cleanup + animation race scrub/play | Critical | Failure | phase-03, phase-04 |
| 4 | SVG export serialize DOM không sanitize → stored XSS qua file chia sẻ | Critical | Security | phase-06 |
| 5 | 3 modes (story/step/sandbox) là scope creep cho pilot | High | Scope | plan.md phases |
| 6 | Schema discriminatedUnion 4 variants khi 3 out-of-scope = premature abstraction | High | Scope | phase-01 |
| 7 | PNG export cluster: tainted canvas, CSS vars chưa resolve, capture không atomic | High | Security+Failure | phase-06 |
| 8 | localStorage thiếu Zod revalidate + schema version + try/catch quota | High | Security+Failure | phase-05 |
| 9 | Lazy-load không có ErrorBoundary → ChunkLoadError trắng trang | High | Failure | phase-01 |
| 10 | Frame-mapper heuristic fragile + mâu thuẫn với hardcoded (step 0/7 fall through) | High | Failure+Assumption | phase-03 |
| 11 | Effort 4-6d zero buffer, không có spike D3×Framer | High | Assumption | plan.md |
| 12 | Không có feature flag / kill switch → rollback = rebuild+redeploy | High | Failure | plan.md |
| 13 | Không có regression test cho 7 labs khác — smoke test manual | High | Assumption | phase-07 |
| 14 | Desktop-only vẫn phải build media-query + branching = 0 net save | Medium | Scope+Failure | phase-01 |
| 15 | D3×Framer "strict separation" không có enforcement (ESLint/test) | Medium | Assumption | plan.md risks |

---

## Findings — chi tiết + disposition

### 1 · Walkthrough ICMP mismatch — Critical — **Accept**
**Lens:** Assumption Destroyer
**Location:** plan.md success criteria · phase-05 `SandboxConfigSchema`
**Flaw:** Pilot lab `tcp-ip-packet-journey` thực sự xoay quanh **DNS + ICMP ping** (walkthrough 8 steps, step 1 nói thẳng "ICMP không có port"). Sandbox schema lại ép required `destPort` + packetTypes TCP-centric. Mâu thuẫn nội dung giáo dục của chính lab.
**Failure scenario:** User chọn preset `ping-8888` → UI vẫn force `destPort` input → lab dạy "ICMP không có port" nhưng UI đòi port → credibility vỡ.
**Fix:** Zod `z.discriminatedUnion('packetType', [...])`:
- `icmp-echo`: `{ sourceIp, destIp }` — không port
- `udp-dns`: `{ sourceIp, dnsServerIp }`
- `tcp-http|tcp-ssh`: `{ sourceIp, destIp, destPort }`
Success criteria sửa: "Story mode render 8 frames khớp walkthrough[] của tcp-ip-packet-journey" (không "100% generic").

### 2 · Success criteria không đo learning — Critical — **Accept**
**Lens:** Scope Critic
**Location:** plan.md "Success criteria"
**Flaw:** 7/7 criteria binary-shipping (render, lazy-load, file mở được). 0 criteria đo learning outcome. Pilot là để quyết định rollout 6 labs còn lại — decision đó cần user signal, không phải "PNG mở được".
**Failure scenario:** Ship 6d → stakeholder hỏi "rollout tiếp?" → zero data → rollout blind (36d risk) hoặc bỏ 6d.
**Fix:** Thêm vào plan.md section **Learning hypothesis & kill criteria**:
- Hypothesis: ví dụ "session completion rate tăng ≥20% vs text baseline"
- Instrumentation: track `story_play`, `story_complete`, `sandbox_run`, `drill_down_open`, time-on-lab
- Kill criterion: "story mode usage < 50% sessions trong 2 tuần → không rollout"
Đồng thuận với stakeholder TRƯỚC khi code.

### 3 · Timer cleanup + animation race — Critical — **Accept**
**Lens:** Failure Mode
**Location:** phase-03 step 5 · phase-04 step 2-3
**Flaw:** (a) `useEffect setTimeout → TICK` không return `clearTimeout`; unmount / pause / seek → timer cũ vẫn fire → double-advance + memory leak. (b) Framer `animate` async, scrub nhanh / mash ← → trước khi animation complete → packet teleport, narration vs visual lệch.
**Failure scenario:** Play → scrub về frame 5 → timer cũ fire → nhảy frame 6. Mash → slider value + global Next handler double-seek.
**Fix:** 
- Mỗi effect `return () => clearTimeout(id)`; reducer SEEK/PAUSE/NEXT cancel pending tick.
- Monotonic `animationId` trong reducer; Framer `onAnimationComplete` compare id trước commit.
- Scrub = instant teleport (`transition: { duration: 0 }`), play = animated.
- Global keydown check `event.target !== input|slider|[role=dialog]`, hoặc scope listener bằng ref.
Test: unmount-mid-play không warning; spam Next 10 lần không overshoot.

### 4 · SVG export XSS via serialization — Critical — **Accept**
**Lens:** Security Adversary
**Location:** phase-06 steps 1-3
**Flaw:** `XMLSerializer` snapshot `svgRef.current` → Blob. Sandbox input (IP, port, preset labels) có thể lọt vào `<text>` / `xlink:href` / inline `<style>`. React auto-escape không cover serialized SVG artifact. User share file → mở trong browser execute script.
**Failure scenario:** Sandbox preset label bị poisoning, user share `.svg` qua forum → victim mở → XSS trong file:// hoặc origin context.
**Fix:** DOMPurify `{ USE_PROFILES: { svg: true, svgFilters: true } }` trước khi tạo Blob. Strip `<script>`, `on*`, `javascript:` URLs, external `<image href>`. Acceptance: export SVG với hostile-payload fixture → sanitizer roundtrip pass.

### 5 · 3 modes = scope creep cho pilot — High — **Accept**
**Lens:** Scope Critic
**Location:** plan.md phases · phase-04 · phase-05
**Flaw:** Pilot = validate "interactive có tăng hiểu bài không?". Story mode đủ trả lời. Step mode ~duplicate story (cùng reducer/frames, chỉ khác auto-tick). Sandbox là feature riêng biệt, thuộc plan v2 sau khi pilot validate.
**Failure scenario:** Ship 3 modes, analytics chỉ thấy Story được dùng → Step+Sandbox dead code.
**Fix:** 
- **Pilot = Story mode only**. Step mode = thêm `← →` Space trong Story (30 phút trong phase-03), không riêng phase.
- Sandbox (phase-05) **cắt khỏi pilot**, đưa vào plan v2.
- Effort giảm từ 4-6d → 2.5-3d.

### 6 · Schema 4 variants premature abstraction — High — **Accept**
**Lens:** Scope Critic
**Location:** phase-01 `DiagramSchema`
**Flaw:** Plan tự declare 3 variants (`layer-stack`/`sequence`/`bit-mask`) out-of-scope nhưng vẫn scaffold schema với `config: z.record(z.unknown())`. Zero type-safety runtime, 100% guess về shape.
**Failure scenario:** 6 tháng sau implement `sequence` thực tế, phát hiện shape sai → schema migration hoặc v2 discriminatedUnion → fixture churn.
**Fix:** Chỉ 1 variant `{ type: 'custom', component: z.enum([...registryKeys]) }`. Extend union khi thực sự có primitive thứ 2.

### 7 · PNG export cluster — High — **Accept (downgrade scope)**
**Lens:** Security + Failure
**Location:** phase-06 toàn bộ
**Flaw:** 
- Tainted canvas khi SVG ref external fonts / `<img>` icons → `toBlob` null hoặc SecurityError
- Shadcn dùng CSS vars `hsl(var(--primary))` — serialize SVG không resolve → màu đen/trong suốt
- `foreignObject` cấm → HTML-based chip/tooltip rỗng trong export
- Capture không atomic: `Image.onload` async, Framer pending RAF có thể đổi DOM giữa serialize và draw → packet position lệch
- Canvas size > 4096px trên iOS Safari → null
**Fix option A (recommend):** **Cắt phase-06 khỏi pilot** (gold plating, browser screenshot đủ dùng, không phục vụ learning validation).
**Fix option B (nếu keep):** Chỉ giữ SVG export đơn giản (1 call `XMLSerializer` + DOMPurify + Blob). Bỏ PNG. Trước serialize: dispatch SEEK tới frameIdx với `duration: 0`, await RAF, inline computed styles (resolve CSS vars), strip external `<image>`.

### 8 · localStorage persistence gaps — High — **Accept**
**Lens:** Security + Failure + Assumption (merged)
**Location:** phase-05 step 4-5 `use-persistent-state.ts`
**Flaw:** 
- Không re-validate Zod khi hydrate → attacker có XSS bất kỳ ở origin seed malicious payload → persistent XSS
- Thiếu `_v: N` schema version → breaking change → user mất config hoặc crash
- Thiếu try/catch: Safari private mode throws `QuotaExceededError`, iOS ITP 7-day expiry, user disable storage → SecurityError, corrupt JSON → SyntaxError
- "SSR-safe" là cargo-cult (app là Vite SPA, không SSR)
**Fix:**
```ts
// on hydrate
const raw = safeGetItem(key);              // try/catch
const parsed = safeJsonParse(raw);         // try/catch
const result = SandboxConfigSchema.safeParse({ _v: 1, ...parsed });
if (!result.success) { removeItem(key); return DEFAULT; }
```
Acceptance: corrupt localStorage → graceful fallback, no crash. Xóa "SSR-safe" references (SPA only).

### 9 · Lazy-load không có ErrorBoundary — High — **Accept**
**Lens:** Failure Mode
**Location:** phase-01 step 4 `<Suspense>` wrap
**Flaw:** Suspense handle loading, KHÔNG handle error. Deploy mới invalidate chunk hash khi user tab đang mở → `ChunkLoadError` → blank screen. Không có retry, không fallback về text renderer.
**Failure scenario:** Deploy 14:00, user mở lab 14:05 với index.html cached 13:55 → fetch `.[oldhash].js` 404 → unhandled rejection → trắng trang.
**Fix:** Wrap Suspense trong ErrorBoundary → on chunk error fallback về text `LabRenderer` (component đã tồn tại) + retry-on-reload. Acceptance: mock chunk 404 → text renderer hiện.

### 10 · Frame-mapper heuristic fragile + mâu thuẫn — High — **Accept**
**Lens:** Failure + Assumption
**Location:** phase-03 "Frame mapping" + Risks
**Flaw:** Plan đồng thời nói (a) "hardcoded mapping cho tcp-ip-packet-journey (~8-10 frames)" và (b) "Heuristic detect device/layer từ `step.what` keywords" — hai cách mâu thuẫn. Heuristic sẽ miss: step 0 DNS (entity thứ 4, không phải client/router/server), step 4 multi-hop router, step 7 comparison question (không phải frame).
**Fix:** Bỏ heuristic hoàn toàn. Hardcode 8 Frame objects theo step index. Bổ sung fixture schema optional field `frameHints?: Array<{device, layer, protocol}>` cho dùng về sau. CI test: `frames.length === lab.walkthrough.length`, fail build nếu miss.

### 11 · Effort 4-6d ảo tưởng — High — **Accept**
**Lens:** Assumption Destroyer
**Location:** plan.md `effort: 4-6d`
**Flaw:** Cộng effort các phase = 5.5d → sát trần với zero buffer cho: debug D3×Framer (team chưa có prior art?), 7-lab regression test, Lighthouse a11y, Safari polyfill, keyboard focus trap.
**Fix:** Sau khi cắt scope (finding #5, #7): effort realistic **3-3.5d** cho pilot (story + layer-stack + a11y-min). Thêm **0.5d spike** upfront: "D3×Framer POC — 1 sample frame animated với layout" để validate tích hợp trước khi commit 7 phases.

### 12 · Không có feature flag / kill switch — High — **Accept**
**Lens:** Failure Mode
**Location:** plan.md risks
**Flaw:** Playground activate qua fixture field `diagram.component`, build-time baked. Prod phát hiện bug → commit revert → rebuild → redeploy VPS. Outage = deploy time.
**Failure scenario:** Release 17:00 thứ Sáu, user báo crash → dev off → lab hỏng cả weekend.
**Fix:** Env flag `VITE_ENABLE_DIAGRAM_PLAYGROUND` (default `true`). `LabRenderer` check flag; false → text renderer. Override per-URL `?textMode=1` cho user tự bypass. Nginx deploy config-only không cần rebuild.

### 13 · Không có automated regression test — High — **Accept**
**Lens:** Assumption Destroyer
**Location:** phase-07 "Smoke test checklist"
**Flaw:** Manual checklist không đủ. `LabRenderer` branch logic mới áp dụng cho TẤT CẢ 8 labs. Lazy Suspense có thể swallow error và silently fallback.
**Fix:** Vitest snapshot test trong phase-07 (hoặc sớm hơn phase-01):
- Render mỗi lab fixture với `window.matchMedia` stub (desktop + mobile)
- Assert `tcp-ip-packet-journey` desktop → calls lazy playground
- Assert 7 labs khác → render `<WalkthroughSection>` text
Blocker cho phase-01 acceptance.

### 14 · Desktop-only decision không cắt effort — Medium — **Accept**
**Lens:** Scope + Failure
**Location:** phase-01 step 2 + 4
**Flaw:** "Desktop only" vẫn phải build `use-media-query` hook + responsive switch + mobile fallback path + smoke test 2 viewports. User resize qua 768px → unmount playground, mất state, timer leak. iPad mini portrait = mobile, landscape = desktop → confusion.
**Fix lựa chọn 1 (prefer):** Desktop-only UP-FRONT: render playground bằng `@media (min-width: 768px) { display: block } @media (max-width: 767px) { fallback text div }` — CSS-only, single path. Bỏ `useMediaQuery` hook.
**Fix lựa chọn 2:** Đọc `window.innerWidth < 768` sync tại module init (SPA, `window` luôn defined), hysteresis 300ms resize. Preserve `frameIdx` qua sessionStorage.

### 15 · D3×Framer "strict separation" không enforcement — Medium — **Accept**
**Lens:** Assumption Destroyer
**Location:** plan.md risks
**Flaw:** Rule chỉ là text. Không ESLint, không test, không review checklist. Phase-02 drag-to-encap dùng D3 scale + Framer transform — điểm va chạm.
**Fix:** Viết `diagrams/layout/scales.ts` chỉ export pure functions (`getLayerY(idx, h)`, `getDeviceX(idx, w)`). ESLint rule:
```json
"no-restricted-imports": { "patterns": ["d3-selection", "d3"] }
```
trong `app/src/diagrams/**`. Document trong `docs/code-standards.md`. Alternative (finding từ Scope #6): **bỏ D3 hoàn toàn**, thay bằng arithmetic 4 dòng — zero conflict.

---

## Unresolved questions (cần user quyết trước khi apply)

1. **Learning hypothesis + kill criteria** — đã align với stakeholder chưa?
2. **Zod đã có trong `app/package.json` chưa?** — nếu có → giữ; chưa có → cân nhắc plain JS validation cho sandbox (nếu không cắt sandbox).
3. **Có analytics/tracking infra sẵn không?** — instrumentation cho finding #2 cần pipeline.
4. **Pilot mode quyết định:** full plan hay cắt về story-only (finding #5 + #7)? Ảnh hưởng effort từ 4-6d → 2.5-3d.
5. **CSP hiện tại ở nginx/vite level** — có enforce không? Ảnh hưởng finding #4 + PNG/SVG export.
6. **Team có prior D3×Framer experience không?** — nếu chưa, bắt buộc spike 0.5d (finding #11).

---

**Rejected (trimmed to stay at cap 15):**
- IPv4 regex gaps (Security#3) — không ship URL-share, low impact pilot
- Supply chain no version pin (Security#5) — project-wide concern, không đặc thù plan này
- CSP missing (Security#6) — nằm ở finding #4 + deployment, gom vào unresolved Q5
- Registry key trust (Security#7) — finding #6 đã fix qua `z.enum(registryKeys)`
- Preset/URL hydration bypass (Security#8) — không có URL-share trong scope
- Zod overkill (Scope#4) — phụ thuộc phase-05 có cắt không (finding #5)
- Failure injection (Scope#5) — cắt theo finding #5
- D3 + Framer cả hai (Scope#6) — gom vào finding #15 alt
- A11y polish (Scope#7) — policy call, giữ minimum
- Reuse ratio 0 (Scope#10) — gom vào finding #11 effort/spike
- Bundle gate (Failure#10) — gom vào effort/acceptance criteria
- Keyboard conflict (Failure#9) — gom vào finding #3
- Drag-to-encap underspec (Assumption#7) — defer vào phase-02 implementation review
