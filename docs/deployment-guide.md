# Deployment Guide

## Build

```bash
# From repo root — generates content then builds app
cd app && npm run build
# Equivalent: npm run gen:content (root) → tsc --noEmit → vite build
```

Output: `app/dist/`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_ENABLE_DIAGRAM_PLAYGROUND` | `true` (enabled) | Set to `"false"` to disable interactive playground and fall back to text-only THINK/SEE sections for all labs. |

### Disabling the playground

```env
VITE_ENABLE_DIAGRAM_PLAYGROUND=false
```

Useful when: deploying to low-powered environments, disabling during A/B tests, or emergency rollback of a broken diagram component without a full redeploy.

The flag is evaluated at build time via `import.meta.env`. An additional runtime escape hatch exists: append `?textMode=1` to any lab URL to force text mode regardless of the build flag.

## Dev Server

```bash
cd app
npm run dev
```

## Typecheck

```bash
cd app
npm run typecheck   # tsc --noEmit
```
