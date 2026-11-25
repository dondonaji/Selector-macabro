import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverHorrorFilms,
  fetchPosterImageBytes,
  resolveFilmPoster,
} from './lib/horrorBackend.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Resolve official theatrical poster URL from Wikipedia / Wikimedia
  app.get('/api/poster', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    const title = typeof req.query.title === 'string' ? req.query.title : '';
    const originalTitle =
      typeof req.query.originalTitle === 'string' ? req.query.originalTitle : undefined;
    const yearRaw = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
    const director = typeof req.query.director === 'string' ? req.query.director : undefined;

    if (!title) {
      res.status(400).json({ error: 'Falta el título de la película.' });
      return;
    }

    const result = await resolveFilmPoster({
      id,
      title,
      originalTitle,
      year: Number.isFinite(yearRaw) ? yearRaw : undefined,
      director,
    });

    res.json(result);
  });

  // 2. Proxy Wikimedia poster image bytes cleanly (avoids hotlink/CORS failures)
  app.get('/api/poster-image', async (req, res) => {
    const targetUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const result = await fetchPosterImageBytes(targetUrl);

    if (!result.ok || !result.buffer) {
      res.status(result.status).send(result.error || 'No se pudo cargar el cartel');
      return;
    }

    res.setHeader('Content-Type', result.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result.buffer);
  });

  // 3. Internet-wide Horror Discovery via Gemini + Google Search Grounding
  app.post('/api/discover', async (req, res) => {
    const result = await discoverHorrorFilms(req.body ?? {});
    if (!result.ok || !result.data) {
      res.status(result.status).json({
        error: result.error || 'Error al buscar sugerencias en internet.',
      });
      return;
    }
    res.json(result.data);
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Linaje Macabro server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
