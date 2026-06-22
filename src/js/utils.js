/**
 * Small utility functions.
 */

/**
 * Approximate token count (~4 chars per token).
 */
export function countTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Format a token count for display.
 */
export function formatTokens(count) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k tokens`;
  return `${count} tokens`;
}

/**
 * Relative time string ("just now", "2 min ago", etc).
 */
export function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Generate a simple random ID.
 */
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Format bytes into human-readable size.
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

/**
 * Debounce a function.
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Custom architectural confirmation dialog.
 */
export function showConfirm(message, confirmText = 'OK') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const btnOk = document.getElementById('btn-ok-confirm');
    const btnCancel = document.getElementById('btn-cancel-confirm');
    const btnClose = document.getElementById('btn-close-confirm');

    if (!modal || !msgEl || !btnOk || !btnCancel || !btnClose) {
      resolve(confirm(message));
      return;
    }

    msgEl.textContent = message;
    btnOk.textContent = confirmText;
    modal.style.display = 'flex';

    const cleanup = (result) => {
      modal.style.display = 'none';
      // Use cloneNode or manually remove listeners to avoid accumulation
      const newBtnOk = btnOk.cloneNode(true);
      btnOk.parentNode.replaceChild(newBtnOk, btnOk);
      
      const newBtnCancel = btnCancel.cloneNode(true);
      btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

      const newBtnClose = btnClose.cloneNode(true);
      btnClose.parentNode.replaceChild(newBtnClose, btnClose);

      resolve(result);
    };

    btnOk.addEventListener('click', () => cleanup(true));
    btnCancel.addEventListener('click', () => cleanup(false));
    btnClose.addEventListener('click', () => cleanup(false));
  });
}

