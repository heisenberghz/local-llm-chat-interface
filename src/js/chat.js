/**
 * Chat engine — sending messages, streaming responses, rendering bubbles.
 */

import { sendChatMessage, stopChat, updateConversation } from './storage.js';
import { renderMarkdown, renderMarkdownSync } from './markdown.js';
import { countTokens, formatTokens, generateId, timeAgo } from './utils.js';

let currentConversation = null;
let isStreaming = false;
let currentRequestId = null;
let currentAbortController = null;

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

  // Hint cards
  document.querySelectorAll('.hint-card').forEach((card) => {
    card.addEventListener('click', () => {
      input.value = card.dataset.hint;
      input.dispatchEvent(new Event('input'));
      handleSend();
    });
  });
}

/**
 * Render a full conversation's messages.
 */
export async function renderConversation(conv) {
  currentConversation = conv;
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

  for (const msg of conv.messages) {
    const el = await createMessageEl(msg);
    messages.appendChild(el);
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
    const { createConversation: createConv } = await import('./storage.js');
    const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
    currentConversation = await createConv({ title, model });

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
  const userEl = await createMessageEl(userMsg);
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
  currentRequestId = generateId();
  currentAbortController = new AbortController();

  sendBtn().style.display = 'none';
  stopBtn().style.display = 'flex';

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

    const tokens = evalCount || countTokens(fullText);
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
    });
  }

  // Reset state
  isStreaming = false;
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
 * Create a message DOM element.
 */
async function createMessageEl(msg) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;

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
