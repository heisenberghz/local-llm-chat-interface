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

/**
 * DELETE /api/models
 * Deletes a local model from Ollama.
 */
router.delete('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const ollamaRes = await fetch(ollamaUrl('/api/delete'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text();
      return res.status(ollamaRes.status).json({ error: errorText || 'Failed to delete model' });
    }

    // Ollama delete returns 200 OK with no body. We return a JSON success message.
    res.json({ success: true, message: `Model ${name} deleted successfully` });
  } catch (err) {
    console.error('Error deleting model:', err);
    res.status(502).json({ error: `Cannot reach Ollama: ${err.message}` });
  }
});

/**
 * GET /api/models/details
 * Fetches Hugging Face model metadata, files tree, and README raw text.
 */
router.get('/details', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Model ID is required' });
  }

  try {
    // 1. Fetch model metadata (request siblings=true to fetch file lists)
    const modelUrl = `https://huggingface.co/api/models/${id}?siblings=true`;
    const hfRes = await fetch(modelUrl, {
      headers: { 'User-Agent': 'Aether-Local-LLM-Workspace' }
    });

    if (!hfRes.ok) {
      if (hfRes.status === 401 || hfRes.status === 403) {
        return res.status(403).json({ error: 'Repository is gated or private. Please check repository source on Hugging Face.' });
      }
      return res.status(hfRes.status).json({ error: `Hugging Face returned status ${hfRes.status}` });
    }

    const hfData = await hfRes.json();
    const branch = hfData.defaultBranch || 'main';

    // 2. Fetch files tree to obtain exact sizes (fail-safe)
    let fileSizes = {};
    try {
      const treeRes = await fetch(`https://huggingface.co/api/models/${id}/tree/${branch}`, {
        headers: { 'User-Agent': 'Aether-Local-LLM-Workspace' },
        signal: AbortSignal.timeout(3000)
      });
      if (treeRes.ok) {
        const files = await treeRes.json();
        files.forEach(f => {
          if (f.path && f.size) {
            fileSizes[f.path] = f.size;
          }
        });
      }
    } catch (e) {
      console.warn('Failed to fetch tree sizes:', e.message);
    }

    // 3. Fetch raw README content (fail-safe)
    let readmeText = '';
    const readmeUrls = [
      `https://huggingface.co/${id}/raw/${branch}/README.md`,
      `https://huggingface.co/${id}/raw/master/README.md`
    ];

    for (const url of readmeUrls) {
      try {
        const readmeRes = await fetch(url, {
          headers: { 'User-Agent': 'Aether-Local-LLM-Workspace' },
          signal: AbortSignal.timeout(3000)
        });
        if (readmeRes.ok) {
          readmeText = await readmeRes.text();
          break;
        }
      } catch (e) {
        console.warn(`Failed to fetch readme from ${url}:`, e.message);
      }
    }

    res.json({
      metadata: hfData,
      fileSizes,
      readme: readmeText
    });
  } catch (err) {
    console.error('Error fetching model details:', err);
    res.status(502).json({ error: `Failed to fetch repository details: ${err.message}` });
  }
});

export default router;

