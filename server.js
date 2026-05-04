import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import server from './dist/server/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = new Hono();

// Serve static assets from dist/client
app.use('/assets/*', serveStatic({ root: './dist/client' }));
app.use('/favicon.ico', serveStatic({ path: './dist/client/favicon.ico' }));

// Handle all other requests via the TanStack Start server
app.all('*', async (c) => {
  try {
    const res = await server.fetch(c.req.raw);
    return res;
  } catch (err) {
    console.error('SSR Error:', err);
    return c.text('Internal Server Error', 500);
  }
});

const port = process.env.PORT || 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port: Number(port)
});
