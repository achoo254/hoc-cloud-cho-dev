# Code Review — Schema v3 Migration

**Date**: 2026-04-19
**Branch**: master (uncommitted)
**Reviewer**: code-reviewer agent
**Scope**: Schema v3 runtime + validator + 8 networking labs
**Context**: Personal learning repo — proportional rigor applied

---

## Score: 8.5 / 10

Clean, well-scoped migration. Backward-compatible (optional v3 fields). Validator passes all 8 labs (0 errors). No blockers.

---

## Recommendation: **APPROVE_WITH_FIXES** (fixes are minor — safe to merge first, patch next)

---

## Critical issues

None.

---

## Concerns (should fix)

### C1. XSS via `failModes[].symptom` + `fixSteps[].step` (medium-trust authored HTML)
`lab-template.js:254, 276` render `f.symptom` và `s.step` qua `{ html: ... }` → `innerHTML`. Nhất quán với pattern v2 (`whyBreaks`, `observeWith`, `why` cũng innerHTML), nên **không phải regression**. Nhưng v3 thêm surface area mới — content authors dán stack trace có `<` (vd `<listener>`, `<ip>`) sẽ bị HTML parser nuốt.

**Current mitigation**: `evidence` + `command` được `escapeHtml()` — tốt (log text thường có `<` `>`).
**Gap**: `symptom`, `step`, `automate.note` vẫn innerHTML.

**Fix (optional, pragmatic)**: document rule trong `content-guidelines.md`: "symptom/step được render HTML → escape `<` `>` thủ công nếu không dùng tag; evidence/command auto-escape". Hoặc thêm `escapeHtml` cho symptom/step nếu không cần inline `<code>` (kiểm tra content hiện tại: `01-tcp-ip-packet-journey.html:289` có dùng `<code>` trong step → cần HTML. Giữ nguyên).
**Verdict**: chấp nhận (medium-trust, single-author, local content).

### C2. Validator không phát hiện type mismatch cho optional v3 fields
`validate-lab-schema.js` chỉ validate mandatory (9 fields). `failModes`/`fixSteps`/`automateScript` không validated — author gõ `failModes: "string"` thay vì `[{...}]` sẽ pass validator nhưng crash runtime (`renderFailCallout` check `Array.isArray` → null → OK thực tế, **không crash**, chỉ silent skip).

**Fix**: thêm optional-but-if-present check (8 dòng code). YAGNI vs safety — khuyến nghị cho CI robustness.

### C3. `renderFailCallout`/`renderFixCallout`/`renderAutomateCallout` duplicate wrapper boilerplate
3 renderers mới có ~8 dòng boilerplate gần như giống nhau (tạo `.callout`, `.callout-icon`, `.callout-label`, body). FIX và FAIL gần như song sinh. AUTOMATE dùng `callout-header` riêng vì có code block (justified).

**Refactor suggestion** (không bắt buộc):
```js
function makeCalloutShell(type, bodyNode, useHeader = false) { ... }
```
Giảm ~20 dòng. Ưu tiên thấp — 3 lần lặp là ngưỡng DRY-acceptable.

---

## Minor (optional)

### M1. CSS hex color hardcoded, không dùng CSS variables
`.callout-fail` dùng `#ef4444`, `.callout-fix` dùng `#34d399`, `.callout-automate` dùng `#00e5ff`. Trong khi v2 callouts (`.callout-deploy`, `.callout-misconception`) cũng hardcode hex — **nhất quán với pattern hiện tại**. OK.

Chỉ có `.callout-automate` dùng `#00e5ff` = `var(--accent)`. Có thể dùng biến cho consistency: `var(--callout-color, var(--accent))`.

### M2. `fail-list` dùng `<ul>` nhưng items là mỗi symptom+evidence pair
Semantic OK nhưng có thể cân nhắc `<dl><dt>symptom</dt><dd>evidence</dd></dl>` — đúng hơn về ngữ nghĩa. Ưu tiên thấp, không quan trọng cho UX.

### M3. Evidence quality audit (spot-checked lab-01)
`failModes[].evidence` ở lab-01 rất cụ thể (vd `dig example.com trả về: ;; connection timed out; no servers could be reached hoặc status: SERVFAIL`). Chất lượng cao. Lab 02-08 chưa audit kỹ, nhưng grep count cho thấy 6/8 labs có 5 failModes/fixSteps/automateScript, lab-02 chỉ có 3 → có thể ít step hơn, không phải vấn đề.

### M4. `makeCodeBlock` dùng `navigator.clipboard.writeText` — HTTPS-only
Đã tồn tại trong v2, không phải regression. File://, http://localhost OK; http://IP khác có thể fail silently. Acceptable cho learning context.

### M5. AUTOMATE header riêng vs inline (justified?)
AUTOMATE có `callout-header` riêng (label đứng 1 dòng trên code block) trong khi FAIL/FIX có label inline. **Justified**: code block cần full-width không chia cột với label. Giữ.

### M6. Không migration cho legacy `lab:toggle:*` keys
`mountWhyToggle` chỉ migrate `lab:hideWhy` → `lab:toggle:why`. Key mới `toggle:fail`, `toggle:fix`, `toggle:automate` default = false (visible). Đúng — không cần migrate key chưa từng tồn tại.

---

## Security notes

- **XSS**: symptom/step/note render qua innerHTML (inherited v2 pattern). `evidence`, `command`, `code` (automateScript) properly escaped. Content trust model = single-author local repo — acceptable.
- **clipboard API**: gated bởi HTTPS/localhost browser policy — no leak risk.
- **localStorage**: no PII, key prefix isolated (`lab:`).
- **Validator script**: reads HTML, regex-extracts JSON. Regex `<script[^>]*id=["']lab-data["'][^>]*>([\s\S]*?)<\/script>` — giống greedy-enough. Không có eval/exec.
- **External quiz bank fetch**: `../_shared/quiz-bank/${labId}.json` — path traversal? `labId` từ caller init(), không phải user input — safe.

---

## Positive observations

1. **Validator is pragmatic & zero-dep** — 179 lines, no npm install, runs in CI trivially.
2. **Backward compatible** — labs không có failModes/fixSteps/automateScript render OK (renderers return null → skipped).
3. **Toggle parity** — 7 toggles cho 7 callout types, CSS + JS sync, body class pattern nhất quán.
4. **Docs first** — `lab-schema-v3.md` có field table rõ ràng, mnemonic THINK·SEE·SHIP dễ nhớ.
5. **Content quality (lab-01 spot-check)** — failModes/fixSteps rất cụ thể, không generic. Đúng spirit của schema.
6. **`escapeHtml` áp đúng chỗ** — evidence (có thể chứa log output với `<`), command (bash syntax) đều escape. Chỗ cần HTML (symptom với inline `<code>`) thì inline.
7. **No N+1/perf regressions** — tất cả render client-side 1 lần, không thêm fetch/loop.
8. **Commit-ready** — validator passes 8/8, no lint errors, no breaking changes to quiz SRS / flashcard SRS / storage keys.

---

## Recommended actions

1. **Accept as-is** for personal learning repo. Đạt chuẩn YAGNI/KISS.
2. *(optional)* Thêm optional-field type check vào validator (~8 LoC).
3. *(optional)* Refactor 3 renderers share `makeCalloutShell` helper nếu thêm callout type v4.
4. *(optional)* Document trong `content-guidelines.md` về escape rule cho symptom/step (inline HTML allowed, but escape `<`/`>` nếu không intend tag).

---

## Metrics

- Files changed (runtime): 2 (lab-template.js, lab-template.css)
- Files new: 2 (validate-lab-schema.js, lab-schema-v3.md)
- Content migrated: 8/8 networking labs
- Validator: 8/8 pass, 0 errors
- LoC added (runtime): ~90 (3 renderers + validator integration)
- LoC added (validator): 179
- Backward compatible: ✅ yes (optional v3 fields)

---

## Unresolved questions

- Có cần validator strict mode (optional-field shape check) không? Trade-off: CI robustness vs YAGNI. Khuyến nghị: thêm khi có lab đầu tiên break runtime.
- Content quality của lab 02-08 `failModes[].evidence`: chưa audit thủ công — có nên delegate content-auditor agent?
- AUTOMATE script có test chưa? `01` có `tcpdump rotate` script — có chạy thử chưa?
