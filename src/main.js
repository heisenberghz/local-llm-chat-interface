/**
 * App entry — initializes all modules.
 */

import { initChat } from './js/chat.js';
import { initSidebar } from './js/sidebar.js';
import { initSettings } from './js/settings.js';
import { initExport } from './js/export.js';
import { initTheme, toggleTheme, getCurrentTheme } from './js/theme.js';
import { initMarkdown } from './js/markdown.js';
import { fetchModels, fetchSettings, saveSettings } from './js/storage.js';
import { formatSize } from './js/utils.js';

async function init() {
  // Load settings and apply theme
  let settings = {};
  try {
    settings = await fetchSettings();
    localStorage.setItem('localchat-settings', JSON.stringify(settings));
  } catch {
    // Offline or server not running — use defaults
  }

  initTheme(settings.theme);

  // Initialize markdown renderer
  await initMarkdown();

  // Initialize modules
  initChat();
  await initSidebar();
  initSettings();
  initExport();

  // Theme toggle
  document.getElementById('btn-theme-toggle').addEventListener('click', async () => {
    const newTheme = toggleTheme();
    try {
      await saveSettings({ theme: newTheme });
    } catch {
      // Save locally anyway
    }
  });

  // Load models into dropdown
  await loadModels();

  // Refresh models when settings change
  window.addEventListener('settings-saved', loadModels);
}

async function loadModels() {
  const select = document.getElementById('model-select');

  try {
    const models = await fetchModels();

    if (models.length === 0) {
      select.innerHTML = '<option value="">No models found</option>';
      return;
    }

    select.innerHTML = '';
    const settings = JSON.parse(localStorage.getItem('localchat-settings') || '{}');

    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.name;
      const size = m.size ? ` (${formatSize(m.size)})` : '';
      opt.textContent = `${m.name}${size}`;
      if (m.name === settings.defaultModel) opt.selected = true;
      select.appendChild(opt);
    }
  } catch {
    select.innerHTML = '<option value="">Ollama not connected</option>';
  }
}

// Boot
init().catch(console.error);
