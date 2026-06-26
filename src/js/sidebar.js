/**
 * Sidebar — conversation list, new/rename/delete, search, mobile toggle.
 */

import {
  fetchConversations,
  fetchConversation,
  createConversation,
  updateConversation,
  deleteConversation,
} from './storage.js';
import { renderConversation, setCurrentConversation, getCurrentConversation, getIsStreaming, loadChatParameters } from './chat.js';
import { timeAgo } from './utils.js';

let conversations = [];
let activeId = null;

const listEl = () => document.getElementById('conversation-list');
const searchInput = () => document.getElementById('search-conversations');
const sidebar = () => document.getElementById('sidebar');
const overlay = () => document.getElementById('sidebar-overlay');
const contextMenu = () => document.getElementById('context-menu');

export async function initSidebar() {
  // Load conversations
  await refreshConversations();

  // New chat button
  document.getElementById('btn-new-chat').addEventListener('click', handleNewChat);

  // Search
  searchInput().addEventListener('input', (e) => {
    renderConversationList(e.target.value);
  });

  // Mobile menu
  document.getElementById('btn-menu').addEventListener('click', toggleMobileSidebar);
  overlay().addEventListener('click', closeMobileSidebar);

  // Listen for new conversation creation from chat
  window.addEventListener('conversation-created', async (e) => {
    await refreshConversations();
    setActive(e.detail.id);
  });

  // Close context menu on click elsewhere
  document.addEventListener('click', () => {
    contextMenu().style.display = 'none';
  });
}

async function refreshConversations() {
  try {
    conversations = await fetchConversations();
  } catch {
    conversations = [];
  }
  renderConversationList();
}

function renderConversationList(filter = '') {
  const list = listEl();
  list.innerHTML = '';

  const filtered = filter
    ? conversations.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase()))
    : conversations;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">
      ${filter ? 'No matching chats' : 'No conversations yet'}
    </div>`;
    return;
  }

  for (const conv of filtered) {
    const el = document.createElement('div');
    el.className = `conv-item${conv.id === activeId ? ' active' : ''}`;
    el.dataset.id = conv.id;

    el.innerHTML = `
      <svg class="conv-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="conv-title">${escapeHtml(conv.title)}</span>
      <div class="conv-actions">
        <button class="conv-action-btn" data-action="rename" title="Rename">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button class="conv-action-btn" data-action="delete" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // Click to open
    el.addEventListener('click', (e) => {
      if (e.target.closest('.conv-action-btn')) return;
      openConversation(conv.id);
      closeMobileSidebar();
    });

    // Action buttons
    el.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
      e.stopPropagation();
      startRename(conv.id, el);
    });

    el.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      handleDelete(conv.id);
    });

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, conv.id);
    });

    list.appendChild(el);
  }
}

async function openConversation(id) {
  if (getIsStreaming()) return;
  setActive(id);
  try {
    const conv = await fetchConversation(id);
    await renderConversation(conv);
  } catch (err) {
    console.error('Failed to load conversation:', err);
  }
}

function setActive(id) {
  activeId = id;
  listEl().querySelectorAll('.conv-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

async function handleNewChat() {
  if (getIsStreaming()) return;
  activeId = null;
  setCurrentConversation(null);
  loadChatParameters(null);
  listEl().querySelectorAll('.conv-item').forEach((el) => el.classList.remove('active'));

  // Reset chat area
  const messages = document.getElementById('messages');
  messages.innerHTML = '';
  const welcome = document.createElement('div');
  welcome.className = 'welcome';
  welcome.id = 'welcome';
  welcome.innerHTML = `
    <div class="welcome-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <h1>Welcome to LocalChat</h1>
    <p>Your private, local AI assistant. Select a model above and start chatting.</p>
    <div class="welcome-hints">
      <button class="hint-card" data-hint="Explain quantum computing in simple terms">
        <span class="hint-icon">💡</span><span>Explain quantum computing</span>
      </button>
      <button class="hint-card" data-hint="Write a Python function to sort a list using merge sort">
        <span class="hint-icon">💻</span><span>Write a sorting algorithm</span>
      </button>
      <button class="hint-card" data-hint="What are the pros and cons of microservices architecture?">
        <span class="hint-icon">🏗️</span><span>Compare architectures</span>
      </button>
      <button class="hint-card" data-hint="Help me write a professional email to decline a meeting">
        <span class="hint-icon">✉️</span><span>Draft a professional email</span>
      </button>
    </div>
  `;
  messages.appendChild(welcome);

  // Re-attach hint listeners
  welcome.querySelectorAll('.hint-card').forEach((card) => {
    card.addEventListener('click', () => {
      const input = document.getElementById('message-input');
      input.value = card.dataset.hint;
      input.dispatchEvent(new Event('input'));
      // Trigger send
      document.getElementById('btn-send').click();
    });
  });

  closeMobileSidebar();
}

function startRename(id, el) {
  const titleEl = el.querySelector('.conv-title');
  const currentTitle = titleEl.textContent;

  const input = document.createElement('input');
  input.className = 'conv-title-input';
  input.value = currentTitle;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const finish = async () => {
    const newTitle = input.value.trim() || currentTitle;
    const span = document.createElement('span');
    span.className = 'conv-title';
    span.textContent = newTitle;
    input.replaceWith(span);

    if (newTitle !== currentTitle) {
      await updateConversation(id, { title: newTitle });
      const conv = conversations.find((c) => c.id === id);
      if (conv) conv.title = newTitle;
    }
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      input.value = currentTitle;
      input.blur();
    }
  });
}

async function handleDelete(id) {
  if (!confirm('Delete this conversation?')) return;

  // Save current state for rollback
  const previousConversations = [...conversations];
  const wasActive = activeId === id;

  // Optimistically update list instantly
  conversations = conversations.filter((c) => c.id !== id);
  renderConversationList();

  if (wasActive) {
    activeId = null;
    setCurrentConversation(null);
    handleNewChat();
  }

  try {
    await deleteConversation(id);
  } catch (err) {
    console.error('Failed to delete:', err);
    alert('Failed to delete conversation: ' + err.message);
    
    // Rollback state on failure
    conversations = previousConversations;
    renderConversationList();
    if (wasActive) {
      activeId = id;
      openConversation(id);
    }
  }
}

function showContextMenu(e, id) {
  const menu = contextMenu();
  menu.style.display = 'block';
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;

  // Ensure menu doesn't go off screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 8}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  }

  document.getElementById('ctx-rename').onclick = (e) => {
    e.stopPropagation();
    menu.style.display = 'none';
    const el = listEl().querySelector(`[data-id="${id}"]`);
    if (el) startRename(id, el);
  };

  document.getElementById('ctx-delete').onclick = (e) => {
    e.stopPropagation();
    menu.style.display = 'none';
    handleDelete(id);
  };
}

function toggleMobileSidebar() {
  sidebar().classList.toggle('open');
  overlay().classList.toggle('visible');
}

function closeMobileSidebar() {
  sidebar().classList.remove('open');
  overlay().classList.remove('visible');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export { refreshConversations };
