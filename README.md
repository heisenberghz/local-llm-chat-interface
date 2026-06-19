# LocalChat — Talk to Your Local AI

A beautiful, ChatGPT-like interface for chatting with local LLMs powered by Ollama. Fully private, runs on your machine, no cloud APIs needed.

## Features

- 🎨 **Clean, modern UI** — Dark/light mode, glassmorphism, smooth animations
- 🔄 **Streaming responses** — Tokens appear as they're generated, just like ChatGPT
- 📝 **Markdown support** — Code blocks with syntax highlighting, copy button, bold, lists
- 💬 **Conversation history** — Create, rename, delete, and search past chats
- 🔧 **Model selector** — Pick from any Ollama model you've downloaded
- ⬇️ **Export** — Download chats as TXT or JSON
- 📱 **Responsive** — Works on desktop and mobile
- 🔒 **100% local** — Nothing leaves your machine

## Prerequisites

1. **Node.js** (v18 or higher) — [Download](https://nodejs.org)
2. **Ollama** — [Download](https://ollama.ai)

## Setup

### 1. Install Ollama and download a model

```bash
# After installing Ollama, download a model:
ollama pull llama3.2

# You can download multiple models:
ollama pull mistral
ollama pull phi3
```

### 2. Install and run LocalChat

```bash
# Install dependencies
npm install

# Start the app (opens at http://localhost:5173)
npm run dev
```

That's it! Open `http://localhost:5173` in your browser.

## Usage

1. **Select a model** from the dropdown at the top
2. **Type a message** and press Enter (or click Send)
3. **Watch the AI respond** in real-time with streaming
4. Your chats are **automatically saved** — find them in the sidebar

## Settings

Click the ⚙️ Settings button in the sidebar to:
- Change the Ollama URL (default: `http://localhost:11434`)
- Set a default model
- Add a system prompt (e.g., "You are a Python coding expert")
- Test the connection to Ollama

## Project Structure

```
├── server/          Backend (Express.js)
│   ├── routes/      API endpoints
│   ├── data/        Saved conversations + settings
│   └── utils/       Ollama helper
├── src/             Frontend (Vanilla JS)
│   ├── css/         Styles
│   ├── js/          Modules (chat, sidebar, settings, etc.)
│   └── index.html   Main page
├── package.json
└── vite.config.js
```

## Supported LLM Backends

- **Ollama** (default) — `http://localhost:11434`
- **LM Studio** — Change URL in Settings to `http://localhost:1234`
- **llama.cpp** — Change URL in Settings to your server address

## License

MIT
