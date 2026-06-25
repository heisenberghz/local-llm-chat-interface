/**
 * Chat engine — sending messages, streaming responses, rendering bubbles.
 */

import { sendChatMessage, stopChat, updateConversation, createConversation } from './storage.js';
import { renderMarkdown, renderMarkdownSync } from './markdown.js';
import { countTokens, formatTokens, generateId, timeAgo, debounce } from './utils.js';

let currentConversation = null;
let isStreaming = false;
let currentRequestId = null;
let currentAbortController = null;

// Voice parameters
let speechRecognition = null;
let isListening = false;
let activeSpeakBtn = null;

// DOM references
const messagesEl = () => document.getElementById('messages');
const containerEl = () => document.getElementById('messages-container');
const inputEl = () => document.getElementById('message-input');
const sendBtn = () => document.getElementById('btn-send');
const stopBtn = () => document.getElementById('btn-stop');
const tokenInfo = () => document.getElementById('token-info');
const welcomeEl = () => document.getElementById('welcome');
const modelSelect = () => document.getElementById('model-select');

export function getIsStreaming() {
  return isStreaming;
}

export function getCurrentConversation() {
  return currentConversation;
}

export function setCurrentConversation(conv) {
  currentConversation = conv;
}

/**
 * Initialize chat event listeners.
 */
export function initChat() {
  const input = inputEl();
  const send = sendBtn();

  // Microphone Speech-to-Text Button
  const voiceBtn = document.getElementById('btn-voice-input');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', toggleSpeechRecognition);
  }

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    send.disabled = !input.value.trim();
    updateTokenCount(input.value);
  });

  // Enter to send, Shift+Enter for newline
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim() && !isStreaming) {
        handleSend();
      }
    }
  });

  send.addEventListener('click', () => {
    if (input.value.trim() && !isStreaming) handleSend();
  });

  stopBtn().addEventListener('click', handleStop);

  // Message actions (Edit & Regenerate)
  const messagesContainer = messagesEl();
  if (messagesContainer) {
    messagesContainer.addEventListener('click', handleMessageActionClick);
  }

  // Hint cards
  document.querySelectorAll('.hint-card').forEach((card) => {
    card.addEventListener('click', () => {
      input.value = card.dataset.hint;
      input.dispatchEvent(new Event('input'));
      handleSend();
    });
  });

  // Parameters Inspector Panel Toggle
  const inspector = document.getElementById('inspector');
  const toggleBtn = document.getElementById('btn-toggle-inspector');
  const closeBtn = document.getElementById('btn-close-inspector');
  
  if (toggleBtn && inspector) {
    const savedState = localStorage.getItem('aether-inspector-collapsed') !== 'false';
    if (savedState) {
      inspector.classList.add('collapsed');
    } else {
      inspector.classList.remove('collapsed');
    }
    
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = inspector.classList.toggle('collapsed');
      localStorage.setItem('aether-inspector-collapsed', isCollapsed);
    });
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        inspector.classList.add('collapsed');
        localStorage.setItem('aether-inspector-collapsed', 'true');
      });
    }
  }

  // Range Slider Visual Value Synchronization & Saving
  const tempInput = document.getElementById('param-temp');
  const tempVal = document.getElementById('val-temp');
  const tokensInput = document.getElementById('param-tokens');
  const tokensVal = document.getElementById('val-tokens');
  const ctxSelect = document.getElementById('param-ctx');
  const systemTextarea = document.getElementById('param-system');

  if (tempInput && tempVal) {
    tempInput.addEventListener('input', (e) => {
      tempVal.textContent = e.target.value;
      saveCurrentChatParameters();
    });
  }
  if (tokensInput && tokensVal) {
    tokensInput.addEventListener('input', (e) => {
      tokensVal.textContent = e.target.value;
      saveCurrentChatParameters();
    });
  }
  if (ctxSelect) {
    ctxSelect.addEventListener('change', saveCurrentChatParameters);
  }
  if (systemTextarea) {
    systemTextarea.addEventListener('input', debounce(saveCurrentChatParameters, 500));
  }
}

/**
 * Save parameters to the active conversation object.
 */
async function saveCurrentChatParameters() {
  if (!currentConversation) return;

  const tempInput = document.getElementById('param-temp');
  const tokensInput = document.getElementById('param-tokens');
  const ctxSelect = document.getElementById('param-ctx');
  const systemTextarea = document.getElementById('param-system');

  const parameters = {
    temperature: tempInput ? parseFloat(tempInput.value) : 0.7,
    num_ctx: ctxSelect ? parseInt(ctxSelect.value, 10) : 2048,
    num_predict: tokensInput ? parseInt(tokensInput.value, 10) : 2048,
    systemPrompt: systemTextarea ? systemTextarea.value : '',
  };

  currentConversation.parameters = parameters;
  currentConversation.systemPrompt = parameters.systemPrompt;

  await updateConversation(currentConversation.id, {
    parameters: currentConversation.parameters,
    systemPrompt: currentConversation.systemPrompt,
  });
}

/**
 * Load parameters into the sidebar inputs when switching chats.
 */
export function loadChatParameters(conv) {
  const tempInput = document.getElementById('param-temp');
  const tempVal = document.getElementById('val-temp');
  const ctxSelect = document.getElementById('param-ctx');
  const tokensInput = document.getElementById('param-tokens');
  const tokensVal = document.getElementById('val-tokens');
  const systemTextarea = document.getElementById('param-system');

  const params = (conv && conv.parameters) || {
    temperature: 0.7,
    num_ctx: 2048,
    num_predict: 2048,
    systemPrompt: (conv && conv.systemPrompt) || '',
  };

  if (tempInput) {
    tempInput.value = params.temperature !== undefined ? params.temperature : 0.7;
    if (tempVal) tempVal.textContent = tempInput.value;
  }
  if (ctxSelect) {
    ctxSelect.value = params.num_ctx !== undefined ? params.num_ctx : 2048;
  }
  if (tokensInput) {
    tokensInput.value = params.num_predict !== undefined ? params.num_predict : 2048;
    if (tokensVal) tokensVal.textContent = tokensInput.value;
  }
  if (systemTextarea) {
    systemTextarea.value = params.systemPrompt || '';
  }

  // Reset visual performance metrics
  const speedEl = document.getElementById('metric-speed');
  const timeEl = document.getElementById('metric-time');
  if (speedEl) speedEl.textContent = '— tokens/s';
  if (timeEl) timeEl.textContent = '— s';
}

/**
 * Render a full conversation's messages.
 */
export async function renderConversation(conv) {
  if (typeof window.speechSynthesis !== 'undefined') {
    window.speechSynthesis.cancel();
    resetSpeakButtonState();
  }
  currentConversation = conv;
  loadChatParameters(conv);
  const messages = messagesEl();

  // Clear messages but keep the welcome element
  const welcome = welcomeEl();
  messages.innerHTML = '';

  if (!conv || !conv.messages || conv.messages.length === 0) {
    messages.appendChild(welcome || createWelcome());
    welcome && (welcome.style.display = 'flex');
    return;
  }

  // Hide welcome
  if (welcome) welcome.style.display = 'none';

  let index = 0;
  for (const msg of conv.messages) {
    const el = await createMessageEl(msg, index);
    messages.appendChild(el);
    index++;
  }

  scrollToBottom();
}

/**
 * Handle sending a message.
 */
async function handleSend() {
  const input = inputEl();
  const text = input.value.trim();
  if (!text) return;

  const model = modelSelect().value;
  if (!model) {
    showError('Please select a model first.');
    return;
  }

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  sendBtn().disabled = true;
  updateTokenCount('');

  // Hide welcome
  const welcome = welcomeEl();
  if (welcome) welcome.style.display = 'none';

  // Create conversation if needed
  if (!currentConversation) {
    const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
    currentConversation = await createConversation({ title, model });

    // Notify sidebar to refresh
    window.dispatchEvent(new CustomEvent('conversation-created', { detail: currentConversation }));
  }

  // Build user message
  const userMsg = {
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
    tokens: countTokens(text),
  };

  // Add to conversation
  if (!currentConversation.messages) currentConversation.messages = [];
  currentConversation.messages.push(userMsg);

  // Render user message
  const userEl = await createMessageEl(userMsg, currentConversation.messages.length - 1);
  messagesEl().appendChild(userEl);
  scrollToBottom();

  // Save immediately
  await updateConversation(currentConversation.id, {
    messages: currentConversation.messages,
    model,
  });

  // Start streaming AI response
  await streamResponse(model);
}

/**
 * Stream AI response from Ollama.
 */
async function streamResponse(model) {
  isStreaming = true;
  const messagesElement = messagesEl();
  if (messagesElement) {
    messagesElement.classList.add('is-streaming');
  }
  currentRequestId = generateId();
  currentAbortController = new AbortController();

  sendBtn().style.display = 'none';
  stopBtn().style.display = 'flex';

  // Collect active parameter options
  const tempInput = document.getElementById('param-temp');
  const tokensInput = document.getElementById('param-tokens');
  const ctxSelect = document.getElementById('param-ctx');
  
  const options = {
    temperature: tempInput ? parseFloat(tempInput.value) : 0.7,
    num_ctx: ctxSelect ? parseInt(ctxSelect.value, 10) : 2048,
    num_predict: tokensInput ? parseInt(tokensInput.value, 10) : 2048,
  };

  const startTime = performance.now();

  // Build messages for Ollama (include system prompt if set)
  const settings = JSON.parse(localStorage.getItem('localchat-settings') || '{}');
  const ollamaMessages = [];

  if (currentConversation.systemPrompt || settings.systemPrompt) {
    ollamaMessages.push({
      role: 'system',
      content: currentConversation.systemPrompt || settings.systemPrompt,
    });
  }

  for (const msg of currentConversation.messages) {
    ollamaMessages.push({ role: msg.role, content: msg.content });
  }

  // Create AI message element with loading indicator
  const aiMsgEl = document.createElement('div');
  aiMsgEl.className = 'message assistant';
  aiMsgEl.setAttribute('data-index', currentConversation.messages.length);
  aiMsgEl.innerHTML = `
    <div class="message-avatar">
      <svg class="avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">
        <rect x="3" y="3" width="18" height="18"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
        <circle cx="12" cy="12" r="3" stroke-dasharray="1 1"/>
      </svg>
    </div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
      <div class="message-meta">
        <span class="message-time"></span>
        <span class="message-tokens"></span>
        <div class="message-actions">
          <button class="btn-message-action btn-action-speak" title="Speak response">
            <svg class="icon-speak" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <svg class="icon-stop-speak" style="display:none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          </button>
          <button class="btn-message-action btn-action-regenerate" title="Regenerate response">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
  messagesEl().appendChild(aiMsgEl);
  scrollToBottom();

  const bubble = aiMsgEl.querySelector('.message-bubble');
  let fullText = '';
  let evalCount = 0;
  let updatePending = false;

  const updateDOM = () => {
    bubble.innerHTML = renderMarkdownSync(fullText);
    scrollToBottom();
    updatePending = false;
  };

  const scheduleDOMUpdate = () => {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(updateDOM);
  };

  try {
    const res = await sendChatMessage({
      model,
      messages: ollamaMessages,
      requestId: currentRequestId,
      options,
      signal: currentAbortController.signal,
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            showError(parsed.error);
            break;
          }

          if (parsed.message && parsed.message.content) {
            fullText += parsed.message.content;
            scheduleDOMUpdate();
          }

          // Capture token counts from Ollama's final response
          if (parsed.done && parsed.eval_count) {
            evalCount = parsed.eval_count;
          }
        } catch {
          // Skip unparseable chunks
        }
      }
      
      if (done) break;
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      showError(`Failed to get response: ${err.message}`);
    }
  }

  // Force immediate DOM update if one is pending, before we do final rendering
  if (updatePending) {
    updateDOM();
  }

  // Finalize: render full markdown properly
  if (fullText) {
    bubble.innerHTML = await renderMarkdown(fullText);

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
    const tokens = evalCount || countTokens(fullText);
    const tokensPerSec = evalCount ? (evalCount / durationSeconds).toFixed(1) : (tokens / durationSeconds).toFixed(1);

    // Update visual metrics panel
    const speedEl = document.getElementById('metric-speed');
    const timeEl = document.getElementById('metric-time');
    if (speedEl) speedEl.textContent = `${tokensPerSec} tokens/s`;
    if (timeEl) timeEl.textContent = `${durationSeconds} s`;

    const meta = aiMsgEl.querySelector('.message-meta');
    meta.querySelector('.message-time').textContent = 'just now';
    meta.querySelector('.message-tokens').textContent = formatTokens(tokens);

    // Save AI message to conversation
    const aiMsg = {
      role: 'assistant',
      content: fullText,
      timestamp: new Date().toISOString(),
      tokens,
    };
    currentConversation.messages.push(aiMsg);
    await updateConversation(currentConversation.id, {
      messages: currentConversation.messages,
      parameters: currentConversation.parameters,
    });

    // Auto-read response if enabled
    const settings = JSON.parse(localStorage.getItem('localchat-settings') || '{}');
    if (settings.ttsAutoread) {
      const speakBtn = aiMsgEl.querySelector('.btn-action-speak');
      if (speakBtn) {
        handleSpeakToggle(fullText, speakBtn);
      }
    }
  }

  // Reset state
  isStreaming = false;
  const msgEl = messagesEl();
  if (msgEl) {
    msgEl.classList.remove('is-streaming');
  }
  currentRequestId = null;
  currentAbortController = null;
  stopBtn().style.display = 'none';
  sendBtn().style.display = 'flex';
  sendBtn().disabled = !inputEl().value.trim();
}

/**
 * Stop generating.
 */
async function handleStop() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
  if (currentRequestId) {
    try {
      await stopChat(currentRequestId);
    } catch {
      // Best effort
    }
  }
}

/**
 * Handle clicking on Edit or Regenerate message action buttons.
 */
async function handleMessageActionClick(e) {
  if (isStreaming) return;

  const btn = e.target.closest('.btn-message-action');
  if (!btn) return;

  const messageEl = btn.closest('.message');
  if (!messageEl) return;

  const index = parseInt(messageEl.getAttribute('data-index'), 10);
  if (isNaN(index)) return;

  if (btn.classList.contains('btn-action-edit')) {
    // User wants to edit a message
    const msg = currentConversation.messages[index];
    if (!msg) return;

    // Reset other edits by re-rendering
    await renderConversation(currentConversation);

    // Find the message element again in the newly rendered list
    const freshMessageEl = messagesEl().querySelector(`.message[data-index="${index}"]`);
    if (!freshMessageEl) return;

    const bubble = freshMessageEl.querySelector('.message-bubble');
    if (!bubble) return;

    const originalText = msg.content;
    bubble.innerHTML = `
      <div class="inline-edit-container">
        <textarea class="inline-edit-textarea">${escapeHtml(originalText)}</textarea>
        <div class="inline-edit-actions">
          <button class="btn-mono btn-edit-cancel">CANCEL</button>
          <button class="btn-mono btn-edit-save">SAVE & SUBMIT</button>
        </div>
      </div>
    `;

    const textarea = bubble.querySelector('.inline-edit-textarea');
    const cancelBtn = bubble.querySelector('.btn-edit-cancel');
    const saveBtn = bubble.querySelector('.btn-edit-save');

    // Auto-resize
    const resizeTextarea = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    resizeTextarea();
    textarea.addEventListener('input', resizeTextarea);

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    textarea.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        saveBtn.click();
      }
    });

    cancelBtn.addEventListener('click', (evt) => {
      evt.stopPropagation();
      renderConversation(currentConversation);
    });

    saveBtn.addEventListener('click', async (evt) => {
      evt.stopPropagation();
      const newText = textarea.value.trim();
      if (!newText) return;

      // Truncate subsequent messages
      currentConversation.messages = currentConversation.messages.slice(0, index);

      // Create updated user message
      const updatedUserMsg = {
        role: 'user',
        content: newText,
        timestamp: new Date().toISOString(),
        tokens: countTokens(newText),
      };
      currentConversation.messages.push(updatedUserMsg);

      const model = modelSelect().value || currentConversation.model;
      await updateConversation(currentConversation.id, {
        messages: currentConversation.messages,
        model,
      });

      await renderConversation(currentConversation);
      await streamResponse(model);
    });
  } else if (btn.classList.contains('btn-action-speak')) {
    // Text-to-Speech play/stop toggle
    const bubble = messageEl.querySelector('.message-bubble');
    if (bubble) {
      const textToSpeak = bubble.textContent || bubble.innerText || '';
      handleSpeakToggle(textToSpeak, btn);
    }
  } else if (btn.classList.contains('btn-action-regenerate')) {
    // Assistant response regenerate
    // Truncate the assistant message and everything after it
    currentConversation.messages = currentConversation.messages.slice(0, index);

    const model = modelSelect().value || currentConversation.model;
    await updateConversation(currentConversation.id, {
      messages: currentConversation.messages,
      model,
    });

    await renderConversation(currentConversation);
    await streamResponse(model);
  }
}

/**
 * Create a message DOM element.
 */
async function createMessageEl(msg, index) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;
  if (index !== undefined) {
    div.setAttribute('data-index', index);
  }

  const avatarHtml = msg.role === 'user' 
    ? `<div class="message-avatar">
         <svg class="avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
           <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
           <circle cx="12" cy="7" r="4"/>
         </svg>
       </div>`
    : `<div class="message-avatar">
         <svg class="avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">
           <rect x="3" y="3" width="18" height="18"/>
           <line x1="3" y1="12" x2="21" y2="12"/>
           <line x1="12" y1="3" x2="12" y2="21"/>
           <circle cx="12" cy="12" r="3" stroke-dasharray="1 1"/>
         </svg>
       </div>`;

  const tokens = msg.tokens || countTokens(msg.content);
  const time = msg.timestamp ? timeAgo(msg.timestamp) : '';

  let content;
  if (msg.role === 'assistant') {
    content = await renderMarkdown(msg.content);
  } else {
    content = escapeHtml(msg.content);
  }

  div.innerHTML = `
    ${avatarHtml}
    <div class="message-content">
      <div class="message-bubble">${content}</div>
      <div class="message-meta">
        <span class="message-time">${time}</span>
        <span class="message-tokens">${formatTokens(tokens)}</span>
        <div class="message-actions">
          ${msg.role === 'user' ? `
            <button class="btn-message-action btn-action-edit" title="Edit message">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/>
              </svg>
            </button>
          ` : `
            <button class="btn-message-action btn-action-speak" title="Speak response">
              <svg class="icon-speak" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg class="icon-stop-speak" style="display:none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>
            <button class="btn-message-action btn-action-regenerate" title="Regenerate response">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  return div;
}

/**
 * Show error message in chat.
 */
function showError(text) {
  const el = document.createElement('div');
  el.className = 'message-error';
  el.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    <span>${escapeHtml(text)}</span>
  `;
  messagesEl().appendChild(el);
  scrollToBottom();
}

function updateTokenCount(text) {
  const el = tokenInfo();
  if (!text) {
    el.textContent = '';
    return;
  }
  el.textContent = `~${countTokens(text)} tokens`;
}

function scrollToBottom() {
  const container = containerEl();
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function createWelcome() {
  // Fallback if welcome element was lost
  const div = document.createElement('div');
  div.className = 'welcome';
  div.id = 'welcome';
  div.innerHTML = `
    <div class="welcome-icon">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3a9 9 0 0 0-9 9M21 12a9 9 0 0 0-9 9"/>
        <polygon points="12,8 15,12 12,16 9,12" fill="currentColor"/>
      </svg>
    </div>
    <h1>Aether</h1>
    <p>Your private, local AI assistant. Choose a model above and start chatting.</p>
  `;
  return div;
}

/**
 * Speech Recognition (Speech-to-Text) functions
 */
function initSpeechRecognition() {
  if (speechRecognition) return true;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return false;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = false;

  speechRecognition.onresult = (e) => {
    const input = inputEl();
    const transcript = e.results[e.results.length - 1][0].transcript;
    if (transcript) {
      const space = input.value.trim() ? ' ' : '';
      input.value = input.value.trim() + space + transcript.trim();
      input.dispatchEvent(new Event('input')); // trigger resize and button state update
    }
  };

  speechRecognition.onerror = (e) => {
    console.error('Speech recognition error:', e.error);
    if (e.error !== 'no-speech') {
      stopSpeechRecognition();
    }
  };

  speechRecognition.onend = () => {
    if (isListening) {
      try {
        speechRecognition.start();
      } catch {
        // Safe catch if already running
      }
    }
  };

  return true;
}

function toggleSpeechRecognition() {
  if (isListening) {
    stopSpeechRecognition();
  } else {
    startSpeechRecognition();
  }
}

function startSpeechRecognition() {
  const supported = initSpeechRecognition();
  if (!supported) {
    alert('Voice input is not supported in this browser. Try Google Chrome or Microsoft Edge.');
    return;
  }

  isListening = true;
  const voiceBtn = document.getElementById('btn-voice-input');
  if (voiceBtn) {
    voiceBtn.classList.add('listening');
  }

  try {
    speechRecognition.start();
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
  }
}

function stopSpeechRecognition() {
  isListening = false;
  const voiceBtn = document.getElementById('btn-voice-input');
  if (voiceBtn) {
    voiceBtn.classList.remove('listening');
  }

  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch (err) {
      console.error('Failed to stop speech recognition:', err);
    }
  }
}

/**
 * Speech Synthesis (Text-to-Speech) functions
 */
function handleSpeakToggle(text, buttonEl) {
  if (typeof window.speechSynthesis === 'undefined') {
    alert('Voice readout is not supported in this browser.');
    return;
  }

  if (window.speechSynthesis.speaking && activeSpeakBtn === buttonEl) {
    window.speechSynthesis.cancel();
    resetSpeakButtonState();
    return;
  }

  window.speechSynthesis.cancel();
  resetSpeakButtonState();

  const settings = JSON.parse(localStorage.getItem('localchat-settings') || '{}');
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.rate = settings.ttsRate !== undefined ? settings.ttsRate : 1.0;
  utterance.pitch = settings.ttsPitch !== undefined ? settings.ttsPitch : 1.0;

  if (settings.ttsVoice) {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((v) => v.name === settings.ttsVoice);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  utterance.onstart = () => {
    activeSpeakBtn = buttonEl;
    buttonEl.classList.add('playing');
    buttonEl.setAttribute('title', 'Stop reading');
  };

  utterance.onend = () => {
    resetSpeakButtonState();
  };

  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    resetSpeakButtonState();
  };

  window.speechSynthesis.speak(utterance);
}

function resetSpeakButtonState() {
  if (activeSpeakBtn) {
    activeSpeakBtn.classList.remove('playing');
    activeSpeakBtn.setAttribute('title', 'Speak response');
    activeSpeakBtn = null;
  }
}
