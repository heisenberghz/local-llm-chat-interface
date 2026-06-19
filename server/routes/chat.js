import { Router } from 'express';
import { ollamaUrl } from '../utils/ollama.js';

const router = Router();

// Active abort controllers keyed by a request id
const activeStreams = new Map();

/**
 * POST /api/chat
 * Forwards messages to Ollama and streams the response back.
 */
router.post('/', async (req, res) => {
  const { model, messages, stream = true, requestId, options } = req.body;

  if (!model || !messages) {
    return res.status(400).json({ error: 'model and messages are required' });
  }

  const controller = new AbortController();
  if (requestId) activeStreams.set(requestId, controller);

  try {
    const ollamaRes = await fetch(ollamaUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream, options }),
      signal: controller.signal,
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      return res.status(ollamaRes.status).json({ error: errText || 'Ollama request failed' });
    }

    if (!stream) {
      const data = await ollamaRes.json();
      return res.json(data);
    }

    // Stream response back to client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done && !buffer) break;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        const lines = buffer.split('\n');
        if (done) {
          buffer = '';
        } else {
          buffer = lines.pop(); // Keep the last incomplete line in the buffer
        }

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            res.write(`data: ${JSON.stringify(parsed)}\n\n`);

            if (parsed.done) {
              res.write('data: [DONE]\n\n');
            }
          } catch {
            // Skip malformed lines (though with buffering we shouldn't have any)
          }
        }

        if (done) break;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      }
    }

    res.end();
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(499).end();
    }
    return res.status(502).json({ error: `Cannot connect to Ollama. Is it running? (${err.message})` });
  } finally {
    if (requestId) activeStreams.delete(requestId);
  }
});

/**
 * POST /api/chat/stop
 * Aborts an in-progress generation.
 */
router.post('/stop', (req, res) => {
  const { requestId } = req.body;
  const controller = activeStreams.get(requestId);
  if (controller) {
    controller.abort();
    activeStreams.delete(requestId);
    return res.json({ stopped: true });
  }
  res.json({ stopped: false });
});

export default router;
