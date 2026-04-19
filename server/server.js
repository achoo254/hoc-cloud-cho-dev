import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const app = new Hono();

app.use('*', logger());

app.use(
  '/*',
  serveStatic({
    root: './',
    rewriteRequestPath: (path) => (path === '/' ? '/labs/index.html' : `/labs${path}`),
    onFound: (_path, c) => {
      c.header('Cache-Control', 'public, max-age=300');
    },
  })
);

app.notFound((c) => c.text('Not Found', 404));

const port = Number(process.env.PORT) || 8387;

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
  console.log(`[hoc-cloud-labs] serving ${projectRoot}/labs on http://127.0.0.1:${info.port}`);
});
