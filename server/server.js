import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { watch, existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const DEV = process.env.NODE_ENV !== 'production';

const envMode = process.env.NODE_ENV || 'development';
const envBase = DEV ? projectRoot : process.cwd();
for (const file of [`.env.${envMode}`, '.env']) {
  const p = resolve(envBase, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  }
}

import { connectMongo, getMongoStatus } from './db/mongo-client.js';
import { getMeiliStatus } from './db/meilisearch-client.js';

await connectMongo();

const { cspMiddleware } = await import('./lib/csp-middleware.js');
const { broadcastReload, sseStream, addClient } = await import('./lib/sse-reload.js');
const { syncLabsToDb } = await import('./scripts/sync-labs-to-db.js');
const { searchRoutes } = await import('./api/search-routes.js');
const { progressRoutes } = await import('./api/progress-routes.js');
const { leaderboardRoutes } = await import('./api/leaderboard-routes.js');
const { authRoutes } = await import('./auth/firebase-auth.js');
const { sessionMiddleware } = await import('./auth/session-middleware.js');

try { await syncLabsToDb(); } catch (err) { console.error('[sync-labs] boot failed:', err.message); }

const app = new Hono();

app.use('*', logger());
app.use('*', cspMiddleware);
app.use('*', sessionMiddleware);

app.get('/healthz', async (c) => {
  const mongo = getMongoStatus();
  const meili = await getMeiliStatus();

  return c.json({
    status: mongo.connected && meili.healthy ? 'ok' : 'degraded',
    mongo,
    meilisearch: meili,
    uptime: Math.floor(process.uptime()),
    version: process.env.APP_VERSION || 'dev',
  });
});

app.get('/sse/reload', (c) => sseStream(c));

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
      if (/\.(js|json)$/i.test(file)) debounced();
    });
  }
  console.log('[hoc-cloud-labs] dev live-reload watching server/');
}

app.route('/', authRoutes);
app.route('/', searchRoutes);
app.route('/', progressRoutes);
app.route('/', leaderboardRoutes);

app.notFound((c) => c.text('Not Found', 404));

const port = Number(process.env.PORT) || 8387;

serve({ fetch: app.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, (info) => {
  console.log(`[hoc-cloud-labs] serving on http://${info.address}:${info.port}`);
});
