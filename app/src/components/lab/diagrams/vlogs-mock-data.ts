/**
 * Mock data dùng chung cho VictoriaLogs playground (Phase 3 architecture-flow + Phase 4 LogsQL evaluator).
 * Shape định nghĩa 1 lần ở đây (DRY). Tên field (_msg/_time/_stream/app_name/hostname/level) khớp với
 * field thật VictoriaLogs sinh ra khi nhận log syslog (rfc5424) — verify trên Ubuntu 24.04 + rsyslog,
 * VictoriaLogs v1.50.0. Giá trị (web1/nginx...) là kịch bản nhiều host để minh hoạ phong phú hơn.
 */

// ── Log entries ────────────────────────────────────────────────────────────
// tMinusSec = số giây TRƯỚC mốc "now" (entry mới nhất tMinusSec=0). Evaluator (Phase 4)
// dùng tMinusSec để mô phỏng filter _time:Nm (vd _time:5m → tMinusSec <= 300).

export interface VLogEntry {
  id: number
  tMinusSec: number   // giây trước "now"
  time: string        // hiển thị (HH:MM:SS, deterministic)
  stream: string      // _stream: {app_name=...,hostname=...}
  hostname: string
  app_name: string
  level: 'info' | 'warn' | 'error' | 'debug'
  msg: string
}

const S = (app: string, host: string) => `{app_name="${app}",hostname="${host}"}`

export const MOCK_LOGS: VLogEntry[] = [
  { id: 1,  tMinusSec: 12,  time: '10:42:18', stream: S('nginx', 'web1'), hostname: 'web1', app_name: 'nginx', level: 'info',  msg: 'GET /api/labs 200 14ms' },
  { id: 2,  tMinusSec: 31,  time: '10:41:59', stream: S('nginx', 'web1'), hostname: 'web1', app_name: 'nginx', level: 'info',  msg: 'GET /api/search?q=dns 200 8ms' },
  { id: 3,  tMinusSec: 47,  time: '10:41:43', stream: S('nginx', 'web2'), hostname: 'web2', app_name: 'nginx', level: 'warn',  msg: 'upstream response slow 1200ms /api/labs' },
  { id: 4,  tMinusSec: 65,  time: '10:41:25', stream: S('sshd', 'web1'),  hostname: 'web1', app_name: 'sshd',  level: 'warn',  msg: 'Failed password for invalid user admin from 10.0.0.9' },
  { id: 5,  tMinusSec: 88,  time: '10:41:02', stream: S('sshd', 'web1'),  hostname: 'web1', app_name: 'sshd',  level: 'error', msg: 'error: maximum authentication attempts exceeded for root' },
  { id: 6,  tMinusSec: 120, time: '10:40:30', stream: S('app', 'db1'),    hostname: 'db1',  app_name: 'app',   level: 'error', msg: 'connection refused: dial tcp 127.0.0.1:5432 connect: connection refused' },
  { id: 7,  tMinusSec: 145, time: '10:40:05', stream: S('app', 'web1'),   hostname: 'web1', app_name: 'app',   level: 'info',  msg: 'user login uid=42 ok' },
  { id: 8,  tMinusSec: 162, time: '10:39:48', stream: S('nginx', 'web2'), hostname: 'web2', app_name: 'nginx', level: 'info',  msg: 'GET / 200 3ms' },
  { id: 9,  tMinusSec: 190, time: '10:39:20', stream: S('app', 'db1'),    hostname: 'db1',  app_name: 'app',   level: 'warn',  msg: 'slow query 850ms SELECT * FROM labs' },
  { id: 10, tMinusSec: 210, time: '10:39:00', stream: S('app', 'web1'),   hostname: 'web1', app_name: 'app',   level: 'error', msg: 'unhandled exception: TypeError cannot read property slug' },
  { id: 11, tMinusSec: 240, time: '10:38:30', stream: S('nginx', 'web1'), hostname: 'web1', app_name: 'nginx', level: 'info',  msg: 'GET /api/progress 304 2ms' },
  { id: 12, tMinusSec: 275, time: '10:37:55', stream: S('sshd', 'web2'),  hostname: 'web2', app_name: 'sshd',  level: 'info',  msg: 'Accepted publickey for deploy from 10.0.0.4' },
  { id: 13, tMinusSec: 305, time: '10:37:25', stream: S('app', 'db1'),    hostname: 'db1',  app_name: 'app',   level: 'error', msg: 'panic: runtime error: index out of range [3] with length 3' },
  { id: 14, tMinusSec: 360, time: '10:36:30', stream: S('nginx', 'web2'), hostname: 'web2', app_name: 'nginx', level: 'warn',  msg: 'client closed connection before response /api/labs' },
  { id: 15, tMinusSec: 410, time: '10:35:40', stream: S('app', 'web1'),   hostname: 'web1', app_name: 'app',   level: 'info',  msg: 'cache warmed entries=128 in 42ms' },
  { id: 16, tMinusSec: 455, time: '10:34:55', stream: S('sshd', 'web1'),  hostname: 'web1', app_name: 'sshd',  level: 'error', msg: 'Disconnecting invalid user oracle 10.0.0.9 port 51234' },
  { id: 17, tMinusSec: 520, time: '10:33:50', stream: S('nginx', 'web1'), hostname: 'web1', app_name: 'nginx', level: 'info',  msg: 'GET /healthz 200 1ms' },
  { id: 18, tMinusSec: 610, time: '10:32:20', stream: S('app', 'db1'),    hostname: 'db1',  app_name: 'app',   level: 'debug', msg: 'pool stats active=2 idle=8 wait=0' },
  { id: 19, tMinusSec: 720, time: '10:30:30', stream: S('app', 'web1'),   hostname: 'web1', app_name: 'app',   level: 'warn',  msg: 'deprecated config key meili_host used, rename to meilisearch_host' },
  { id: 20, tMinusSec: 905, time: '10:27:25', stream: S('nginx', 'web2'), hostname: 'web2', app_name: 'nginx', level: 'error', msg: '502 Bad Gateway upstream timed out /api/search' },
]

// ── Architecture components (Phase 3 explorer) ───────────────────────────────

export type VLogsTopology = 'single' | 'cluster' | 'both'

export interface VLogsComponent {
  id: string
  label: string
  role: string          // vai trò ngắn gọn (HTML inline cho phép <a>/<code>)
  port: string          // cổng/endpoint minh hoạ
  topology: VLogsTopology
  config?: string       // ví dụ flag/khởi động (HTML inline)
}

export const VLOGS_COMPONENTS: VLogsComponent[] = [
  {
    id: 'source',
    label: 'App / journald',
    role: 'Nguồn sinh log (service, ứng dụng, kernel).',
    port: '—',
    topology: 'both',
  },
  {
    id: 'collector',
    label: 'rsyslog (collector)',
    role: 'Thu log local rồi forward về VictoriaLogs qua giao thức syslog (RFC 5424).',
    port: 'TCP/UDP 514 → cổng syslog của VictoriaLogs',
    topology: 'both',
    config: '<code>action(type="omfwd" target="..." port="5410" protocol="tcp" template="RSYSLOG_SyslogProtocol23Format")</code>',
  },
  {
    id: 'victoria-logs',
    label: 'victoria-logs (single-node)',
    role: 'Một binary duy nhất: nhận ingest, lưu trữ (column-oriented), và phục vụ truy vấn LogsQL.',
    port: 'HTTP 9428',
    topology: 'single',
    config: '<code>victoria-logs -storageDataPath=/var/lib/victoria-logs -httpListenAddr=:9428 -syslog.listenAddr.tcp=:5410</code>',
  },
  {
    id: 'vlinsert',
    label: 'vlinsert',
    role: 'Tầng nhận ingest của bản cluster — định tuyến log tới vlstorage.',
    port: 'HTTP (cấu hình qua -httpListenAddr)',
    topology: 'cluster',
  },
  {
    id: 'vlstorage',
    label: 'vlstorage',
    role: 'Tầng lưu trữ cluster — lưu log nén theo cột.',
    port: 'HTTP (cấu hình qua -httpListenAddr)',
    topology: 'cluster',
  },
  {
    id: 'vlselect',
    label: 'vlselect',
    role: 'Tầng truy vấn cluster — nhận LogsQL, gom kết quả từ các vlstorage.',
    port: 'HTTP (cấu hình qua -httpListenAddr)',
    topology: 'cluster',
  },
  {
    id: 'vmui',
    label: 'vmui (UI tích hợp)',
    role: 'Giao diện web sẵn có để chạy LogsQL và xem log.',
    port: 'HTTP 9428 tại /select/vmui',
    topology: 'both',
  },
]

/** Field đặc biệt của VictoriaLogs (dùng cho concept cards / LogsQL evaluator). */
export const VLOGS_SPECIAL_FIELDS = ['_time', '_msg', '_stream', '_stream_id'] as const
