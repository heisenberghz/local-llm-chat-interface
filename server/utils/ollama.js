import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json');

/**
 * Read current settings from disk.
 */
export function getSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return { ollamaUrl: 'http://localhost:11434', defaultModel: '', theme: 'dark', systemPrompt: '' };
  }
}

/**
 * Build the full Ollama API URL for a given path.
 */
export function ollamaUrl(apiPath) {
  const settings = getSettings();
  const base = settings.ollamaUrl.replace(/\/+$/, '');
  return `${base}${apiPath}`;
}

/**
 * Check if Ollama is reachable.
 */
export async function checkOllamaHealth() {
  try {
    const res = await fetch(ollamaUrl('/api/tags'), { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}
