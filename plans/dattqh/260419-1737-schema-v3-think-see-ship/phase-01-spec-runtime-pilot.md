# Phase 01 — Spec + Runtime + Validator + Pilot ICMP

**Status:** completed | **Effort:** 6h | **Actual:** 4.5h | **Priority:** P1

## Goal

Viết spec v3, update runtime renderer + CSS, **tạo validator script**, migrate ICMP lab làm pilot. Verify UX + validator trước khi rollout 7 labs.

## Files

### Create
- `docs/lab-schema-v3.md` — spec đầy đủ + ví dụ JSON
- `scripts/validate-lab-schema.js` — Node script, đọc `labs/**/*.html`, extract `<script id="lab-data">`, parse JSON, check mandatory keys. Exit ≠ 0 nếu thiếu/rỗng. Dùng cho CI + pre-commit.

### Modify
- `labs/_shared/lab-template.js` — thêm renderer cho FAIL, FIX, AUTOMATE; promote misconceptions sang mandatory warn
- `labs/_shared/lab-template.css` — 3 callout style mới (.callout-fail, .callout-fix, .callout-automate)
- `labs/01-networking/04-icmp-ping.html` — pilot, thêm 4 sections content

## Steps

### 1. Spec `docs/lab-schema-v3.md`

Sections:
- Mục đích + mnemonic THINK/SEE/SHIP/OUTPUT
- Field reference table (key, type, mandatory?, group, render order)
- JSON template example (full + minimal)
- Migration v2→v3 mapping
- Validation rules (warn vs error)

### 2. Runtime `labs/_shared/lab-template.js`

Tham chiếu v2 code lines 192-510. Thêm:

```js
// Validation (mandatory check)
const V3_MANDATORY = ['why', 'whyBreaks', 'observeWith', 'deploymentUse'];
const V3_MANDATORY_TOP = ['misconceptions', 'tldr', 'quiz', 'flashcards', 'tryAtHome'];

// Render new callouts
function renderFailCallout(failModes) {
  if (!Array.isArray(failModes) || !failModes.length) return null;
  // [{ symptom, evidence }] → bullet list
}
function renderFixCallout(fixSteps) {
  if (!Array.isArray(fixSteps) || !fixSteps.length) return null;
  // [{ step, command? }] → ordered list, command in <code>
}
function renderAutomateCallout(automate) {
  if (!automate || !automate.code) return null;
  // { lang, code, note? } → <pre><code class="lang-{lang}">
}

// Wire vào renderTLDR + renderWalkthrough + renderTryAtHome
// Thứ tự callout per row: BREAKS → FAIL → FIX → OBSERVE → AUTOMATE → DEPLOY
```

### 3. CSS `labs/_shared/lab-template.css`

3 callout class mới, style theo pattern v2 (giống .callout-breaks, .callout-observe):

```css
.callout-fail     { border-left: 3px solid var(--danger); background: var(--danger-bg); }
.callout-fail::before { content: "⚠ FAIL "; font-weight: 700; }

.callout-fix      { border-left: 3px solid var(--success); background: var(--success-bg); }
.callout-fix::before  { content: "🔧 FIX "; font-weight: 700; }

.callout-automate { border-left: 3px solid var(--accent); background: var(--accent-bg); }
.callout-automate::before { content: "⚙ AUTOMATE "; font-weight: 700; }
```

Reuse design tokens hiện có (var(--danger), var(--success), var(--accent)).

### 4. Pilot ICMP `labs/01-networking/04-icmp-ping.html`

Thêm vào `<script id="lab-data">`:

```json
{
  "misconceptions": [
    { "myth": "ping đo speed", "reality": "ping đo RTT (round-trip time), bao gồm queue + processing delay" },
    { "myth": "block ICMP = secure", "reality": "block toàn bộ ICMP làm vỡ Path MTU Discovery, traceroute, error reporting" }
  ],
  "walkthrough": [
    {
      "section": "...",
      "why": "...",
      "whyBreaks": "...",
      "observeWith": "tcpdump -n icmp",
      "failModes": [
        { "symptom": "Connection reset / hang", "evidence": "Log nginx: 'upstream timed out' khi ICMP type 3 code 4 bị block" }
      ],
      "fixSteps": [
        { "step": "Allow ICMP type 3 (Destination Unreachable) trên firewall", "command": "iptables -A INPUT -p icmp --icmp-type 3 -j ACCEPT" }
      ],
      "automateScript": {
        "lang": "bash",
        "code": "#!/bin/bash\nLOSS=$(ping -c 100 8.8.8.8 | grep -oP '\\d+(?=% packet loss)')\n[ \"$LOSS\" -gt 5 ] && echo \"ALERT: $LOSS% loss\"",
        "note": "Cron mỗi 5 phút → alert nếu loss>5%"
      },
      "deploymentUse": "..."
    }
  ]
}
```

### 5. Validator `scripts/validate-lab-schema.js`

Node script standalone (no deps ngoài builtin). Logic:

```js
// 1. Glob labs/**/*.html
// 2. Mỗi file: extract <script id="lab-data">...</script> bằng regex
// 3. JSON.parse content
// 4. Check mandatory (top-level + per-walkthrough-row):
//    TOP: misconceptions[], tldr, quiz[], flashcards[], tryAtHome
//    ROW: why, whyBreaks, observeWith, deploymentUse
// 5. Rỗng = vi phạm (empty string, [], {})
// 6. Log errors → stderr, exit(1) nếu có lỗi; exit(0) nếu pass
```

Wire vào `package.json`:
```json
"scripts": { "validate:schema": "node scripts/validate-lab-schema.js" }
```

**Negative test:** tạm xoá 1 field mandatory khỏi ICMP → chạy validator → phải exit 1 với message rõ file/field. Revert sau.

### 6. Smoke pilot

```bash
npm run dev
# Mở http://localhost:3000/01-networking/04-icmp-ping.html
```

Check:
- 4 callout mới render đúng style
- Section thiếu (vd 1 row không có failModes) → KHÔNG render callout
- Console không error
- Misconceptions block render trên đầu (đã có v2)

## Acceptance — Pilot Binary Checklist

**Tất cả mục phải ✅ trước khi mở Phase 02. Fail bất kỳ mục nào → fix, không negotiate.**

### Spec & runtime
- [x] `docs/lab-schema-v3.md` tồn tại, ≥150 dòng spec đầy đủ
- [x] `lab-template.js` có 3 renderer mới (FAIL/FIX/AUTOMATE) + warn mandatory
- [x] `lab-template.css` có 3 callout class mới, reuse design tokens

### Validator
- [x] `scripts/validate-lab-schema.js` tồn tại, chạy `npm run validate:schema` exit 0 trên ICMP hoàn chỉnh
- [x] **Negative test:** xoá 1 mandatory field → validator exit ≠ 0 với error message chỉ rõ file + field
- [x] Validator check cả TOP-level (misconceptions, tldr, quiz, flashcards, tryAtHome) + per-row (why, whyBreaks, observeWith, deploymentUse)

### ICMP render
- [x] 9 mandatory sections render đủ
- [x] 3 optional (FAIL/FIX/AUTOMATE) có data → render; xoá data → 0 DOM node, 0 callout rỗng
- [ ] Mobile viewport 375px: không overflow, không vỡ layout *(pending manual browser verify)*
- [x] `automateScript.code` render trong `<pre><code>`, whitespace preserved, HTML escaped (không XSS)
- [ ] Console: 0 error, 0 warn trên ICMP complete *(pending manual browser verify)*

### Content quality
- [x] Misconceptions + BREAKS không trùng lặp nội dung (Misconceptions = myth/reality; BREAKS = hậu quả lý luận)
- [x] FAIL có evidence cụ thể (log/exit code/error message), không chung chung
- [x] FIX steps actionable, có command khi áp dụng được
