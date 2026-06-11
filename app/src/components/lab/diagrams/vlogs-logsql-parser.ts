/**
 * Mini-parser + evaluator cho MỘT TẬP CON LogsQL (minh hoạ trên mock data).
 * KHÔNG phải engine đầy đủ. Tập con hỗ trợ:
 *   - word/phrase filter trên _msg:      error   "connection refused"
 *   - field:value filter:                level:error  hostname:web1  app_name:nginx
 *   - time filter:                       _time:5m  _time:300s  _time:1h
 *   - stream filter:                     _stream:{app_name="nginx",hostname="web1"}  hoặc {app_name="nginx"}
 *   - pipe stats:                        | stats count()   | stats by (hostname) count()
 *   - pipe sort:                         | sort by (_time)  | sort by (count) desc
 *   - pipe limit:                        | limit 5
 * Cú pháp ngoài tập con → trả error tường minh. Tham chiếu: docs.victoriametrics.com/victorialogs/logsql/
 */

import type { VLogEntry } from './vlogs-mock-data'

const FIELD_KEYS = ['level', 'hostname', 'app_name', '_msg'] as const
type FieldKey = (typeof FIELD_KEYS)[number]

// Field hợp lệ cho `stats by (...)` và `sort by (...)` — validate tường minh
// thay vì âm thầm gom/sort sai khi gặp field không có trong mock.
const GROUPABLE = ['level', 'hostname', 'app_name'] as const
const SORTABLE = ['_time', 'level', 'hostname', 'app_name', 'count'] as const

type Filter =
  | { kind: 'time'; maxAgeSec: number }
  | { kind: 'field'; field: FieldKey; value: string }
  | { kind: 'word'; text: string }
  | { kind: 'stream'; pairs: { k: string; v: string }[] }

type Pipe =
  | { kind: 'stats'; by: string[] }
  | { kind: 'sort'; field: string; desc: boolean }
  | { kind: 'limit'; n: number }

export interface ParsedQuery {
  filters: Filter[]
  pipes: Pipe[]
}

export type ParseResult =
  | { ok: true; parsed: ParsedQuery }
  | { ok: false; error: string }

export interface EvalResult {
  isStats: boolean
  columns: string[]
  rows: Array<Record<string, string | number>>
  matched: number // số log khớp filter (trước limit/stats)
}

// ── Tokenizer: giữ {…}, "…", và chuỗi không khoảng trắng ─────────────────────
function tokenize(expr: string): string[] {
  return expr.match(/\{[^}]*\}|"[^"]*"|\S+/g) ?? []
}

function parseDuration(d: string): number | null {
  const m = d.match(/^(\d+)(s|m|h)$/)
  if (!m) return null
  const n = Number(m[1])
  return m[2] === 's' ? n : m[2] === 'm' ? n * 60 : n * 3600
}

function parseStreamPairs(token: string): { k: string; v: string }[] | null {
  const inner = token.replace(/^_stream:/, '').replace(/^\{/, '').replace(/\}$/, '')
  if (inner.trim() === '') return []
  const pairs: { k: string; v: string }[] = []
  for (const part of inner.split(',')) {
    const m = part.trim().match(/^([a-z_]+)\s*=\s*"([^"]*)"$/i)
    if (!m) return null
    pairs.push({ k: m[1], v: m[2] })
  }
  return pairs
}

function parseFilters(expr: string): { ok: true; filters: Filter[] } | { ok: false; error: string } {
  const filters: Filter[] = []
  for (const tok of tokenize(expr)) {
    // time
    if (tok.startsWith('_time:')) {
      const sec = parseDuration(tok.slice('_time:'.length))
      if (sec === null) return { ok: false, error: `Khoảng thời gian không hợp lệ: ${tok} (dùng dạng 5m, 300s, 1h)` }
      filters.push({ kind: 'time', maxAgeSec: sec })
      continue
    }
    // stream
    if (tok.startsWith('_stream:') || tok.startsWith('{')) {
      const pairs = parseStreamPairs(tok)
      if (!pairs) return { ok: false, error: `Stream filter sai cú pháp: ${tok} (dạng {app_name="nginx",hostname="web1"})` }
      filters.push({ kind: 'stream', pairs })
      continue
    }
    // quoted phrase → word filter trên _msg
    if (tok.startsWith('"') && tok.endsWith('"')) {
      filters.push({ kind: 'word', text: tok.slice(1, -1) })
      continue
    }
    // field:value
    if (tok.includes(':')) {
      const [field, ...rest] = tok.split(':')
      const value = rest.join(':').replace(/^"|"$/g, '')
      if (!FIELD_KEYS.includes(field as FieldKey)) {
        return { ok: false, error: `Field "${field}" chưa hỗ trợ trong demo (chỉ: ${FIELD_KEYS.join(', ')})` }
      }
      if (field === '_msg') filters.push({ kind: 'word', text: value })
      else filters.push({ kind: 'field', field: field as FieldKey, value })
      continue
    }
    // bare word → _msg substring
    filters.push({ kind: 'word', text: tok })
  }
  return { ok: true, filters }
}

function parsePipe(seg: string): { ok: true; pipe: Pipe } | { ok: false; error: string } {
  const s = seg.trim()
  // stats [by (a,b)] count()
  if (s.startsWith('stats')) {
    if (!/count\s*\(\s*\)/.test(s)) return { ok: false, error: 'Chỉ hỗ trợ hàm count() trong stats (demo)' }
    const byMatch = s.match(/by\s*\(\s*([^)]*)\)/i)
    const by = byMatch ? byMatch[1].split(',').map((x) => x.trim()).filter(Boolean) : []
    const badBy = by.find((f) => !(GROUPABLE as readonly string[]).includes(f))
    if (badBy) return { ok: false, error: `stats by field "${badBy}" chưa hỗ trợ (chỉ: ${GROUPABLE.join(', ')})` }
    return { ok: true, pipe: { kind: 'stats', by } }
  }
  // sort by (field) [desc]
  if (s.startsWith('sort')) {
    const m = s.match(/sort\s+by\s*\(\s*([a-z_]+)\s*\)\s*(desc)?/i)
    if (!m) return { ok: false, error: 'sort sai cú pháp (dạng: sort by (_time) [desc])' }
    if (!(SORTABLE as readonly string[]).includes(m[1])) {
      return { ok: false, error: `sort by field "${m[1]}" chưa hỗ trợ (chỉ: ${SORTABLE.join(', ')})` }
    }
    return { ok: true, pipe: { kind: 'sort', field: m[1], desc: Boolean(m[2]) } }
  }
  // limit N
  if (s.startsWith('limit')) {
    const m = s.match(/limit\s+(\d+)/i)
    if (!m) return { ok: false, error: 'limit cần số nguyên (dạng: limit 5)' }
    return { ok: true, pipe: { kind: 'limit', n: Number(m[1]) } }
  }
  return { ok: false, error: `Pipe "${s.split(/\s/)[0]}" chưa hỗ trợ (chỉ: stats, sort, limit)` }
}

export function parseLogsQL(query: string): ParseResult {
  const q = query.trim()
  if (!q) return { ok: false, error: 'Query rỗng' }
  const segments = q.split('|')
  const filterRes = parseFilters(segments[0])
  if (!filterRes.ok) return filterRes
  const pipes: Pipe[] = []
  for (const seg of segments.slice(1)) {
    if (seg.trim() === '') continue
    const pr = parsePipe(seg)
    if (!pr.ok) return pr
    pipes.push(pr.pipe)
  }
  return { ok: true, parsed: { filters: filterRes.filters, pipes } }
}

// ── Evaluate ─────────────────────────────────────────────────────────────────
function matchFilter(log: VLogEntry, f: Filter): boolean {
  switch (f.kind) {
    case 'time':
      return log.tMinusSec <= f.maxAgeSec
    case 'field':
      return String(log[f.field as keyof VLogEntry] ?? '').toLowerCase() === f.value.toLowerCase()
    case 'word':
      return log.msg.toLowerCase().includes(f.text.toLowerCase())
    case 'stream':
      return f.pairs.every((p) => {
        if (p.k === 'app_name') return log.app_name === p.v
        if (p.k === 'hostname') return log.hostname === p.v
        return false
      })
  }
}

export function evaluate(parsed: ParsedQuery, logs: VLogEntry[]): EvalResult {
  let rows = logs.filter((l) => parsed.filters.every((f) => matchFilter(l, f)))
  const matched = rows.length
  let statsRows: Array<Record<string, string | number>> | null = null
  let statsCols: string[] = []

  for (const pipe of parsed.pipes) {
    if (pipe.kind === 'stats') {
      const groups = new Map<string, Record<string, string | number>>()
      for (const l of rows) {
        // Delimiter khoảng trắng tách field group (level/hostname/app_name không chứa
        // khoảng trắng) nên không va chạm key giữa các tổ hợp khác nhau.
        const key = pipe.by.map((b) => String(l[b as keyof VLogEntry] ?? '')).join(' ')
        const g = groups.get(key) ?? Object.fromEntries(pipe.by.map((b) => [b, String(l[b as keyof VLogEntry] ?? '')]))
        g.count = (Number(g.count) || 0) + 1
        groups.set(key, g)
      }
      statsRows = Array.from(groups.values())
      statsCols = [...pipe.by, 'count']
    } else if (pipe.kind === 'sort') {
      const cmp = (a: Record<string, unknown> | VLogEntry, b: Record<string, unknown> | VLogEntry) => {
        const key = pipe.field === '_time' ? 'tMinusSec' : pipe.field
        let av = (a as Record<string, unknown>)[key]
        let bv = (b as Record<string, unknown>)[key]
        if (pipe.field === '_time') {
          // _time tăng dần = cũ→mới: tMinusSec lớn = cũ → đảo dấu
          av = -(Number(av) || 0)
          bv = -(Number(bv) || 0)
        }
        const an = typeof av === 'number' ? av : String(av)
        const bn = typeof bv === 'number' ? bv : String(bv)
        const r = an < bn ? -1 : an > bn ? 1 : 0
        return pipe.desc ? -r : r
      }
      if (statsRows) statsRows = [...statsRows].sort(cmp)
      else rows = [...rows].sort(cmp)
    } else if (pipe.kind === 'limit') {
      if (statsRows) statsRows = statsRows.slice(0, pipe.n)
      else rows = rows.slice(0, pipe.n)
    }
  }

  if (statsRows) {
    return { isStats: true, columns: statsCols, rows: statsRows, matched }
  }
  return {
    isStats: false,
    columns: ['time', 'level', 'stream', '_msg'],
    rows: rows.map((l) => ({ time: l.time, level: l.level, stream: l.stream, _msg: l.msg })),
    matched,
  }
}
