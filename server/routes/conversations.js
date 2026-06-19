import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONV_DIR = path.join(__dirname, '..', 'data', 'conversations');

// Ensure conversations directory exists
if (!fs.existsSync(CONV_DIR)) {
  fs.mkdirSync(CONV_DIR, { recursive: true });
}

const router = Router();

function convPath(id) {
  return path.join(CONV_DIR, `${id}.json`);
}

/**
 * GET /api/conversations
 * List all conversations (id, title, lastMessageAt, messageCount).
 */
router.get('/', (_req, res) => {
  try {
    const files = fs.readdirSync(CONV_DIR).filter((f) => f.endsWith('.json'));
    const conversations = files
      .map((f) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(CONV_DIR, f), 'utf-8'));
          return {
            id: data.id,
            title: data.title,
            lastMessageAt: data.lastMessageAt,
            messageCount: (data.messages || []).length,
            model: data.model || '',
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation with all messages.
 */
router.get('/:id', (req, res) => {
  const filePath = convPath(req.params.id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation.
 */
router.post('/', (req, res) => {
  const id = uuidv4();
  const conversation = {
    id,
    title: req.body.title || 'New Chat',
    model: req.body.model || '',
    systemPrompt: req.body.systemPrompt || '',
    messages: [],
    createdAt: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(convPath(id), JSON.stringify(conversation, null, 2));
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/conversations/:id
 * Update conversation (title, messages, model, etc).
 */
router.put('/:id', (req, res) => {
  const filePath = convPath(req.params.id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id, // prevent id override
      lastMessageAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/conversations/:id
 */
router.delete('/:id', (req, res) => {
  const filePath = convPath(req.params.id);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
