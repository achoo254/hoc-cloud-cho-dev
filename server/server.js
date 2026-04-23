import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { createNodeWebSocket } from '@hono/node-ws';
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

// Dynamic imports — modules read process.env tại top-level, phải chạy SAU khi
// .env loader ở trên đã populate env. Static import sẽ hoisted và chạy trước
// loader, khiến MEILISEARCH_API_KEY/MONGODB_URI undefined trên VPS (PM2 không
// inject env từ .env file, chỉ server.js self-load).
const { connectMongo, getMongoStatus } = await import('./db/mongo-client.js');
const { getMeiliStatus } = await import('./db/meilisearch-client.js');

await connectMongo();

const { cspMiddleware } = await import('./lib/csp-middleware.js');
const { broadcastReload, sseStream, addClient } = await import('./lib/sse-reload.js');
const { searchRoutes } = await import('./api/search-routes.js');
const { progressRoutes } = await import('./api/progress-routes.js');
const { leaderboardRoutes } = await import('./api/leaderboard-routes.js');
const { labsRoutes } = await import('./api/labs-routes.js');
const { authRoutes } = await import('./auth/firebase-auth.js');
const { sessionMiddleware } = await import('./auth/session-middleware.js');
const { mountTerminalRoutes } = await import('./terminal/terminal-routes.js');
const { startCleanupCron } = await import('./terminal/cleanup-cron.js');

const app = new Hono();

// WS upgrade must be attached to the TOP-LEVEL app so injectWebSocket() can
// find the /ws/* routes when the HTTP server upgrades.
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

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
app.route('/', labsRoutes);

mountTerminalRoutes(app, upgradeWebSocket);

app.notFound((c) => c.text('Not Found', 404));

const port = Number(process.env.PORT) || 8387;

const server = serve({ fetch: app.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, (info) => {
  console.log(`[hoc-cloud-labs] serving on http://${info.address}:${info.port}`);
});

// Wire WS upgrade onto the node http.Server.
injectWebSocket(server);

// Start idle/orphan cleanup loop for terminal sessions.
if (process.env.TERMINAL_CLEANUP_DISABLED !== '1') {
  startCleanupCron();
}
