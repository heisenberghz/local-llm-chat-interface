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
  const btnPull = document.getElementById('btn-pull-model');

  btnOpen.addEventListener('click', openSettings);
  btnClose.addEventListener('click', closeSettings);
  btnCancel.addEventListener('click', closeSettings);
  btnSave.addEventListener('click', handleSave);
  btnTest.addEventListener('click', testConnection);
  btnPull.addEventListener('click', handlePullModel);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettings();
  });
}

async function openSettings() {
  const modal = document.getElementById('settings-modal');
  modal.style.display = 'flex';

  // Reset pull inputs and progress
  document.getElementById('settings-pull-model').value = '';
  document.getElementById('pull-progress-container').style.display = 'none';
  document.getElementById('pull-progress-bar').style.width = '0%';
  document.getElementById('pull-progress-bar').style.backgroundColor = '';
  document.getElementById('pull-status-text').textContent = 'Ready';
  document.getElementById('pull-percent-text').textContent = '0%';
  document.getElementById('btn-pull-model').disabled = false;

  try {
    const settings = await fetchSettings();
    document.getElementById('settings-ollama-url').value = settings.ollamaUrl || 'http://localhost:11434';
    document.getElementById('settings-system-prompt').value = settings.systemPrompt || '';

    await populateDefaultModels(settings.defaultModel);

    // Store in localStorage for chat module to read
    localStorage.setItem('localchat-settings', JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Clear status
  document.getElementById('connection-status').textContent = '';
}

async function populateDefaultModels(selectedModelName) {
  const modelSelect = document.getElementById('settings-default-model');
  try {
    const models = await fetchModels();
    modelSelect.innerHTML = '<option value="">None</option>';
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      if (m.name === selectedModelName) opt.selected = true;
      modelSelect.appendChild(opt);
    }
  } catch {
    modelSelect.innerHTML = '<option value="">Cannot load models</option>';
  }
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

async function handlePullModel() {
  const inputPull = document.getElementById('settings-pull-model');
  const btnPull = document.getElementById('btn-pull-model');
  const progressContainer = document.getElementById('pull-progress-container');
  const statusText = document.getElementById('pull-status-text');
  const percentText = document.getElementById('pull-percent-text');
  const progressBar = document.getElementById('pull-progress-bar');

  const modelName = inputPull.value.trim();
  if (!modelName) {
    alert('Please enter a model name to download.');
    return;
  }

  // Set UI state
  btnPull.disabled = true;
  progressContainer.style.display = 'flex';
  statusText.textContent = 'Contacting Ollama...';
  percentText.textContent = '0%';
  progressBar.style.width = '0%';
  progressBar.style.backgroundColor = '';

  try {
    const res = await fetch('/api/models/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!res.ok) {
      let errText = 'Failed to start download';
      try {
        const errJson = await res.json();
        errText = errJson.error || errText;
      } catch {}
      throw new Error(errText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last partial line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          
          if (data.error) {
            throw new Error(data.error);
          }

          if (data.status) {
            statusText.textContent = data.status;
          }

          if (data.completed && data.total) {
            const percent = Math.round((data.completed / data.total) * 100);
            percentText.textContent = `${percent}%`;
            progressBar.style.width = `${percent}%`;
            
            // Format size for better heavyweight styling
            const completedMB = (data.completed / (1024 * 1024)).toFixed(0);
            const totalMB = (data.total / (1024 * 1024)).toFixed(0);
            statusText.textContent = `${data.status} (${completedMB}MB / ${totalMB}MB)`;
          }
        } catch (e) {
          if (e.message.includes('Unexpected end of JSON input') || e.name === 'SyntaxError') {
            continue;
          }
          throw e;
        }
      }
    }

    // Success state
    statusText.textContent = '✓ Download completed successfully!';
    percentText.textContent = '100%';
    progressBar.style.width = '100%';
    inputPull.value = '';

    const settings = await fetchSettings();
    await populateDefaultModels(settings.defaultModel);
    window.dispatchEvent(new CustomEvent('settings-saved'));

  } catch (err) {
    statusText.textContent = `✗ Error: ${err.message}`;
    progressBar.style.backgroundColor = 'var(--text-tertiary)'; // Matte metallic failure state
    console.error('Model pull error:', err);
  } finally {
    btnPull.disabled = false;
  }
}
