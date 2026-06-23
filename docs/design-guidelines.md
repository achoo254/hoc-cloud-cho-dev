# Design Guidelines

UI design system cho hoc-cloud SPA. Production: https://hoc-cloud.inetdev.io.vn/

## 1. Foundation

### Stack
- **Tailwind CSS 3.4** — utility-first, không viết custom CSS trừ tokens
- **shadcn/ui** (Radix primitives) — mọi interactive primitive (Dialog, Dropdown, Tooltip, Command...)
- **Framer Motion 11** — duy nhất layer animation
- **Lucide React** — icon set mặc định

### Design tokens (`app/src/styles/globals.css`)

HSL CSS variables — never hardcode màu. Dùng Tailwind token classes (`bg-background`, `text-foreground`, `border-border`...).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `0 0% 100%` | `240 10% 3.9%` | Page background |
| `--foreground` | `240 10% 3.9%` | `0 0% 98%` | Body text |
| `--card` | `0 0% 100%` | `240 10% 3.9%` | Card surface |
| `--primary` | `240 5.9% 10%` | `0 0% 98%` | CTA, focus ring |
| `--muted` | `240 4.8% 95.9%` | `240 3.7% 15.9%` | Subtle surface |
| `--muted-foreground` | `240 3.8% 46.1%` | `240 5% 64.9%` | Secondary text |
| `--accent` | `240 4.8% 95.9%` | `240 3.7% 15.9%` | Hover / active |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Error, delete |
| `--border` / `--input` | `240 5.9% 90%` | `240 3.7% 15.9%` | Divider, input border |
| `--ring` | `240 10% 3.9%` | `240 4.9% 83.9%` | Focus outline |
| `--radius` | `0.5rem` | — | Base radius |

Dark mode: `class` strategy (`.dark` on `<html>`). Never use `prefers-color-scheme` CSS media query directly.

## 2. Spacing & Layout

- **Container**: `container` utility — `max-width: 1400px @ 2xl`, `padding: 2rem` centered
- **Spacing scale**: Tailwind default (4px base) — prefer `gap-*` over margin
- **Breakpoints**: Tailwind default (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1400)
- **Desktop/mobile split**: `hidden md:block` / `md:hidden` — CSS-only, no JS device detection

## 3. Typography

- **Font**: system stack (no custom webfont — perf ưu tiên)
- **Font features**: `rlig` + `calt` bật cho ligature code
- **Code**: Shiki syntax highlighting, theme `github-light` / `github-dark`
- **Scale**: default Tailwind — `text-sm` (UI), `text-base` (body), `text-xl`/`2xl` (heading)

## 4. Component Rules

### Primitives
- Mọi Dialog/Dropdown/Tooltip/Select/Tabs/Toast **phải** qua shadcn wrapper tại `app/src/components/ui/`
- Không import Radix trực tiếp vào feature code
- Variant qua `class-variance-authority` (`cva`), không duplicate class string

### Lab Renderer & Diagram Components
Xem `docs/code-standards.md` → **D3 vs Framer Motion** + **Lab Renderer Patterns** để biết chi tiết về THINK/SEE/TRY IT phase, lazy-loaded diagram registry, `PlaygroundErrorBoundary` fallback, desktop/mobile CSS switch.

## 5. Animation Rules

**D3 vs Framer Motion separation** (see `docs/code-standards.md`): D3 = math only (`scaleLinear()`, path generators). Framer Motion owns all DOM/SVG animation (`<motion.*>`, `AnimatePresence`).

**Motion principles**:
- Respect `prefers-reduced-motion` — wrap long animations
- Duration: UI micro (100–200ms), transition (200–400ms), playground step (500–1000ms)
- Easing: default `ease-out` enter, `ease-in` exit
- Stagger children in list/grid

## 6. Iconography

- Lucide React only — không mix icon set khác
- Size default `16px` inline, `20px` button, `24px` heading
- Stroke 1.5–2 tuỳ density

## 7. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Keyboard nav | All Radix primitives handle natively; custom interactive elements cần `tabIndex` + `onKeyDown` |
| Focus outline | `--ring` token, Tailwind `focus-visible:ring-2` |
| Reduced motion | `prefers-reduced-motion` check trong playground animation |
| Contrast | WCAG AA minimum — token pairs đã satisfy |
| Screen reader | `aria-label` cho icon-only button; landmarks (`<nav>`, `<main>`, `<aside>`) |

## 8. SVG & Export

- Export qua `export-utils.ts::exportSvg()` — **mandatory** DOMPurify sanitize
- Profiles: `svg` + `svgFilters`
- Forbidden tags/attrs: `script`, `foreignObject`, `onload`, `onclick`, `onerror`, `onmouseover`
- Never bypass — treat exported SVG as untrusted if user shares it

## 9. Forbidden Patterns

- ❌ Hardcode HSL/hex — dùng Tailwind token (`--background`, `--foreground`, etc.)
- ❌ Inline `style={{ color: '#...' }}` — dùng Tailwind class
- ❌ Custom CSS file ngoài `globals.css` — CSS-in-JS **not used**
- ❌ `d3.select()` hoặc direct DOM mutation — D3 math only
- ❌ Import Radix primitive trực tiếp — dùng `app/src/components/ui/` wrapper
- ❌ Mix icon set ngoài Lucide React
- ❌ CSS-only animation cho playground — Framer Motion for state control
- ❌ Mobile-specific JS code — CSS breakpoint only (`hidden md:block`, `md:hidden`)
