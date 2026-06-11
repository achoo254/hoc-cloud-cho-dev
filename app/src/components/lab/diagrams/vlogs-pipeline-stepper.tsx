/**
 * VictoriaLogs — Mode 3: Pipeline stepper "Dựng stack" trên VPS.
 * 5 bước: binary → systemd → rsyslog forward → gửi log → query LogsQL.
 * Command + "kỳ vọng" đối chiếu lần dựng thật trên Ubuntu 24.04 + VictoriaLogs v1.50.0
 * (docs.victoriametrics.com). Output thật đầy đủ nằm trong nội dung lab + report.
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeBlock } from '@/components/lab/code-block'

interface Step {
  n: number
  title: string
  command: string
  expect: string
  note?: string // HTML inline (cho phép <a>/<code>)
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Cài binary victoria-logs',
    command:
      'curl -fsSL -O https://github.com/VictoriaMetrics/VictoriaLogs/releases/download/v1.50.0/victoria-logs-linux-amd64-v1.50.0.tar.gz\n' +
      'tar xzf victoria-logs-linux-amd64-v1.50.0.tar.gz\n' +
      'sudo mv victoria-logs-prod /usr/local/bin/victoria-logs',
    expect: 'Có /usr/local/bin/victoria-logs; chạy nó với --version in ra tag v1.50.0.',
    note: 'VictoriaLogs phát hành ở repo riêng <a href="https://github.com/VictoriaMetrics/VictoriaLogs/releases">VictoriaMetrics/VictoriaLogs</a> (tách khỏi VictoriaMetrics core). Tải bản mới nhất theo kiến trúc — xem <a href="https://docs.victoriametrics.com/victorialogs/quickstart/">quickstart</a>.',
  },
  {
    n: 2,
    title: 'Tạo systemd service (HTTP :9428 + syslog ingest)',
    command:
      'sudo tee /etc/systemd/system/victorialogs.service >/dev/null <<EOF\n' +
      '[Unit]\nDescription=VictoriaLogs\nAfter=network.target\n\n' +
      '[Service]\nExecStart=/usr/local/bin/victoria-logs \\\n' +
      '  -storageDataPath=/var/lib/victoria-logs \\\n' +
      '  -httpListenAddr=:9428 \\\n' +
      '  -syslog.listenAddr.tcp=:5410\nRestart=always\n\n' +
      '[Install]\nWantedBy=multi-user.target\nEOF\n' +
      'sudo systemctl daemon-reload && sudo systemctl enable --now victorialogs',
    expect: 'systemctl is-active victorialogs → active. ss -ltn cho thấy 0.0.0.0:9428 (HTTP/UI/query) và 0.0.0.0:5410 (syslog TCP) đang LISTEN.',
    note: 'Cờ <code>-syslog.listenAddr.tcp</code> bật nhận log syslog — xem <a href="https://docs.victoriametrics.com/victorialogs/data-ingestion/syslog/">data ingestion: syslog</a>.',
  },
  {
    n: 3,
    title: 'Cấu hình rsyslog forward về VictoriaLogs',
    command:
      'echo \'*.* action(type="omfwd" target="127.0.0.1" port="5410" protocol="tcp" \\\n' +
      '  template="RSYSLOG_SyslogProtocol23Format")\' | sudo tee /etc/rsyslog.d/50-victorialogs.conf\n' +
      'sudo systemctl restart rsyslog',
    expect: 'rsyslog forward toàn bộ log local sang cổng 5410 theo RFC 5424. systemctl is-active rsyslog → active.',
    note: 'Template <code>RSYSLOG_SyslogProtocol23Format</code> = RFC 5424; VictoriaLogs parse và sinh field <code>app_name</code>, <code>hostname</code>, <code>severity</code>, <code>level</code>.',
  },
  {
    n: 4,
    title: 'Sinh log thử',
    command: 'logger -t demo "hello victorialogs from rsyslog"\nlogger -t demo -p user.err "simulated error connection refused to db"',
    expect: 'Hai dòng log app_name=demo được rsyslog đẩy sang VictoriaLogs gần như tức thời (severity err → level=error).',
  },
  {
    n: 5,
    title: 'Truy vấn bằng LogsQL',
    command:
      "curl -s -G 'http://localhost:9428/select/logsql/query' \\\n" +
      "  --data-urlencode 'query=_stream:{app_name=\"demo\"}'",
    expect:
      'Trả JSON (mỗi dòng 1 log) gồm _msg, _time, _stream, app_name, hostname, level. Mở UI tại http://<host>:9428/select/vmui để query trực quan.',
    note: 'Endpoint query: <a href="https://docs.victoriametrics.com/victorialogs/querying/">VictoriaLogs querying API</a>. Word filter (vd <code>error</code>) khớp trên <code>_msg</code>; lọc theo nguồn dùng <code>_stream:{...}</code>.',
  },
]

export function VlogsPipelineStepper() {
  const [active, setActive] = useState(0)
  const step = STEPS[active]

  return (
    <div className="space-y-4">
      {/* Stepper dots */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Bước ${s.n}: ${s.title}`}
            aria-current={i === active}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors',
              i === active
                ? 'border-primary bg-primary text-primary-foreground'
                : i < active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40',
            )}
          >
            {s.n}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setActive((a) => Math.max(0, a - 1))}
            disabled={active === 0}
            aria-label="Bước trước"
            className="rounded-md border border-border p-1 text-muted-foreground disabled:opacity-40 hover:enabled:border-primary/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setActive((a) => Math.min(STEPS.length - 1, a + 1))}
            disabled={active === STEPS.length - 1}
            aria-label="Bước sau"
            className="rounded-md border border-border p-1 text-muted-foreground disabled:opacity-40 hover:enabled:border-primary/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active step */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">
          Bước {step.n}/{STEPS.length} — {step.title}
        </h4>
        <CodeBlock code={step.command} lang="bash" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Kỳ vọng: </span>
          {step.expect}
        </p>
        {step.note && (
          <p
            className="text-xs text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono"
            dangerouslySetInnerHTML={{ __html: step.note }}
          />
        )}
      </div>
    </div>
  )
}
