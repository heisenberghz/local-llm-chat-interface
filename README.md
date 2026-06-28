<div align="center">

# 🤖 LocalChat

### A premium, ChatGPT-like interface for your local AI models — fully private, fully yours.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org)
[![Ollama](https://img.shields.io/badge/Powered%20by-Ollama-orange.svg)](https://ollama.ai)
[![Vite](https://img.shields.io/badge/Bundled%20with-Vite-purple.svg)](https://vitejs.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Chat with Llama, Qwen, Gemma, Phi, Mistral, and any other local LLM —
> **no subscriptions, no telemetry, no internet required.**

</div>

---

## ✨ What is LocalChat?

LocalChat is a full-stack, browser-based chat application that connects to [Ollama](https://ollama.ai) — letting you run LLMs locally with a polished, feature-rich UI. It mirrors the experience of ChatGPT or Claude, but runs 100% on your machine. Your conversations, settings, and model data never leave your device.

---

## 🖼️ Feature Highlights

### 💬 Chat Engine
- **Real-time streaming** — Tokens render as they're generated, just like ChatGPT
- **Abort mid-stream** — Stop generation at any time with a dedicated Stop button
- **Auto-resizing textarea** — The input box grows smoothly as you type
- **Enter to send, Shift+Enter for newlines** — Familiar keyboard shortcuts
- **Live token counter** — Estimates current prompt token count in real time

### 📝 Markdown & Code Rendering
- **Full Markdown support** — Bold, italic, lists, tables, blockquotes, and headers
- **Syntax-highlighted code blocks** — Powered by [Highlight.js](https://highlightjs.org/) with 190+ language definitions
- **One-click code copy** — Every code block has a Copy button that confirms with a checkmark
- **Inline code formatting** — Clean monospaced rendering for inline snippets

### 🗂️ Conversation Management
- **Persistent history** — Chats are saved server-side as JSON files, surviving page refreshes
- **Sidebar navigation** — Browse, search, rename, and delete conversations
- **Auto-titles** — New chats are named automatically from your first message
- **Search** — Filter conversations by title in real time
- **Export** — Download any conversation as a `.txt` or `.json` file
- **Per-conversation model tracking** — Each chat remembers which model was used

### 🎙️ Voice Features
- **Speech-to-Text input** — Use your microphone to dictate messages (Web Speech API)
- **Text-to-Speech output** — Listen to AI responses read aloud with selectable system voices
- **TTS Auto-read** — Optionally auto-play responses as they're generated
- **Voice settings** — Adjust speech rate and pitch from the Settings panel

### 🧠 Model Command Center
A full-featured model management dashboard (accessible via sidebar):

- **Explore tab** — Discover trending GGUF models from Hugging Face, with search and curated picks
- **Local tab** — Browse all models installed in Ollama with full metadata
- **Split-pane UI** — Left pane for search/results, right pane for detailed model info
- **Rich metadata cards** — View parameters, architecture, quantization format, domain, and capabilities (Vision / Tool Use / Reasoning)
- **Hugging Face integration** — Searches the HF API live as you type, pulling real download counts and likes
- **GGUF download** — Select any quantization (Q4_K_M, Q8_0, BF16, etc.) and pull directly into Ollama with a live streaming progress bar
- **Exact file resolution** — Uses recursive Hugging Face tree API to resolve precise file sizes, even for models nested inside subdirectories
- **Sharded GGUF detection** — Automatically detects split multi-part archives and warns you with a clear explanation (Ollama doesn't support sharded GGUFs yet)
- **Model deletion** — Remove locally installed models with a confirmation prompt
- **Inline README viewer** — Renders each model's Hugging Face README inside the dashboard
- **Fallback states** — Graceful UI messages when metadata or quantization files are unavailable

### ⚙️ Settings
- **Ollama server URL** — Configure a custom Ollama host (default: `http://localhost:11434`)
- **Default model** — Pre-select a model that loads on startup
- **System prompt** — Set a persistent instruction that prefixes every conversation
- **Connection test** — Verify Ollama connectivity with a single click
- **TTS voice selection** — Choose from all voices installed on your system
- **TTS rate & pitch** — Fine-tune speech output with sliders

### 🎨 UI & Theming
- **Dark & Light mode** — Toggle with a single button, preference persisted across sessions
- **Industrial grid aesthetic** — Matte slate backgrounds, 1px zinc borders, sharp monochromatic typography
- **Smooth animations** — Subtle transitions on message entry, modal open/close, and sidebar toggles
- **Responsive layout** — Works on desktop and mobile screens
- **Welcome screen** — Shown when no conversation is active, with helpful prompts

---

## 🏗️ Architecture Overview

```
LocalChat
├── Frontend (Vite + Vanilla JS)          → http://localhost:5173
│   └── Communicates with the Express backend via REST & SSE
│
└── Backend (Express.js)                  → http://localhost:3001
    ├── Proxies chat requests to Ollama   → http://localhost:11434
    ├── Persists conversations as JSON    → server/data/conversations/
    ├── Stores settings                   → server/data/settings.json
    └── Proxies Hugging Face API          → https://huggingface.co/api/
```

---

## 📁 Project Structure

```
local-chat-interface/
│
├── server/                       # Express.js backend
│   ├── index.js                  # Entry point, mounts routes
│   ├── routes/
│   │   ├── chat.js               # POST /api/chat — streaming proxy to Ollama
│   │   ├── conversations.js      # CRUD endpoints for saved conversations
│   │   ├── models.js             # Model list, pull, delete, HF details proxy
│   │   └── settings.js           # GET/POST /api/settings
│   ├── utils/
│   │   └── ollama.js             # Ollama URL helper
│   └── data/                     # Persisted data (git-ignored)
│       ├── conversations/        # One JSON file per conversation
│       └── settings.json         # User preferences
│
├── src/                          # Frontend (Vanilla JS + Vite)
│   ├── index.html                # Main app shell
│   ├── main.js                   # App bootstrap — imports and inits all modules
│   ├── css/
│   │   └── styles.css            # All styles — design tokens, components, layouts
│   ├── js/
│   │   ├── chat.js               # Core chat engine — streaming, rendering, stop
│   │   ├── sidebar.js            # Conversation list, search, rename, delete
│   │   ├── models.js             # Model Command Center — explore, local, download
│   │   ├── settings.js           # Settings modal — load, save, test connection
│   │   ├── markdown.js           # Markdown renderer using marked + highlight.js
│   │   ├── storage.js            # API client wrappers for all backend routes
│   │   ├── theme.js              # Dark/light mode toggle and persistence
│   │   ├── export.js             # Chat export as .txt / .json
│   │   └── utils.js              # Token counting, date formatting, helpers
│   └── assets/                   # Static assets (favicon, etc.)
│
├── package.json
├── vite.config.js                # Vite dev proxy config
└── .gitignore
```

---

## ⚡ Prerequisites

| Requirement | Version | Download |
|---|---|---|
| **Node.js** | v18 or higher | [nodejs.org](https://nodejs.org) |
| **Ollama** | Latest | [ollama.ai](https://ollama.ai) |

> **Note:** Ollama must be running in the background before starting LocalChat.

---

## 🚀 Quick Start

### 1. Install Ollama & Pull a Model

```bash
# On macOS / Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Then download a model to chat with:
ollama pull llama3.2        # 2 GB  — Meta's Llama 3.2 3B (great all-rounder)
ollama pull qwen2:0.5b      # 352 MB — Tiny but capable, ideal for low-RAM devices
ollama pull phi3:mini       # 2.2 GB — Microsoft's compact 3.8B model
ollama pull mistral         # 4.1 GB — Mistral 7B, excellent for reasoning tasks
```

### 2. Clone & Install LocalChat

```bash
git clone https://github.com/your-username/local-chat-interface.git
cd local-chat-interface
npm install
```

### 3. Start the App

```bash
npm run dev
```

This starts both the Express API server (`port 3001`) and the Vite dev server (`port 5173`) concurrently. Open your browser and navigate to:

```
http://localhost:5173
```

---

## 🎮 Usage Guide

### Starting a Conversation
1. Select a model from the **dropdown** at the top of the page
2. Type your message in the **input box** at the bottom
3. Press **Enter** to send (or click the arrow button)
4. The AI's response streams in token-by-token — press **Stop** (■) to abort at any time

### Managing Chats
- All conversations are **auto-saved** and appear in the **left sidebar**
- Click a conversation to **resume** it
- Right-click or use the **⋯ menu** to rename or delete
- Use the **search bar** at the top of the sidebar to filter chats
- Click **Export** (↓) to download the active chat as `.txt` or `.json`

### Discovering & Downloading Models
1. Click the **⊞ Models** button in the sidebar to open the **Model Command Center**
2. Switch to the **Explore** tab to search Hugging Face for GGUF models
3. Click any result to view its specs, capabilities, quantization options, and README
4. Select a quantization from the dropdown and click **Download** to pull it via Ollama
5. Switch to the **Local** tab to manage models already installed on your machine

### Voice Input / Output
- Click the **microphone** icon in the input bar to dictate your message
- Click the **speaker** icon on any AI message to read it aloud
- Configure TTS voice, rate, and pitch in **Settings → Voice**

### Settings
Click the **⚙ Settings** button in the sidebar to configure:

| Setting | Description |
|---|---|
| Ollama URL | Address of your Ollama server (default: `http://localhost:11434`) |
| Default Model | The model pre-selected when the app loads |
| System Prompt | A persistent instruction prepended to every conversation |
| TTS Voice | System voice used for text-to-speech output |
| TTS Rate | Playback speed (0.5x – 2.0x) |
| TTS Pitch | Voice pitch (0.0 – 2.0) |
| Auto-read | Automatically read AI responses aloud as they stream |

---

## 🔌 Supported LLM Backends

LocalChat uses Ollama by default, but any OpenAI-compatible server works by updating the URL in Settings:

| Backend | Default URL | Notes |
|---|---|---|
| **Ollama** | `http://localhost:11434` | Default — full native support |
| **LM Studio** | `http://localhost:1234` | Set in Settings → Ollama URL |
| **llama.cpp server** | `http://localhost:8080` | Set in Settings → Ollama URL |
| **Jan** | `http://localhost:1337` | Set in Settings → Ollama URL |

---

## 🛠️ API Endpoints

The Express backend exposes the following REST API:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Stream a chat completion via Ollama (SSE) |
| `GET` | `/api/conversations` | List all saved conversations |
| `GET` | `/api/conversations/:id` | Get a specific conversation |
| `POST` | `/api/conversations` | Create a new conversation |
| `PUT` | `/api/conversations/:id` | Update a conversation (messages, title) |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `GET` | `/api/models` | List locally installed Ollama models |
| `POST` | `/api/models/pull` | Pull a model from Ollama (SSE progress) |
| `DELETE` | `/api/models` | Delete a locally installed model |
| `GET` | `/api/models/details` | Fetch Hugging Face model metadata + README |
| `GET` | `/api/settings` | Read saved settings |
| `POST` | `/api/settings` | Save settings |

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules) | UI logic, no framework bloat |
| **Bundler** | Vite 6 | Fast HMR dev server + production build |
| **Backend** | Express.js 4 | REST API, Ollama proxy, file persistence |
| **Markdown** | marked 18 | Markdown → HTML rendering |
| **Code Highlighting** | Highlight.js 11 | Syntax highlighting in 190+ languages |
| **IDs** | uuid 10 | Unique conversation and message identifiers |
| **Process Management** | concurrently 9 | Runs frontend and backend simultaneously |

---

## 📦 NPM Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start both servers concurrently (recommended) |
| `dev:server` | `npm run dev:server` | Start only the Express backend |
| `dev:client` | `npm run dev:client` | Start only the Vite frontend |
| `build` | `npm run build` | Build frontend for production to `dist/` |
| `start` | `npm run start` | Start Express server only (production use) |

---

## 🔒 Privacy

LocalChat is architected with privacy as a first principle:

- ✅ **All conversations** are stored as plain JSON files on your local disk (`server/data/`)
- ✅ **No analytics**, tracking scripts, or telemetry of any kind
- ✅ **No external API calls** — except when you explicitly browse Hugging Face in the Model Command Center
- ✅ **Ollama runs fully offline** — model inference happens entirely on your hardware
- ✅ **No accounts required** — no sign-up, no login, no cloud sync

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please keep PRs focused and well-described.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for full details.

---

<div align="center">

Built with ❤️ for the local AI community.

*Run your AI. Own your data.*

</div>
