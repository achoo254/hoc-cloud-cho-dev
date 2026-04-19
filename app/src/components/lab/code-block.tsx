/**
 * Syntax-highlighted code block using Shiki (lazy-loaded).
 * Supports: bash, yaml, javascript, typescript, go, json.
 * Falls back to plain <pre> while Shiki loads.
 */

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

type SupportedLang = 'bash' | 'yaml' | 'javascript' | 'typescript' | 'go' | 'json' | 'text'

interface CodeBlockProps {
  code: string
  lang?: SupportedLang
  className?: string
}

// Module-level cache so Shiki only initialises once per session
let shikiHighlighter: Awaited<ReturnType<typeof import('shiki').createHighlighter>> | null = null
let shikiLoading: Promise<void> | null = null

async function getHighlighter() {
  if (shikiHighlighter) return shikiHighlighter
  if (!shikiLoading) {
    shikiLoading = (async () => {
      const { createHighlighter } = await import('shiki')
      shikiHighlighter = await createHighlighter({
        themes: ['github-dark'],
        langs: ['bash', 'yaml', 'javascript', 'typescript', 'go', 'json'],
      })
    })()
  }
  await shikiLoading
  return shikiHighlighter!
}

export function CodeBlock({ code, lang = 'bash', className }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    if (lang === 'text') return

    getHighlighter()
      .then((hl) => {
        if (cancelled) return
        const rendered = hl.codeToHtml(code, {
          lang,
          theme: 'github-dark',
        })
        setHtml(rendered)
      })
      .catch(() => {
        // Shiki failed — keep plain fallback, no crash
      })

    return () => { cancelled = true }
  }, [code, lang])

  function handleCopy() {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('relative group rounded-lg overflow-hidden border border-border', className)}>
      {/* Language badge */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
          {lang}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5" /> Copied</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy</>
          )}
        </button>
      </div>

      {/* Code area */}
      {html ? (
        <div
          className="overflow-x-auto text-sm [&>pre]:p-4 [&>pre]:m-0 [&>pre]:bg-transparent"
          // Shiki returns safe HTML — it never takes user content
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 text-sm bg-[#0d1117] text-[#e6edf3] m-0">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}
