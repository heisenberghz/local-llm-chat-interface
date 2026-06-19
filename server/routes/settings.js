import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json');

const DEFAULTS = {
  ollamaUrl: 'http://localhost:11434',
  defaultModel: '',
  theme: 'dark',
  systemPrompt: '',
};

const router = Router();

/**
 * GET /api/settings
 */
router.get('/', (_req, res) => {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULTS, null, 2));
    }
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/settings
 */
router.put('/', (req, res) => {
  try {
    const current = fs.existsSync(SETTINGS_PATH)
      ? JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
      : DEFAULTS;
    const updated = { ...current, ...req.body };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
