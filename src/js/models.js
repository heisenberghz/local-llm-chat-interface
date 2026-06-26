/**
 * Model Command Center logic.
 * Handles split-pane browsing, Hugging Face API search, GGUF pulls, and local installations.
 */

import { fetchModels } from './storage.js';
import { formatSize, showConfirm } from './utils.js';
import { renderMarkdown } from './markdown.js';

// Curated popular GGUF models fallback list (also shown initially when Explore is empty)
const CURATED_MODELS = [
  {
    id: "meta-llama/Llama-3.2-3B-Instruct",
    name: "Llama-3.2-3B-Instruct",
    description: "Meta's official 3B parameter instruction-tuned model. Highly compact, optimized for smart local code assistance and text reasoning.",
    downloads: 485000,
    likes: 1820,
    lastModified: "2024-09-25T12:00:00Z",
    isStaffPick: true,
    parameters: "3B",
    architecture: "llama",
    domain: "LLM",
    format: "GGUF",
    capabilities: { vision: false, tool: true, reasoning: true },
    quantizations: [
      { name: "Llama-3.2-3B-Instruct-Q4_K_M.gguf", size: "2.02 GB", tag: "Q4_K_M" },
      { name: "Llama-3.2-3B-Instruct-Q8_0.gguf", size: "3.42 GB", tag: "Q8_0" },
      { name: "Llama-3.2-3B-Instruct-Q5_K_M.gguf", size: "2.24 GB", tag: "Q5_K_M" }
    ],
    readme: `# Llama 3.2 3B Instruct\n\nMeta's Llama 3.2 lightweight instruction-tuned models are optimized for assistant-like chat and local programming assistance.\n\n### Specs\n- **Parameters:** 3 Billion\n- **Context Length:** 128K tokens\n- **License:** Llama 3.2 Community License`
  },
  {
    id: "Qwen/Qwen2.5-Coder-7B-Instruct",
    name: "Qwen2.5-Coder-7B-Instruct",
    description: "Alibaba's benchmark-leading 7B coding assistant. Exceptional code completions, explanations, and language instructions.",
    downloads: 520000,
    likes: 1940,
    lastModified: "2024-11-12T08:00:00Z",
    isStaffPick: true,
    parameters: "7B",
    architecture: "qwen2",
    domain: "LLM/Code",
    format: "GGUF",
    capabilities: { vision: false, tool: true, reasoning: true },
    quantizations: [
      { name: "qwen2.5-coder-7b-instruct-q4_k_m.gguf", size: "4.74 GB", tag: "q4_k_m" },
      { name: "qwen2.5-coder-7b-instruct-q8_0.gguf", size: "7.72 GB", tag: "q8_0" },
      { name: "qwen2.5-coder-7b-instruct-q5_k_m.gguf", size: "5.54 GB", tag: "q5_k_m" }
    ],
    readme: `# Qwen 2.5 Coder 7B Instruct\n\nQwen2.5-Coder is the specialized programming iteration of Alibaba Group's Qwen2.5 LLM family.\n\n### Highlights\n- Ranked #1 in open-source coding tasks.\n- High code compilation and reasoning capability.\n- Supports 128k context lengths.`
  },
  {
    id: "google/gemma-2-9b-it",
    name: "Gemma-2-9b-it",
    description: "Google DeepMind's Gemma 2 9B model. Packed with a sophisticated architecture that delivers top-tier translation, coding, and general logic.",
    downloads: 435000,
    likes: 1610,
    lastModified: "2024-06-27T10:00:00Z",
    isStaffPick: true,
    parameters: "9B",
    architecture: "gemma2",
    domain: "LLM",
    format: "GGUF",
    capabilities: { vision: false, tool: true, reasoning: true },
    quantizations: [
      { name: "gemma-2-9b-it-Q4_K_M.gguf", size: "5.55 GB", tag: "Q4_K_M" },
      { name: "gemma-2-9b-it-Q8_0.gguf", size: "9.55 GB", tag: "Q8_0" },
      { name: "gemma-2-9b-it-Q5_K_M.gguf", size: "6.55 GB", tag: "Q5_K_M" }
    ],
    readme: `# Gemma 2 9B Instruction-Tuned\n\nGemma 2 is a lightweight, state-of-the-art family of open models built by Google from the same technology used to create Gemini models.\n\n### Features\n- Outstanding general intelligence and logic.\n- Built with safety and alignment guidelines.`
  },
  {
    id: "microsoft/Phi-3-mini-4k-instruct",
    name: "Phi-3-mini-4k-instruct",
    description: "Microsoft's 3.8B parameter ultra-light model. Built with carefully curated datasets to perform on-par with models twice its size.",
    downloads: 310000,
    likes: 1040,
    lastModified: "2024-05-18T12:00:00Z",
    isStaffPick: false,
    parameters: "3.8B",
    architecture: "phi3",
    domain: "LLM",
    format: "GGUF",
    capabilities: { vision: false, tool: false, reasoning: true },
    quantizations: [
      { name: "Phi-3-mini-4k-instruct-q4.gguf", size: "2.18 GB", tag: "q4" },
      { name: "Phi-3-mini-4k-instruct-q8_0.gguf", size: "4.06 GB", tag: "q8_0" }
    ],
    readme: `# Phi 3 Mini 4K Instruct\n\nPhi-3-mini-4k-instruct is a 3.8 billion-parameter, lightweight, instruction-tuned generative text model from Microsoft.\n\n### Specs\n- Context window: 4K tokens.\n- Designed for smart, lightweight local tasks.`
  }
];

// App State
let activeTab = 'explore'; // 'explore' or 'installed'
let selectedModelId = null;
let installedModels = [];
let exploreModelsList = [];
let searchTimeout = null;
let currentPullReader = null;
let downloadingModelId = null;
let activeDownloadingTag = null;

export function initModels() {
  const btnOpen = document.getElementById('btn-models-dashboard');
  const btnClose = document.getElementById('btn-close-models');
  const modal = document.getElementById('models-modal');
  const searchInput = document.getElementById('models-search-input');
  const tabExplore = document.getElementById('tab-explore');
  const tabInstalled = document.getElementById('tab-installed');

  if (btnOpen) btnOpen.addEventListener('click', openModelsDashboard);
  if (btnClose) btnClose.addEventListener('click', closeModelsDashboard);

  // Close on overlay click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModelsDashboard();
    });
  }

  // Search input events (debounced)
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        renderModelList(searchInput.value.trim());
      }, 300);
    });
  }

  // Tabs toggles
  if (tabExplore) {
    tabExplore.addEventListener('click', () => {
      switchTab('explore');
    });
  }
  if (tabInstalled) {
    tabInstalled.addEventListener('click', () => {
      switchTab('installed');
    });
  }

  // Refresh dashboard if settings are saved
  window.addEventListener('settings-saved', () => {
    if (modal && modal.style.display === 'flex') {
      loadInstalledModelsRegistry();
    }
  });
}

function openModelsDashboard() {
  const modal = document.getElementById('models-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const searchInput = document.getElementById('models-search-input');
  if (searchInput) searchInput.value = '';

  // Initial load
  switchTab('explore');
}

function closeModelsDashboard() {
  const modal = document.getElementById('models-modal');
  if (modal) modal.style.display = 'none';
}

function switchTab(tabName) {
  activeTab = tabName;
  selectedModelId = null;

  const tabExplore = document.getElementById('tab-explore');
  const tabInstalled = document.getElementById('tab-installed');
  const searchInput = document.getElementById('models-search-input');

  if (tabExplore && tabInstalled) {
    if (activeTab === 'explore') {
      tabExplore.classList.add('active');
      tabInstalled.classList.remove('active');
      if (searchInput) searchInput.placeholder = 'Search models by name or author...';
    } else {
      tabExplore.classList.remove('active');
      tabInstalled.classList.add('active');
      if (searchInput) searchInput.placeholder = 'Search local installed registry...';
    }
  }

  // Load backend registry first so badges are updated
  loadInstalledModelsRegistry().then(() => {
    renderModelList(searchInput ? searchInput.value.trim() : '');
    renderEmptyState();
  });
}

/**
 * Loads locally installed models from the server
 */
async function loadInstalledModelsRegistry() {
  const badge = document.getElementById('models-installed-badge');
  try {
    installedModels = await fetchModels();
    if (badge) {
      badge.textContent = installedModels.length;
    }
  } catch (err) {
    console.error('Failed to load local models:', err);
    installedModels = [];
    if (badge) badge.textContent = '0';
  }
}

/**
 * Renders the scroll list on the left column based on tab and query
 */
async function renderModelList(query = '') {
  const container = document.getElementById('models-list-container');
  if (!container) return;

  container.innerHTML = '';

  if (activeTab === 'installed') {
    // Local Installed Models registry filtration
    let filtered = installedModels;
    if (query) {
      filtered = installedModels.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.8rem;">
        ${query ? 'No matching models found.' : 'No models currently installed.'}
      </div>`;
      return;
    }

    // Get current active model from topbar dropdown select
    const topbarSelect = document.getElementById('model-select');
    const activeModelName = topbarSelect ? topbarSelect.value : '';

    filtered.forEach(m => {
      const isActive = m.name === activeModelName;
      const sizeGB = m.size ? formatSize(m.size) : 'Unknown size';
      const div = document.createElement('div');
      div.className = `model-list-item ${selectedModelId === m.name ? 'selected' : ''}`;
      div.setAttribute('data-id', m.name);

      div.innerHTML = `
        <div class="model-item-logo">${m.name.charAt(0).toUpperCase()}</div>
        <div class="model-item-content">
          <div class="model-item-header">
            <span class="model-item-name">${m.name}</span>
          </div>
          <div class="model-item-desc">${sizeGB}</div>
          <div class="model-item-footer">
            <span class="model-item-stats">
              <span class="status-indicator ${isActive ? 'active' : 'idle'}"></span>
              <span>${isActive ? 'Active' : 'Idle'}</span>
            </span>
            <div class="model-item-tags">
              <span class="model-item-tag">Local</span>
            </div>
          </div>
        </div>
      `;

      div.addEventListener('click', () => {
        document.querySelectorAll('.model-list-item').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        selectedModelId = m.name;
        renderModelDetails(m.name, true);
      });

      container.appendChild(div);
    });
  } else {
    // Hub Exploration (Hugging Face API or Curated list)
    if (!query) {
      // Show default recommendations
      exploreModelsList = CURATED_MODELS;
      renderExploreItems(exploreModelsList);
    } else {
      container.innerHTML = `
        <div class="skeleton-loader" style="padding: 10px;">
          <div class="skeleton-line" style="width: 90%;"></div>
          <div class="skeleton-line" style="width: 70%; margin-top: 8px;"></div>
          <div class="skeleton-line" style="width: 80%; margin-top: 8px;"></div>
        </div>
      `;

      try {
        const res = await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=gguf&limit=15&sort=downloads&direction=-1`);
        if (!res.ok) throw new Error('API request failed');
        const data = await res.json();

        exploreModelsList = data.map(item => {
          const split = item.id.split('/');
          return {
            id: item.id,
            name: split[1] || item.id,
            author: split[0] || '',
            description: `${split[0] || 'Community'} GGUF model quantization repository.`,
            downloads: item.downloads || 0,
            likes: item.likes || 0,
            lastModified: item.lastModified,
            tags: item.tags || [],
            isStaffPick: item.downloads > 100000
          };
        });

        if (exploreModelsList.length === 0) {
          container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.8rem;">No GGUF models matching query.</div>`;
          return;
        }

        renderExploreItems(exploreModelsList);
      } catch (err) {
        console.error('Hugging Face fetch error (offline?):', err);
        // Offline filter fallback
        exploreModelsList = CURATED_MODELS.filter(m => 
          m.id.toLowerCase().includes(query.toLowerCase()) || 
          m.description.toLowerCase().includes(query.toLowerCase())
        );

        if (exploreModelsList.length === 0) {
          container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.8rem;">Offline Mode: No matching curated models.</div>`;
        } else {
          renderExploreItems(exploreModelsList);
        }
      }
    }
  }
}

function renderExploreItems(list) {
  const container = document.getElementById('models-list-container');
  if (!container) return;
  container.innerHTML = '';

  list.forEach(m => {
    const div = document.createElement('div');
    div.className = `model-list-item ${selectedModelId === m.id ? 'selected' : ''}`;
    div.setAttribute('data-id', m.id);

    const isDownloadingThis = downloadingModelId === m.id;

    div.innerHTML = `
      <div class="model-item-logo">${m.name.charAt(0).toUpperCase()}</div>
      <div class="model-item-content">
        <div class="model-item-header">
          <span class="model-item-name" title="${m.id}">${m.name}</span>
          ${m.downloads > 150000 ? '<span class="model-item-verified" title="Highly Popular Repository">✓</span>' : ''}
        </div>
        <div class="model-item-desc">${m.author || 'huggingface'}</div>
        <div class="model-item-footer">
          <span class="model-item-stats">
            <span class="model-item-stat" title="Downloads">↓ ${formatNumber(m.downloads)}</span>
            <span class="model-item-stat" title="Stars">★ ${formatNumber(m.likes)}</span>
          </span>
          <div class="model-item-tags">
            ${isDownloadingThis ? '<span class="model-item-tag format-gguf" style="animation: pulse 1s infinite">PULLING</span>' : '<span class="model-item-tag format-gguf">GGUF</span>'}
          </div>
        </div>
      </div>
    `;

    div.addEventListener('click', () => {
      document.querySelectorAll('.model-list-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      selectedModelId = m.id;
      renderModelDetails(m.id, false);
    });

    container.appendChild(div);
  });
}

function renderEmptyState() {
  const details = document.getElementById('models-details-container');
  if (!details) return;

  details.innerHTML = `
    <div class="models-empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square">
          <rect x="3" y="3" width="18" height="18"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
        </svg>
      </div>
      <p>Select a model from the list to view detailed metadata, specifications, and download options.</p>
    </div>
  `;
}

/**
 * Renders model details in the right pane
 */
async function renderModelDetails(id, isLocal = false) {
  const details = document.getElementById('models-details-container');
  if (!details) return;

  if (isLocal) {
    // Render local model management
    const model = installedModels.find(m => m.name === id);
    if (!model) {
      renderEmptyState();
      return;
    }

    const topbarSelect = document.getElementById('model-select');
    const activeModelName = topbarSelect ? topbarSelect.value : '';
    const isActive = model.name === activeModelName;
    const sizeGB = model.size ? formatSize(model.size) : 'Unknown size';

    // Parse specs from name
    const specs = parseSpecsFromLocalName(model.name);

    details.innerHTML = `
      <div class="models-details-wrapper">
        <div class="models-details-title-row">
          <div class="models-details-title-left">
            <svg class="models-details-title-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            <h3 class="models-details-id" title="${model.name}">${model.name}</h3>
          </div>
        </div>

        <div class="models-details-stats-row">
          <span class="models-stat">Disk Usage: ${sizeGB}</span>
          <span class="models-stat">
            Status: 
            <span class="status-indicator ${isActive ? 'active' : 'idle'}"></span> 
            ${isActive ? 'Active & Loaded' : 'Idle'}
          </span>
        </div>

        <div class="models-details-specs">
          <div class="spec-chip">
            <span class="spec-label">PARAMS</span> 
            <span class="spec-value font-mono">${specs.params}</span>
          </div>
          <div class="spec-chip">
            <span class="spec-label">ARCH</span> 
            <span class="spec-value font-mono">${specs.arch}</span>
          </div>
          <div class="spec-chip">
            <span class="spec-label">DOMAIN</span> 
            <span class="spec-value font-mono">LLM</span>
          </div>
          <div class="spec-chip">
            <span class="spec-label">FORMAT</span> 
            <span class="spec-value font-mono highlight-blue">NATIVE</span>
          </div>
        </div>

        <div class="models-section-divider"></div>

        <div class="models-download-panel">
          <div class="download-panel-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
            <span>Local Actions</span>
          </div>
          <div class="download-panel-body" style="flex-direction: row; gap: 12px;">
            <button class="btn-primary" id="btn-details-load" ${isActive ? 'disabled' : ''} style="flex: 1;">
              ${isActive ? 'Currently Active' : 'Load Model'}
            </button>
            <button class="btn-danger btn-secondary" id="btn-details-delete" style="flex: 0 0 auto; display: flex; align-items: center; justify-content: center; width: 42px; padding: 0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="models-section-divider"></div>

        <div class="models-readme-panel">
          <div class="readme-panel-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>System Details</span>
          </div>
          <div class="readme-content" id="details-readme-content">
            <p>This model is locally saved inside your Ollama environment directory. It is ready for offline conversations, logical instructions, or automated operations. Click <strong>Load Model</strong> above to activate it.</p>
            <p style="margin-top: 10px; color: var(--text-tertiary); font-size: 0.75rem; font-family: var(--font-mono)">DIGEST: ${model.digest || 'Unknown'}</p>
          </div>
        </div>
      </div>
    `;

    // Wire local triggers
    const btnLoad = document.getElementById('btn-details-load');
    const btnDelete = document.getElementById('btn-details-delete');

    if (btnLoad) btnLoad.addEventListener('click', () => handleLoadModel(model.name));
    if (btnDelete) btnDelete.addEventListener('click', () => handleDeleteModel(model.name));

  } else {
    // Render explore model card (fetching from HF)
    details.innerHTML = `
      <div class="models-details-wrapper">
        <div class="skeleton-loader" style="max-width: 100%;">
          <div class="skeleton-line" style="width: 50%; height: 22px; margin-bottom: 8px;"></div>
          <div class="skeleton-line" style="width: 30%; height: 14px; margin-bottom: 20px;"></div>
          <div class="skeleton-line" style="width: 100%; height: 60px; margin-bottom: 12px;"></div>
          <div class="skeleton-line" style="width: 90%; height: 14px; margin-bottom: 6px;"></div>
          <div class="skeleton-line" style="width: 80%; height: 14px; margin-bottom: 6px;"></div>
          <div class="skeleton-line" style="width: 40%; height: 14px;"></div>
        </div>
      </div>
    `;

    // Try to load model details from local curated cache or Hugging Face API
    let model = CURATED_MODELS.find(m => m.id === id);
    let hfData = null;
    let fileSizes = {};

    if (!model) {
      try {
        // Fetch details from Hugging Face
        const res = await fetch(`https://huggingface.co/api/models/${id}`);
        if (!res.ok) throw new Error('Repo fetch failed');
        hfData = await res.json();
        
        // Parse metadata tags
        const specs = parseSpecsFromHFTags(hfData);

        // Map files ending in .gguf
        const branch = hfData.defaultBranch || 'main';
        const ggufFiles = (hfData.siblingFiles || [])
          .map(f => f.rfilename)
          .filter(name => name.endsWith('.gguf'));

        // Query tree to obtain file sizes
        try {
          const treeRes = await fetch(`https://huggingface.co/api/models/${id}/tree/${branch}`);
          if (treeRes.ok) {
            const files = await treeRes.json();
            files.forEach(f => {
              if (f.path && f.size) fileSizes[f.path] = f.size;
            });
          }
        } catch {}

        // Construct quant list
        const quants = ggufFiles.map(filename => {
          const tag = extractQuantTag(filename);
          const sizeBytes = fileSizes[filename];
          const sizeGB = sizeBytes ? `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : estimateQuantSize(specs.params, tag);
          return { name: filename, tag, size: sizeGB, sizeBytes };
        });

        model = {
          id: hfData.id,
          name: hfData.id.split('/')[1] || hfData.id,
          description: hfData.description || `${hfData.id.split('/')[0]} community weights GGUF repository.`,
          downloads: hfData.downloads || 0,
          likes: hfData.likes || 0,
          lastModified: hfData.lastModified,
          isStaffPick: hfData.downloads > 120000,
          parameters: specs.params,
          architecture: specs.arch,
          domain: specs.domain,
          format: 'GGUF',
          capabilities: specs.capabilities,
          quantizations: quants,
          readme: '' // to be loaded next
        };
      } catch (err) {
        console.error('Failed to resolve HF model details:', err);
        details.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
          Failed to fetch model details from Hugging Face. Ensure you are connected to the internet.
        </div>`;
        return;
      }
    }

    // Now render details markup
    details.innerHTML = `
      <div class="models-details-wrapper">
        <div class="models-details-title-row">
          <div class="models-details-title-left">
            <svg class="models-details-title-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            <h3 class="models-details-id" title="${model.id}">${model.id}</h3>
            <button class="btn-copy-id" id="btn-copy-id" data-id="${model.id}" title="Copy Model ID">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="models-details-stats-row">
          <span class="models-stat">↓ ${formatNumber(model.downloads)} downloads</span>
          <span class="models-stat">★ ${formatNumber(model.likes)} likes</span>
          <span class="models-stat">Updated: ${timeAgo(model.lastModified)}</span>
          ${model.isStaffPick ? '<span class="badge-staff-pick">★ Popular</span>' : ''}
        </div>

        <div class="models-details-description">
          ${model.description}
        </div>

        <div class="models-details-specs">
          <div class="spec-chip">
            <span class="spec-label">PARAMS</span> 
            <span class="spec-value font-mono">${model.parameters}</span>
          </div>
          <div class="spec-chip">
            <span class="spec-label">ARCH</span> 
            <span class="spec-value font-mono">${model.architecture}</span>
          </div>
          <div class="spec-chip">
            <span class="spec-label">DOMAIN</span> 
            <span class="spec-value font-mono">${model.domain}</span>
          </div>
          <div class="spec-chip">
            <span class="spec-label">FORMAT</span> 
            <span class="spec-value font-mono highlight-blue">${model.format}</span>
          </div>
        </div>

        <div class="models-details-capabilities">
          <span class="cap-label">Capabilities:</span>
          <div class="cap-chips">
            <span class="cap-chip ${model.capabilities.vision ? 'active' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Vision
            </span>
            <span class="cap-chip ${model.capabilities.tool ? 'active' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Tool Use
            </span>
            <span class="cap-chip ${model.capabilities.reasoning ? 'active' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/></svg> Reasoning
            </span>
          </div>
        </div>

        <div class="models-section-divider"></div>

        <div class="models-download-panel">
          <div class="download-panel-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Download Options</span>
          </div>
          <div class="download-panel-body">
            ${model.quantizations && model.quantizations.length > 0 ? `
              <div class="quantization-selector-row">
                <span class="format-badge">GGUF</span>
                <select id="model-quantization-select">
                  ${model.quantizations.map(q => `<option value="${q.tag}" data-size="${q.size}">${q.name} (${q.size})</option>`).join('')}
                </select>
                <span class="file-size font-mono" id="selected-file-size">${model.quantizations[0].size}</span>
              </div>
              <div class="gpu-offload-hint">
                <span class="status-indicator active"></span>
                <span>Partial GPU Offload Possible</span>
              </div>
              <div class="download-action-row">
                <button class="btn-primary" id="btn-model-download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download ${model.quantizations[0].size}
                </button>
              </div>
            ` : `
              <div style="font-size: 0.8rem; color: var(--text-tertiary); text-align: center; padding: 10px;">
                No quantization files available in repository.
              </div>
            `}

            <!-- Progress wrapper -->
            <div class="pull-progress-container" id="details-pull-progress" style="display: none;">
              <div class="pull-progress-header">
                <span class="pull-progress-status" id="details-pull-status">Ready</span>
                <span class="pull-progress-percent" id="details-pull-percent">0%</span>
              </div>
              <div class="pull-progress-bar-wrapper">
                <div class="pull-progress-bar" id="details-pull-bar" style="width: 0%;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="models-section-divider"></div>

        <div class="models-readme-panel">
          <div class="readme-panel-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>README</span>
          </div>
          <div class="readme-content" id="details-readme-content">
            <div class="skeleton-loader">
              <div class="skeleton-line" style="width: 70%"></div>
              <div class="skeleton-line" style="width: 80%; margin-top: 8px;"></div>
              <div class="skeleton-line" style="width: 50%; margin-top: 8px;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire select triggers
    const select = document.getElementById('model-quantization-select');
    const sizeSpan = document.getElementById('selected-file-size');
    const btnDownload = document.getElementById('btn-model-download');

    if (select && sizeSpan && btnDownload) {
      select.addEventListener('change', () => {
        const option = select.options[select.selectedIndex];
        const sizeText = option.getAttribute('data-size');
        sizeSpan.textContent = sizeText;
        btnDownload.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download ${sizeText}
        `;
      });
    }

    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        if (select) {
          const tag = select.value;
          handleHubDownload(model.id, tag);
        }
      });
    }

    const btnCopy = document.getElementById('btn-copy-id');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(model.id).then(() => {
          const original = btnCopy.innerHTML;
          btnCopy.innerHTML = '<span style="font-size: 0.65rem; color: var(--accent-primary); font-family: var(--font-sans)">Copied!</span>';
          setTimeout(() => btnCopy.innerHTML = original, 1200);
        });
      });
    }

    // Now load README markdown card raw contents in background
    loadReadmeContent(model.id, hfData ? (hfData.defaultBranch || 'main') : 'main', model.readme);
  }
}

/**
 * Fetches and displays README markdown files
 */
async function loadReadmeContent(modelId, branch, initialText) {
  const container = document.getElementById('details-readme-content');
  if (!container) return;

  if (initialText) {
    const rendered = await renderMarkdown(initialText);
    container.innerHTML = rendered;
    return;
  }

  try {
    const res = await fetch(`https://huggingface.co/api/models/${modelId}/raw/${branch}/README.md`);
    if (!res.ok) throw new Error('No raw README file');
    const text = await res.text();
    const rendered = await renderMarkdown(text);
    container.innerHTML = rendered;
  } catch {
    try {
      // Try lowercase branch master fallback
      const fallbackRes = await fetch(`https://huggingface.co/api/models/${modelId}/raw/master/README.md`);
      if (!fallbackRes.ok) throw new Error('No fallback readme');
      const text = await fallbackRes.text();
      const rendered = await renderMarkdown(text);
      container.innerHTML = rendered;
    } catch {
      container.innerHTML = `<p style="color: var(--text-tertiary)">Unable to load remote README document for this repository.</p>`;
    }
  }
}

/**
 * Triggers pulling GGUF models from Ollama API
 */
async function handleHubDownload(modelId, tag) {
  const btnDownload = document.getElementById('btn-model-download');
  const progressContainer = document.getElementById('details-pull-progress');
  const statusText = document.getElementById('details-pull-status');
  const percentText = document.getElementById('details-pull-percent');
  const progressBar = document.getElementById('details-pull-bar');

  if (!btnDownload) return;

  // Construct pull name tag
  const pullName = `hf.co/${modelId.toLowerCase()}:${tag.toLowerCase()}`;

  // Set pulling states
  downloadingModelId = modelId;
  activeDownloadingTag = tag;
  btnDownload.disabled = true;

  if (progressContainer) progressContainer.style.display = 'flex';
  if (statusText) statusText.textContent = 'Contacting local Ollama...';
  if (percentText) percentText.textContent = '0%';
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = '';
  }

  // Refresh left scroll lists to display pulling indicator badge
  const searchInput = document.getElementById('models-search-input');
  renderModelList(searchInput ? searchInput.value.trim() : '');

  try {
    const res = await fetch('/api/models/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pullName }),
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
    currentPullReader = reader;
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

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

    // Success State
    if (statusText) statusText.textContent = '✓ Download completed successfully!';
    if (percentText) percentText.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';

    // Clear state
    downloadingModelId = null;
    activeDownloadingTag = null;

    // Refresh model lists & dropdowns in header
    window.dispatchEvent(new CustomEvent('settings-saved'));

    // Reload lists registry & badge count count
    await loadInstalledModelsRegistry();
    
    // Switch to local registry tab
    switchTab('installed');

  } catch (err) {
    if (statusText) statusText.textContent = `✗ Error: ${err.message}`;
    if (progressBar) progressBar.style.backgroundColor = 'var(--error)';
    console.error('Download pull error:', err);
    downloadingModelId = null;
    activeDownloadingTag = null;
  } finally {
    btnDownload.disabled = false;
    currentPullReader = null;
    // Re-render lists
    renderModelList(searchInput ? searchInput.value.trim() : '');
  }
}

function handleLoadModel(modelName) {
  const topbarSelect = document.getElementById('model-select');
  if (topbarSelect) {
    topbarSelect.value = modelName;
    topbarSelect.dispatchEvent(new Event('change'));
  }
  closeModelsDashboard();
}

async function handleDeleteModel(modelName) {
  const confirmed = await showConfirm(`Are you sure you want to delete ${modelName}? This will remove all files from disk.`, 'Delete');
  if (!confirmed) return;

  // Optimistic UI Update: remove selected from state and update left sidebar
  installedModels = installedModels.filter(m => m.name !== modelName);
  
  // Set details pane back to empty
  renderEmptyState();
  
  // Update badge count
  const badge = document.getElementById('models-installed-badge');
  if (badge) badge.textContent = installedModels.length;

  // Re-render local list
  const searchInput = document.getElementById('models-search-input');
  renderModelList(searchInput ? searchInput.value.trim() : '');

  try {
    const res = await fetch('/api/models', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
    // Reload local list registry since optimistic delete failed
    loadInstalledModelsRegistry().then(() => {
      renderModelList(searchInput ? searchInput.value.trim() : '');
    });
  }
}

/* ============================================================
   METADATA & TAG PARSING HELPERS
   ============================================================ */

/**
 * Extracts param specifications from a local Ollama model name string
 */
function parseSpecsFromLocalName(name) {
  let params = 'Unknown';
  let arch = 'Unknown';

  const lower = name.toLowerCase();

  // Try parsing parameter sizes
  const pMatch = lower.match(/:(\d+(\.\d+)?b)/) || lower.match(/-(\d+(\.\d+)?b)/) || lower.match(/:(\d+m)/) || lower.match(/-(\d+m)/);
  if (pMatch) {
    params = pMatch[1].toUpperCase();
  }

  // Parse architecture
  if (lower.includes('llama')) arch = 'llama';
  else if (lower.includes('qwen')) arch = 'qwen2';
  else if (lower.includes('gemma')) arch = 'gemma2';
  else if (lower.includes('phi')) arch = 'phi3';
  else if (lower.includes('mistral')) arch = 'mistral';
  else if (lower.includes('nemotron')) arch = 'nemotron';

  return { params, arch };
}

/**
 * Parses parameters and architecture specs from Hugging Face repository tags
 */
function parseSpecsFromHFTags(item) {
  const tags = item.tags || [];
  const id = item.id || '';
  
  // Extract parameters
  let params = 'Unknown';
  const paramsTag = tags.find(t => t.match(/^\d+(\.\d+)?[mb]$/i));
  if (paramsTag) {
    params = paramsTag.toUpperCase();
  } else {
    const match = id.match(/-(\d+(\.\d+)?[mb])/i) || id.match(/_(\d+(\.\d+)?[mb])/i) || id.match(/-(\d+b)-/i);
    if (match) {
      params = match[1].toUpperCase();
    }
  }
  
  // Extract architecture
  let arch = 'Unknown';
  const archTag = tags.find(t => 
    t === 'llama' || t === 'gemma' || t === 'qwen' || t === 'phi' || 
    t === 'mistral' || t === 'llama-2' || t === 'nemotron' || t === 'gemma2' ||
    t === 'qwen2' || t === 'phi3'
  );
  
  if (archTag) {
    arch = archTag;
  } else {
    const idLower = id.toLowerCase();
    if (idLower.includes('llama')) arch = 'llama';
    else if (idLower.includes('gemma')) arch = 'gemma2';
    else if (idLower.includes('qwen')) arch = 'qwen2';
    else if (idLower.includes('phi')) arch = 'phi3';
    else if (idLower.includes('mistral')) arch = 'mistral';
    else if (idLower.includes('nemotron')) arch = 'nemotron';
  }
  
  // Capabilities
  const capabilities = {
    vision: tags.includes('vision') || id.toLowerCase().includes('vision') || id.toLowerCase().includes('vl'),
    tool: tags.includes('tool-use') || tags.includes('agent') || id.toLowerCase().includes('instruct') || id.toLowerCase().includes('it'),
    reasoning: tags.includes('reasoning') || id.toLowerCase().includes('reasoning') || id.toLowerCase().includes('cot') || id.toLowerCase().includes('instruct') || id.toLowerCase().includes('it')
  };

  return { params, arch, domain: 'LLM', capabilities };
}

/**
 * Estimates file size in GB based on parameters count and quantization type
 */
function estimateQuantSize(paramsStr, quantTag) {
  let baseGB = 4.5;
  const lowerTag = quantTag.toLowerCase();

  // Get base model size in GB
  const pMatch = paramsStr.match(/^(\d+(\.\d+)?)/);
  if (pMatch) {
    const pVal = parseFloat(pMatch[1]);
    baseGB = pVal * 0.7; // ~0.7GB per billion parameters for float16
  }

  // Adjust for quantization ratio
  let multiplier = 0.5; // default around Q4
  if (lowerTag.includes('q8_0')) multiplier = 0.9;
  else if (lowerTag.includes('q6_k')) multiplier = 0.72;
  else if (lowerTag.includes('q5_k_m') || lowerTag.includes('q5_0')) multiplier = 0.62;
  else if (lowerTag.includes('q4_k_m') || lowerTag.includes('q4_0')) multiplier = 0.52;
  else if (lowerTag.includes('q3_k_m')) multiplier = 0.42;
  else if (lowerTag.includes('q2_k')) multiplier = 0.33;

  return `${(baseGB * multiplier).toFixed(2)} GB`;
}

/**
 * Extracts GGUF quantization tag labels from filenames
 */
function extractQuantTag(filename) {
  const nameWithoutExt = filename.replace(/\.gguf$/i, '');
  // Look for common quant tags in the name
  const matches = nameWithoutExt.match(/(q\d_[k_a-z\d]+|f16|f32|q\d_\d|iq\d_[s_m_l_x\d]+)/i);
  if (matches) {
    return matches[1];
  }
  return nameWithoutExt;
}

/**
 * Formats statistics numbers
 */
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Calculates human readable relative time string
 */
function timeAgo(dateStr) {
  if (!dateStr) return 'unknown';
  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) return 'recently';
  const diffMs = Date.now() - parsed;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}
