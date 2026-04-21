import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { watch, existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const DEV = process.env.NODE_ENV !== 'production';

// Lightweight .env loader. Precedence: .env.${NODE_ENV} overrides .env.
// Values already in process.env win (so CLI vars still override files).
const envMode = process.env.NODE_ENV || 'development';
for (const file of [`.env.${envMode}`, '.env']) {
  const p = resolve(projectRoot, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  }
}

// Run DB migrations on boot.
await import('./db/migrate.js');

const { cspMiddleware } = await import('./lib/csp-middleware.js');
const { default: db } = await import('./db/sqlite-client.js');
const { broadcastReload, sseStream, addClient } = await import('./lib/sse-reload.js');
const { syncLabsToDb } = await import('./scripts/sync-labs-to-db.js');
const { searchRoutes } = await import('./api/search-routes.js');
const { progressRoutes } = await import('./api/progress-routes.js');
const { leaderboardRoutes } = await import('./api/leaderboard-routes.js');
const { authRoutes } = await import('./auth/github-oauth.js');
const { sessionMiddleware } = await import('./auth/session-middleware.js');

// Sync labs → DB on boot (idempotent).
try { syncLabsToDb(); } catch (err) { console.error('[sync-labs] boot failed:', err.message); }

const app = new Hono();

app.use('*', logger());
app.use('*', cspMiddleware);
app.use('*', sessionMiddleware);

// Health check.
app.get('/healthz', (c) => {
  let dbOk = false;
  try {
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch {}
  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'error',
    uptime: Math.floor(process.uptime()),
    version: process.env.APP_VERSION || 'dev',
  });
});

// Unified SSE endpoint for dev reload.
app.get('/sse/reload', (c) => sseStream(c));

// Back-compat: old labs pages subscribe to /__livereload for dev reload.
if (DEV) {
  app.get('/__livereload', (c) => {
    return new Response(
      new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(enc.encode('retry: 1500\n\n'));
          const send = (chunk) => controller.enqueue(enc.encode(chunk));
          const remove = addClient(send);
          c.req.raw.signal.addEventListener('abort', () => {
            remove();
            try { controller.close(); } catch {}
          });
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }
    );
  });

  const serverDir = resolve(projectRoot, 'server');
  let t;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(() => { broadcastReload(); }, 200);
  };
  if (existsSync(serverDir)) {
    watch(serverDir, { recursive: true }, (_evt, file) => {
      if (!file) return;
      if (/\.(js|json|sql)$/i.test(file)) debounced();
    });
  }
  console.log('[hoc-cloud-labs] dev live-reload watching server/');
}

// Auth routes (OAuth flow)
app.route('/', authRoutes);

// API routes (nginx serves SPA + static assets from app/dist).
app.route('/', searchRoutes);
app.route('/', progressRoutes);
app.route('/', leaderboardRoutes);

app.notFound((c) => c.text('Not Found', 404));

// Session cleanup: delete expired sessions every hour
const cleanupSessions = () => {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  if (result.changes > 0) {
    console.log(`[session-cleanup] deleted ${result.changes} expired sessions`);
  }
};
cleanupSessions();
setInterval(cleanupSessions, 60 * 60 * 1000);

const port = Number(process.env.PORT) || 8387;

serve({ fetch: app.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, (info) => {
  console.log(`[hoc-cloud-labs] serving on http://${info.address}:${info.port}`);
});
