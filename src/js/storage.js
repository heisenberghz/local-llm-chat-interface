/**
 * API client — all fetch calls to the Express backend.
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res;
}

// --- Models ---

export async function fetchModels() {
  const res = await request('/models');
  const data = await res.json();
  return data.models || [];
}

// --- Conversations ---

export async function fetchConversations() {
  const res = await request('/conversations');
  const data = await res.json();
  return data.conversations || [];
}

export async function fetchConversation(id) {
  const res = await request(`/conversations/${id}`);
  return res.json();
}

export async function createConversation(data = {}) {
  const res = await request('/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateConversation(id, data) {
  const res = await request(`/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteConversation(id) {
  await request(`/conversations/${id}`, { method: 'DELETE' });
}

// --- Settings ---

export async function fetchSettings() {
  const res = await request('/settings');
  return res.json();
}

export async function saveSettings(data) {
  const res = await request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
}

// --- Chat (streaming) ---

export async function sendChatMessage({ model, messages, requestId, options, signal }) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true, requestId, options }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Chat request failed');
  }

  return res;
}

export async function stopChat(requestId) {
  await request('/chat/stop', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
}
