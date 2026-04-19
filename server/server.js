import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
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

// Sync labs → DB on boot (idempotent).
try { syncLabsToDb(); } catch (err) { console.error('[sync-labs] boot failed:', err.message); }

const app = new Hono();

app.use('*', logger());
app.use('*', cspMiddleware);

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

  const labsDir = resolve(projectRoot, 'labs');
  const serverDir = resolve(projectRoot, 'server');
  let t;
  const debounced = (isLab) => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (isLab) { try { syncLabsToDb(); } catch (err) { console.warn('[sync-labs] watch failed:', err.message); } }
      broadcastReload();
    }, 200);
  };
  for (const dir of [labsDir, serverDir]) {
    if (existsSync(dir)) {
      const isLabsDir = dir === labsDir;
      watch(dir, { recursive: true }, (_evt, file) => {
        if (!file) return;
        if (/\.(html|css|js|json|svg|png|jpg|webp|sql)$/i.test(file)) debounced(isLabsDir);
      });
    }
  }
  console.log('[hoc-cloud-labs] dev live-reload watching labs/ + server/');
}

// API routes (mount before static catchall).
app.route('/', searchRoutes);
app.route('/', progressRoutes);

// Static files (labs assets + shared).
app.use(
  '/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) => (path === '/' ? '/labs/index.html' : `/labs${path}`),
    onFound: (_path, c) => {
      c.header('Cache-Control', DEV ? 'no-store' : 'public, max-age=300');
    },
  })
);

app.notFound((c) => c.text('Not Found', 404));

const port = Number(process.env.PORT) || 8387;

serve({ fetch: app.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, (info) => {
  console.log(`[hoc-cloud-labs] serving on http://${info.address}:${info.port}`);
});
