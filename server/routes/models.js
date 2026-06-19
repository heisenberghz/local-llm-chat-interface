import { Router } from 'express';
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

export default router;
