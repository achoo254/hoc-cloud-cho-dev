/**
 * VictoriaLogs — Mode 2: LogsQL mini-evaluator.
 * Parser/evaluator tập con (vlogs-logsql-parser) chạy trên MOCK_LOGS. Edit query → kết quả đổi live.
 * Đây là TẬP CON minh hoạ, không phải engine LogsQL đầy đủ.
 */

import { useMemo, useState } from 'react'
import { Play, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MOCK_LOGS } from './vlogs-mock-data'
import { parseLogsQL, evaluate } from './vlogs-logsql-parser'

const PRESETS: { label: string; q: string }[] = [
  { label: 'Chứa "error"', q: 'error' },
  { label: 'level=error', q: 'level:error' },
  { label: 'error gần đây (5m)', q: 'level:error _time:5m' },
  { label: 'log theo stream sshd', q: '_stream:{app_name="sshd"}' },
  { label: 'đếm error theo host', q: 'level:error | stats by (hostname) count()' },
  { label: 'nginx mới nhất, 5 dòng', q: 'app_name:nginx | sort by (_time) desc | limit 5' },
]

const LEVEL_COLOR: Record<string, string> = {
  error: 'text-destructive',
  warn: 'text-amber-600 dark:text-amber-400',
  info: 'text-muted-foreground',
  debug: 'text-muted-foreground/70',
}

export function VlogsLogsqlPlayground() {
  const [query, setQuery] = useState('level:error _time:5m')

  const result = useMemo(() => {
    const parsed = parseLogsQL(query)
    if (!parsed.ok) return { error: parsed.error as string }
    return { data: evaluate(parsed.parsed, MOCK_LOGS) }
  }, [query])

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
        <Play className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          aria-label="Truy vấn LogsQL"
          placeholder='vd: level:error _time:5m | stats by (hostname) count()'
          className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.q}
            type="button"
            onClick={() => setQuery(p.q)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
              query === p.q
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Result */}
      {'error' in result ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{result.error}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {result.data.isStats
              ? `${result.data.rows.length} nhóm · ${result.data.matched} log khớp filter`
              : `${result.data.rows.length} dòng hiển thị · ${result.data.matched} log khớp filter`}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {result.data.columns.map((c) => (
                    <th key={c} className="px-2.5 py-1.5 font-mono font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={result.data.columns.length} className="px-2.5 py-3 text-center text-muted-foreground">
                      Không có kết quả khớp.
                    </td>
                  </tr>
                ) : (
                  result.data.rows.map((row, i) => (
                    <tr key={i} className="border-t border-border/60">
                      {result.data.columns.map((c) => (
                        <td
                          key={c}
                          className={cn(
                            'px-2.5 py-1.5 align-top',
                            c === '_msg' && 'font-mono',
                            c === 'level' && LEVEL_COLOR[String(row[c])],
                            c === 'count' && 'font-mono font-semibold',
                          )}
                        >
                          {String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] italic text-muted-foreground">
        Tập con LogsQL minh hoạ (word/field/_time/_stream filter · stats · sort · limit) chạy trên dữ liệu mẫu. Cú pháp đầy đủ:{' '}
        <a href="https://docs.victoriametrics.com/victorialogs/logsql/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          docs.victoriametrics.com/victorialogs/logsql
        </a>
      </p>
    </div>
  )
}
