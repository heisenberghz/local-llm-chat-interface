/**
 * Model Command Center logic.
 */

import { fetchModels } from './storage.js';
import { formatSize, showConfirm } from './utils.js';

export function initModels() {
  const btnOpen = document.getElementById('btn-models-dashboard');
  const btnClose = document.getElementById('btn-close-models');
  const btnPull = document.getElementById('btn-dashboard-pull');
  const modal = document.getElementById('models-modal');

  if (btnOpen) btnOpen.addEventListener('click', openModelsDashboard);
  if (btnClose) btnClose.addEventListener('click', closeModelsDashboard);
  if (btnPull) btnPull.addEventListener('click', handleDashboardPull);

  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModelsDashboard();
    });
  }

  // Refresh dashboard if settings are saved (e.g. external updates)
  window.addEventListener('settings-saved', () => {
    if (modal && modal.style.display === 'flex') {
      refreshModelsInventory();
    }
  });
}

function openModelsDashboard() {
  const modal = document.getElementById('models-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  // Reset pull inputs and progress
  const inputPull = document.getElementById('dashboard-pull-model');
  const progressContainer = document.getElementById('dashboard-pull-progress');
  const progressBar = document.getElementById('dashboard-pull-bar');
  const btnPull = document.getElementById('btn-dashboard-pull');

  if (inputPull) inputPull.value = '';
  if (progressContainer) progressContainer.style.display = 'none';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '';
  }
  if (btnPull) btnPull.disabled = false;

  refreshModelsInventory();
}

function closeModelsDashboard() {
  const modal = document.getElementById('models-modal');
  if (modal) modal.style.display = 'none';
}

async function refreshModelsInventory() {
  const tbody = document.getElementById('dashboard-model-list');
  const countEl = document.getElementById('inventory-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">Loading models registry...</td></tr>';

  try {
    const models = await fetchModels();
    
    if (countEl) {
      countEl.textContent = `${models.length} model${models.length !== 1 ? 's' : ''} registered`;
    }

    if (models.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">No models currently installed. Pull a model above.</td></tr>';
      return;
    }

    // Get current active model from topbar dropdown
    const topbarSelect = document.getElementById('model-select');
    const activeModelName = topbarSelect ? topbarSelect.value : '';

    tbody.innerHTML = '';

    for (const m of models) {
      const isActive = m.name === activeModelName;
      const row = document.createElement('tr');
      
      const sizeGB = m.size ? formatSize(m.size) : 'Unknown';
      
      row.innerHTML = `
        <td class="model-name-cell">${m.name}</td>
        <td class="model-size-cell font-mono">${sizeGB}</td>
        <td class="model-status-cell">
          <span class="status-indicator ${isActive ? 'active' : 'idle'}"></span>
          <span>${isActive ? 'Active' : 'Idle'}</span>
        </td>
        <td class="model-actions-cell">
          <button class="btn-dashboard-load btn-secondary sm" data-model="${m.name}" ${isActive ? 'disabled' : ''}>
            ${isActive ? 'Active' : 'Load'}
          </button>
          <button class="btn-dashboard-delete btn-danger sm" data-model="${m.name}">
            Delete
          </button>
        </td>
      `;

      // Bind Load Action
      const btnLoad = row.querySelector('.btn-dashboard-load');
      if (btnLoad) {
        btnLoad.addEventListener('click', () => handleLoadModel(m.name));
      }

      // Bind Delete Action
      const btnDelete = row.querySelector('.btn-dashboard-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', () => handleDeleteModel(m.name));
      }

      tbody.appendChild(row);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #D32F2F;">Error loading registry: ${err.message}</td></tr>`;
  }
}

function handleLoadModel(modelName) {
  const topbarSelect = document.getElementById('model-select');
  if (topbarSelect) {
    // Select model in dropdown
    topbarSelect.value = modelName;
    topbarSelect.dispatchEvent(new Event('change'));
  }
  closeModelsDashboard();
}

async function handleDeleteModel(modelName) {
  const confirmed = await showConfirm(`Are you sure you want to delete ${modelName}? This will remove all files from disk.`, 'Delete');
  if (!confirmed) {
    return;
  }

  // Find the row and fade/remove it immediately (Optimistic UI)
  const tbody = document.getElementById('dashboard-model-list');
  const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
  const targetRow = rows.find(row => {
    const cell = row.querySelector('.model-name-cell');
    return cell && cell.textContent.trim() === modelName;
  });

  if (targetRow) {
    targetRow.style.transition = 'opacity 200ms ease';
    targetRow.style.opacity = '0';
    setTimeout(() => targetRow.remove(), 200);
  }

  // Optimistically decrement count
  const countEl = document.getElementById('inventory-count');
  if (countEl) {
    const currentCount = parseInt(countEl.textContent, 10);
    if (!isNaN(currentCount) && currentCount > 0) {
      countEl.textContent = `${currentCount - 1} model${(currentCount - 1) !== 1 ? 's' : ''} registered`;
    }
  }

  try {
    const res = await fetch('/api/models', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    if (!res.ok) {
      let errText = 'Failed to delete model';
      try {
        const errJson = await res.json();
        errText = errJson.error || errText;
      } catch {}
      throw new Error(errText);
    }

    // Refresh model list in topbar
    window.dispatchEvent(new CustomEvent('settings-saved'));

  } catch (err) {
    alert(`Failed to delete model: ${err.message}`);
    console.error('Delete model error:', err);
    // Reload model list since optimistic delete failed
    refreshModelsInventory();
  }
}

async function handleDashboardPull() {
  const inputPull = document.getElementById('dashboard-pull-model');
  const btnPull = document.getElementById('btn-dashboard-pull');
  const progressContainer = document.getElementById('dashboard-pull-progress');
  const statusText = document.getElementById('dashboard-pull-status');
  const percentText = document.getElementById('dashboard-pull-percent');
  const progressBar = document.getElementById('dashboard-pull-bar');

  if (!inputPull || !btnPull) return;

  const modelName = inputPull.value.trim();
  if (!modelName) {
    alert('Please enter a model name to pull.');
    return;
  }

  // Set UI state
  btnPull.disabled = true;
  if (progressContainer) progressContainer.style.display = 'flex';
  if (statusText) statusText.textContent = 'Contacting Ollama...';
  if (percentText) percentText.textContent = '0%';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '';
  }

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

          if (data.status && statusText) {
            statusText.textContent = data.status;
          }

          if (data.completed && data.total) {
            const percent = Math.round((data.completed / data.total) * 100);
            if (percentText) percentText.textContent = `${percent}%`;
            if (progressBar) progressBar.style.width = `${percent}%`;
            
            const completedMB = (data.completed / (1024 * 1024)).toFixed(0);
            const totalMB = (data.total / (1024 * 1024)).toFixed(0);
            if (statusText) statusText.textContent = `${data.status} (${completedMB}MB / ${totalMB}MB)`;
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
    if (statusText) statusText.textContent = '✓ Download completed successfully!';
    if (percentText) percentText.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';
    inputPull.value = '';

    // Refresh model list in topbar
    window.dispatchEvent(new CustomEvent('settings-saved'));
    // Refresh inventory grid
    refreshModelsInventory();

  } catch (err) {
    if (statusText) statusText.textContent = `✗ Error: ${err.message}`;
    if (progressBar) progressBar.style.backgroundColor = 'var(--text-tertiary)';
    console.error('Model pull error:', err);
  } finally {
    btnPull.disabled = false;
  }
}
