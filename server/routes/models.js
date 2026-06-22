import { Router } from 'express';
import { Readable } from 'stream';
import { ollamaUrl } from '../utils/ollama.js';

const router = Router();

/**
 * GET /api/models
 * Returns list of locally installed Ollama models.
 */
router.get('/', async (_req, res) => {
  try {
    const ollamaRes = await fetch(ollamaUrl('/api/tags'), {
      signal: AbortSignal.timeout(5000),
    });

    if (!ollamaRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch models from Ollama' });
    }

    const data = await ollamaRes.json();
    const models = (data.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
      digest: m.digest,
      details: m.details || {},
    }));

    res.json({ models });
  } catch (err) {
    res.status(502).json({
      error: `Cannot connect to Ollama. Is it running? (${err.message})`,
    });
  }
});

/**
 * POST /api/models/pull
 * Triggers pulling a new model from Ollama, streaming progress events.
 */
router.post('/pull', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const ollamaRes = await fetch(ollamaUrl('/api/pull'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      return res.status(ollamaRes.status).json({ error: errorText || 'Failed to trigger model pull' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (ollamaRes.body) {
      Readable.fromWeb(ollamaRes.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('Error proxying model pull:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: `Cannot reach Ollama for pull request: ${err.message}` });
    } else {
      res.end();
    }
  }
});

export default router;

