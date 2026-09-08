import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import fs from 'fs';
import viteConfig from './vite.config';

const PORT = 3000;
const app = express();

app.use(express.json());

// API health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

async function startServer() {
  // Vite middleware (dev mode)
  if (process.env.NODE_ENV !== 'production') {
    const userConfig = typeof viteConfig === 'function'
      ? await viteConfig({ mode: 'development', command: 'serve' })
      : viteConfig;

    const vite = await createViteServer({
      ...userConfig,
      configFile: false,
      server: {
        ...(userConfig.server || {}),
        middlewareMode: true,
      },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('/data', express.static(path.join(process.cwd(), 'data')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = createHttpServer(app);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor ERP corriendo en http://localhost:${PORT}\n`);
  });
}

startServer();
