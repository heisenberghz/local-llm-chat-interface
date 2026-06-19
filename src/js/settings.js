/**
 * Settings modal logic.
 */

import { fetchSettings, saveSettings, fetchModels } from './storage.js';
import { applyTheme } from './theme.js';

export function initSettings() {
  const modal = document.getElementById('settings-modal');
  const btnOpen = document.getElementById('btn-settings');
  const btnClose = document.getElementById('btn-close-settings');
  const btnCancel = document.getElementById('btn-cancel-settings');
  const btnSave = document.getElementById('btn-save-settings');
  const btnTest = document.getElementById('btn-test-connection');

  btnOpen.addEventListener('click', openSettings);
  btnClose.addEventListener('click', closeSettings);
  btnCancel.addEventListener('click', closeSettings);
  btnSave.addEventListener('click', handleSave);
  btnTest.addEventListener('click', testConnection);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettings();
  });
}

async function openSettings() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'flex';

  try {
    const settings = await fetchSettings();
    document.getElementById('settings-ollama-url').value = settings.ollamaUrl || 'http://localhost:11434';
    document.getElementById('settings-system-prompt').value = settings.systemPrompt || '';

    // Populate default model dropdown
    const modelSelect = document.getElementById('settings-default-model');
    try {
      const models = await fetchModels();
      modelSelect.innerHTML = '<option value="">None</option>';
      for (const m of models) {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        if (m.name === settings.defaultModel) opt.selected = true;
        modelSelect.appendChild(opt);
      }
    } catch {
      modelSelect.innerHTML = '<option value="">Cannot load models</option>';
    }

    // Store in localStorage for chat module to read
    localStorage.setItem('localchat-settings', JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Clear status
  document.getElementById('connection-status').textContent = '';
}

function closeSettings() {
  document.getElementById('settings-modal').style.display = 'none';
}

async function handleSave() {
  const settings = {
    ollamaUrl: document.getElementById('settings-ollama-url').value.trim(),
    defaultModel: document.getElementById('settings-default-model').value,
    systemPrompt: document.getElementById('settings-system-prompt').value.trim(),
  };

  try {
    const saved = await saveSettings(settings);
    localStorage.setItem('localchat-settings', JSON.stringify(saved));
    closeSettings();

    // Refresh model list in topbar
    window.dispatchEvent(new CustomEvent('settings-saved'));
  } catch (err) {
    alert('Failed to save settings: ' + err.message);
  }
}

async function testConnection() {
  const status = document.getElementById('connection-status');
  const url = document.getElementById('settings-ollama-url').value.trim();
  status.textContent = 'Testing...';
  status.className = 'connection-status';

  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const count = (data.models || []).length;
      status.textContent = `✓ Connected (${count} model${count !== 1 ? 's' : ''} found)`;
      status.className = 'connection-status success';
    } else {
      status.textContent = '✗ Server responded with error';
      status.className = 'connection-status error';
    }
  } catch {
    status.textContent = '✗ Cannot reach Ollama at this URL';
    status.className = 'connection-status error';
  }
}
