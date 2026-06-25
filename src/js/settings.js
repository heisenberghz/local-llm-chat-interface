/**
 * Settings modal logic.
 */

import { fetchSettings, saveSettings, fetchModels } from './storage.js';

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

  // Range sliders UI updates
  document.getElementById('settings-tts-rate').addEventListener('input', (e) => {
    document.getElementById('val-tts-rate').textContent = `${e.target.value}x`;
  });
  document.getElementById('settings-tts-pitch').addEventListener('input', (e) => {
    document.getElementById('val-tts-pitch').textContent = e.target.value;
  });

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

    // Populate default models list
    await populateDefaultModels(settings.defaultModel);

    // Populate voices list
    populateVoices(settings.ttsVoice);
    if (window.speechSynthesis !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => populateVoices(settings.ttsVoice);
    }

    // Set voice form values
    document.getElementById('settings-tts-autoread').checked = !!settings.ttsAutoread;
    
    const rateVal = settings.ttsRate !== undefined ? settings.ttsRate : 1.0;
    document.getElementById('settings-tts-rate').value = rateVal;
    document.getElementById('val-tts-rate').textContent = `${rateVal}x`;

    const pitchVal = settings.ttsPitch !== undefined ? settings.ttsPitch : 1.0;
    document.getElementById('settings-tts-pitch').value = pitchVal;
    document.getElementById('val-tts-pitch').textContent = pitchVal;

    // Store in localStorage for chat module to read
    localStorage.setItem('localchat-settings', JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Clear status
  document.getElementById('connection-status').textContent = '';
}

function populateVoices(selectedVoiceName) {
  const voiceSelect = document.getElementById('settings-tts-voice');
  if (!voiceSelect) return;

  if (typeof window.speechSynthesis === 'undefined') {
    voiceSelect.innerHTML = '<option value="">Not supported in browser</option>';
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = '<option value="">Default System Voice</option>';

  for (const voice of voices) {
    const opt = document.createElement('option');
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    if (voice.name === selectedVoiceName) opt.selected = true;
    voiceSelect.appendChild(opt);
  }
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
    ttsVoice: document.getElementById('settings-tts-voice').value,
    ttsAutoread: document.getElementById('settings-tts-autoread').checked,
    ttsRate: parseFloat(document.getElementById('settings-tts-rate').value),
    ttsPitch: parseFloat(document.getElementById('settings-tts-pitch').value),
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

