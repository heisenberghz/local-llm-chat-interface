/**
 * Export conversation as TXT or JSON.
 */

import { getCurrentConversation } from './chat.js';

export function initExport() {
  const modal = document.getElementById('export-modal');
  const btnOpen = document.getElementById('btn-export');
  const btnClose = document.getElementById('btn-close-export');

  btnOpen.addEventListener('click', () => {
    const conv = getCurrentConversation();
    if (!conv || !conv.messages || conv.messages.length === 0) {
      alert('No conversation to export.');
      return;
    }
    modal.style.display = 'flex';
  });

  btnClose.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  document.getElementById('btn-export-txt').addEventListener('click', () => {
    exportAsTxt();
    modal.style.display = 'none';
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    exportAsJson();
    modal.style.display = 'none';
  });
}

function exportAsTxt() {
  const conv = getCurrentConversation();
  if (!conv) return;

  let text = `# ${conv.title}\n`;
  text += `Model: ${conv.model || 'N/A'}\n`;
  text += `Date: ${new Date(conv.createdAt).toLocaleString()}\n`;
  text += `${'─'.repeat(50)}\n\n`;

  for (const msg of conv.messages) {
    const role = msg.role === 'user' ? 'You' : 'AI';
    text += `[${role}]\n${msg.content}\n\n`;
  }

  download(`${sanitizeFilename(conv.title)}.txt`, text, 'text/plain');
}

function exportAsJson() {
  const conv = getCurrentConversation();
  if (!conv) return;

  const data = {
    title: conv.title,
    model: conv.model,
    createdAt: conv.createdAt,
    messages: conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      tokens: m.tokens,
    })),
  };

  download(`${sanitizeFilename(conv.title)}.json`, JSON.stringify(data, null, 2), 'application/json');
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 50) || 'conversation';
}
