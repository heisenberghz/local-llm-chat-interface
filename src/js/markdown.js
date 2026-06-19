/**
 * Markdown rendering with syntax highlighting and copy buttons.
 * Uses marked and highlight.js as bundled npm packages (no CDN issues).
 */

import { marked } from 'marked';
import hljs from 'highlight.js';

let configured = false;

let isStreamingMode = false;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build the HTML for a code block with header + copy button.
 */
function renderCodeBlock(code, lang, isStreaming = false) {
  const language = lang || '';
  let highlighted;
  try {
    if (language && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(code, { language }).value;
    } else if (isStreaming) {
      highlighted = escapeHtml(code);
    } else if (language) {
      highlighted = hljs.highlight(code, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(code).value;
    }
  } catch {
    highlighted = escapeHtml(code);
  }

  const displayLanguage = language || 'plaintext';
  const encoded = encodeURIComponent(code);
  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span>${escapeHtml(displayLanguage)}</span>
      <button class="code-copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')).then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})">Copy</button>
    </div>
    <pre><code class="hljs language-${escapeHtml(displayLanguage)}">${highlighted}</code></pre>
  </div>`;
}

/**
 * Configure marked with custom renderer (only once).
 */
function ensureConfigured() {
  if (configured) return;

  marked.use({
    renderer: {
      code({ text, lang }) {
        return renderCodeBlock(text, lang, isStreamingMode);
      },
    },
    breaks: true,
    gfm: true,
  });

  configured = true;
}

/**
 * Render markdown string to HTML (async version, used after streaming completes).
 */
export async function renderMarkdown(text) {
  ensureConfigured();
  isStreamingMode = false;
  try {
    return marked.parse(text);
  } catch (err) {
    console.error('Markdown render error:', err);
    return escapeHtml(text);
  }
}

/**
 * Render markdown synchronously (used during streaming).
 */
export function renderMarkdownSync(text) {
  ensureConfigured();
  isStreamingMode = true;
  try {
    return marked.parse(text);
  } catch (err) {
    console.error('Markdown sync render error:', err);
    return escapeHtml(text);
  } finally {
    isStreamingMode = false;
  }
}

/**
 * Initialize — call once on app start.
 */
export async function initMarkdown() {
  ensureConfigured();
}
