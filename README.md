# DeepAgent — Autonomous Research & Analysis Agent

An autonomous AI agent that searches the web, reads webpages, executes Python code, and synthesizes comprehensive answers with a streaming UI.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌─────────────────────────────────────────────────────┐     │
│  │   Next.js Frontend (localhost:3000)                 │     │
│  │   • ChatInterface — message list + input            │     │
│  │   • MessageBubble — markdown rendering              │     │
│  │   • ToolStepCard  — live tool call visualization    │     │
│  │   • useAgent hook — SSE stream consumer             │     │
│  └─────────────────────┬───────────────────────────────┘     │
└────────────────────────│─────────────────────────────────────┘
                         │ SSE (text/event-stream)
┌────────────────────────▼─────────────────────────────────────┐
│              FastAPI Backend (localhost:8000)                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  /api/chat  →  ReAct Agent Loop                      │    │
│  │                                                      │    │
│  │  1. Pull relevant long-term memory (ChromaDB)        │    │
│  │  2. Send to GPT-4o with tool schemas                 │    │
│  │  3. If tool_call → run tool → feed result back       │    │
│  │  4. Repeat until final answer                        │    │
│  │  5. Stream final answer token by token               │    │
│  │  6. Save summary to ChromaDB                         │    │
│  └─────────┬──────────┬──────────┬───────────────────────┘    │
│            │          │          │                            │
│       web_search  read_url  execute_python                   │
│       (Tavily)   (requests  (subprocess                      │
│                  + BS4)      sandbox)                        │
└──────────────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Memory Layer       │
              │  • In-memory dict   │  ← short-term (session)
              │  • ChromaDB         │  ← long-term (cross-session)
              └─────────────────────┘
```

## Features

- **ReAct Loop** — Reason → Act (tool) → Observe → repeat
- **3 Tools**: Web Search (Tavily), URL Reader (BeautifulSoup), Python Executor
- **Streaming UI** — live token-by-token response with visible tool calls
- **Dual Memory** — per-session history + persistent ChromaDB for past research
- **Provider-agnostic** design — swap OpenAI for Claude in `agent/core.py`

## Quick Start

### 1. Clone & Setup

```bash
git clone <your-repo>
cd deepagent
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in your API keys
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and TAVILY_API_KEY

uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Get API Keys

| Key | Where to get |
|-----|-------------|
| `OPENAI_API_KEY` | platform.openai.com |
| `TAVILY_API_KEY` | tavily.com (free tier available) |

## Project Structure

```
deepagent/
├── backend/
│   ├── main.py              # FastAPI app + CORS
│   ├── agent/
│   │   ├── core.py          # ReAct agent loop (streaming)
│   │   ├── tools.py         # web_search, read_url, execute_python
│   │   └── memory.py        # Short-term + ChromaDB long-term memory
│   ├── api/
│   │   └── routes.py        # /chat (SSE), /session, /history
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/page.tsx
        ├── components/
        │   ├── ChatInterface.tsx   # Main chat UI
        │   ├── MessageBubble.tsx   # Markdown message renderer
        │   └── ToolStepCard.tsx    # Expandable tool call card
        ├── hooks/useAgent.ts       # SSE stream consumer + state
        └── lib/api.ts              # API client
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | GPT-4o (function calling) |
| Web Search | Tavily API |
| Backend | FastAPI + SSE |
| Long-term Memory | ChromaDB + text-embedding-3-small |
| Frontend | Next.js 14 + TypeScript |
| Styling | Tailwind CSS |
| Markdown | react-markdown + remark-gfm |

## Extending

- **Add a tool**: Define the function in `tools.py`, add its JSON schema to `TOOL_SCHEMAS`, register in `TOOL_REGISTRY`
- **Swap LLM**: Change the `model` param in `core.py` — works with any OpenAI-compatible API
- **Persistent sessions**: Replace the in-memory `_sessions` dict in `memory.py` with Redis
- **Deploy**: Backend → Railway/Render, Frontend → Vercel
