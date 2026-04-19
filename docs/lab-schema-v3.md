---
title: Lab Schema v3 — THINK · SEE · SHIP
status: active
version: 3.0
supersedes: schema-v2 (in content-guidelines.md §8)
---

# Lab Schema v3 — THINK · SEE · SHIP

Nâng cấp từ v2 (4 chân: WHY/BREAKS/OBSERVE/DEPLOY) sang v3 mnemonic 4 nhóm **12 sections**. Tách bạch lý luận (THINK), quan sát (SEE), action (SHIP), output học tập (OUTPUT).

## 1. Mnemonic

```
THINK   → Misconceptions* · WHY* · BREAKS*
SEE     → OBSERVE* · FAIL° · FIX°
SHIP    → AUTOMATE° · DEPLOY*
OUTPUT  → TL;DR* · Quiz* · Flashcards* · Try at home*
```

`*` = mandatory (9 sections) — thiếu → validator fail + console warn
`°` = optional (3 sections — FAIL/FIX/AUTOMATE) — ẩn hoàn toàn nếu không có data

## 2. Field reference

### Top-level

| Key | Type | Mandatory | Group | Note |
|-----|------|-----------|-------|------|
| `title` | string | ✅ | meta | |
| `estimatedMinutes` | number | — | meta | |
| `dependsOn` | string[] | — | meta | Badge hero |
| `enables` | string[] | — | meta | Badge hero |
| `misconceptions` | `{wrong, right, why}[]` | ✅ (≥2) | THINK | Giữ shape v2, ≥2 item |
| `tldr` | row[] | ✅ | OUTPUT | Xem schema row dưới |
| `walkthrough` | step[] | ✅ | OUTPUT | Xem schema step dưới |
| `quiz` | question[] | ✅ | OUTPUT | ≥4 item |
| `flashcards` | card[] | ✅ | OUTPUT | ≥5 item |
| `tryAtHome` | task[] | ✅ | OUTPUT | ≥2 item |

### `tldr[]` row (nhóm OUTPUT, render bảng)

| Key | Type | Mandatory | Note |
|-----|------|-----------|------|
| `what` | string | ✅ | Tiêu đề row |
| `why` | string | ✅ | THINK — lý do |
| `whyBreaks` | string | ✅ | THINK — hậu quả lý luận |
| `deploymentUse` | string | ✅ | SHIP — prod checklist |

### `walkthrough[]` step (SEE core, render card-by-card)

| Key | Type | Mandatory | Group | Note |
|-----|------|-----------|-------|------|
| `step` | number | ✅ | — | Index step |
| `what` | string | ✅ | — | Tiêu đề |
| `why` | string | ✅ | THINK | |
| `whyBreaks` | string | ✅ | THINK | Callout BREAKS |
| `observeWith` | string | ✅ | SEE | Callout OBSERVE (man/tool) |
| `failModes` | `{symptom, evidence}[]` | ° | SEE | Callout FAIL — triệu chứng + log/error |
| `fixSteps` | `{step, command?}[]` | ° | SEE | Callout FIX — action sau FAIL |
| `automateScript` | `{lang, code, note?}` | ° | SHIP | Callout AUTOMATE — script hoá |
| `deploymentUse` | string | — | SHIP | Optional per-step (TLDR đã có deployment) |
| `code` | string | — | — | Code block demo |
| `lang` | string | — | — | Ngôn ngữ code (default `bash`) |
| `note` | string | — | — | Ghi chú nhỏ |

### `quiz[]`, `flashcards[]`, `tryAtHome[]` — giữ nguyên shape v2

Xem `labs/_shared/lab-template.js` validator hiện tại.

## 3. Render order (per walkthrough step)

```
step header → why block → BREAKS callout → code block
  → OBSERVE callout → FAIL callout → FIX callout
  → AUTOMATE callout → DEPLOY callout → note
```

Logic: lý luận → quan sát → triệu chứng khi hỏng → cách sửa → script hoá → apply prod.

## 4. Callout style

| Callout | CSS class | Color token | Icon | Label |
|---------|-----------|-------------|------|-------|
| BREAKS | `.callout-breaks` | `--red` | ⚠️ | Khi hỏng |
| OBSERVE | `.callout-observe` | `--accent` (blue) | 👁️ | Quan sát |
| FAIL | `.callout-fail` | `--red` | 🔴 | Triệu chứng khi hỏng |
| FIX | `.callout-fix` | `--green` | 🔧 | Cách sửa |
| AUTOMATE | `.callout-automate` | `--accent` | ⚙️ | Script hoá |
| DEPLOY | `.callout-deploy` | `--purple` | 🚀 | Khi deploy thật |
| Misconception | `.callout-misconception` | `--why` (amber) | 📚 | Hiểu lầm phổ biến |

## 5. JSON — minimal full example

```json
{
  "title": "ICMP — Ping & Traceroute",
  "misconceptions": [
    { "wrong": "Ping thành công = service OK", "right": "Ping chỉ test L3 ICMP", "why": "Web/DB chạy trên L7, ICMP không nói gì về TCP port" },
    { "wrong": "Block hết ICMP = secure", "right": "Block type 3 code 4 sẽ vỡ PMTU Discovery", "why": "TCP over MTU mismatch stall vô thời hạn" }
  ],
  "tldr": [
    { "what": "ping RTT", "why": "Đo round-trip L3", "whyBreaks": "Log NXDOMAIN ≠ timeout", "deploymentUse": "Uptime probe nội bộ only" }
  ],
  "walkthrough": [
    {
      "step": 1,
      "what": "Gửi ICMP echo request",
      "why": "Minimal L3 probe",
      "whyBreaks": "ICMP bị firewall block → false-positive down",
      "observeWith": "tcpdump -n icmp",
      "failModes": [
        { "symptom": "ping hang, không response", "evidence": "iptables log: DROP icmp type 8" }
      ],
      "fixSteps": [
        { "step": "Allow ICMP type 3 (Destination Unreachable)", "command": "iptables -A INPUT -p icmp --icmp-type 3 -j ACCEPT" }
      ],
      "automateScript": {
        "lang": "bash",
        "code": "#!/bin/bash\nLOSS=$(ping -c 100 $1 | grep -oP '\\d+(?=% packet loss)')\n[ \"$LOSS\" -gt 5 ] && echo \"ALERT: $LOSS%\"",
        "note": "Cron 5m, alert loss>5%"
      }
    }
  ],
  "quiz": [],
  "flashcards": [],
  "tryAtHome": []
}
```

## 6. Migration v2 → v3

| v2 | v3 | Action |
|----|----|--------|
| 4 chân WHY/BREAKS/OBSERVE/DEPLOY | Giữ nguyên, tách BREAKS thành THINK-BREAKS + SEE-FAIL | Không rename key |
| `misconceptions` optional | Mandatory ≥2 item | Audit 8 labs, bổ sung nếu thiếu |
| N/A | `failModes[]` optional | Thêm khi tự nhiên có log/error evidence |
| N/A | `fixSteps[]` optional | Thêm khi có action actionable sau FAIL |
| N/A | `automateScript` optional | Thêm khi script hoá được |

**Không rename** key để tránh vỡ 8 labs hiện có. Display label (UI) khác key (JSON): `whyBreaks` key → "BREAKS" label.

## 7. Validation rules

### Runtime (`labs/_shared/lab-template.js`)

- Missing mandatory → `console.warn('[lab:${labId}] missing — ${path}')`
- Toggle silence: `window.SKIP_WHY_WARN = true`

### CI (`scripts/validate-lab-schema.js`)

- Exit code 1 nếu thiếu mandatory ở bất kỳ lab nào
- Empty string, `[]`, `{}` = vi phạm
- Chạy: `npm run validate:schema`
- Wire pre-commit hook hoặc CI workflow

### Rules

| Location | Mandatory keys |
|----------|----------------|
| Top-level | `title`, `misconceptions (≥2)`, `tldr (≥1)`, `walkthrough (≥1)`, `quiz (≥4)`, `flashcards (≥5)`, `tryAtHome (≥2)` |
| `misconceptions[i]` | `wrong`, `right`, `why` |
| `tldr[i]` | `what`, `why`, `whyBreaks`, `deploymentUse` |
| `walkthrough[i]` | `step`, `what`, `why`, `whyBreaks`, `observeWith` |
| `quiz[i]` | `q`, `options`, `correct`, `whyCorrect`, `whyOthersWrong` |
| `flashcards[i]` | `front`, `back`, `why` |
| `tryAtHome[i]` | `why`, `cmd`, `observeWith` |

## 8. Rationale — Misconceptions mandatory

Dev không biết "unknown unknowns" (ví dụ: tưởng ping dùng TCP/UDP → thực tế ICMP là L3 riêng). Bắt buộc author nghĩ "dev sẽ hiểu sai gì" = giá trị pedagogy cao nhất. Nếu author không nghĩ ra misconception → tín hiệu lab chưa đủ sâu, research thêm thay vì skip.

## 9. Optional sections — content guidance

### FAIL — `failModes[]`
- `symptom` = điều dev thấy (hang, 502, timeout, exit code)
- `evidence` = log cụ thể / error message / metric (không chung chung)
- Bỏ qua nếu lab concept-only không có failure evidence thực

### FIX — `fixSteps[]`
- `step` = imperative action ("Allow ICMP type 3 trên firewall")
- `command` = bash/yaml/sql cụ thể nếu áp dụng được
- Bỏ qua nếu FIX chỉ là "hiểu concept tốt hơn"

### AUTOMATE — `automateScript`
- `lang` = `bash`, `python`, `yaml`, `js`
- `code` = script executable thực, không pseudo
- `note` = context dùng (cron? trigger? CI?)
- Bỏ qua nếu không có workflow script hoá tự nhiên

## References

- Brainstorm: `plans/dattqh/reports/brainstorm-260419-1737-schema-v3-think-see-ship.md`
- Plan: `plans/dattqh/260419-1737-schema-v3-think-see-ship/plan.md`
- Runtime: `labs/_shared/lab-template.js`
- Validator: `scripts/validate-lab-schema.js`
- Guidelines: `docs/content-guidelines.md` §8, §11
