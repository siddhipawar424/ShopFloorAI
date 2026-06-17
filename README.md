<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>

# ShopFloorAI - AI-Powered Multi-Agent System for Smart Manufacturing Automation

An AI-powered multi-agent CNC chatbot for **smart manufacturing automation**, built with the [Agno](https://github.com/agno-agi/agno) framework, **Google Gemini**, and a modern **Next.js** frontend. The platform orchestrates specialized AI agents to analyze CNC machine performance, OEE metrics, cycle times, Six Sigma quality data, and more - providing real-time diagnostics, predictions, and strategic guidance.

---

## Features

- **Multi-Agent Architecture** - Hierarchical agent team (Observer → Predict & Plan → Mentor) with specialized domain agents
- **OEE & CNC Analytics** - Natural language queries over machine performance data via AI-generated SQL
- **Six Sigma Knowledge Base** - Vector-embedded Six Sigma expertise with RAG retrieval
- **Cycle Time Analysis** - Deep analysis of manufacturing cycle time patterns
- **Web Research Agent** - Real-time web search integration via DuckDuckGo
- **Multilingual Support** - English, Hindi (हिंदी), and Hinglish with auto-detection
- **Voice Input** - Audio transcription powered by Gemini for hands-free queries
- **Session Persistence** - PostgreSQL-backed chat history with session management
- **JWT Authentication** - Secure auth backend with login/registration
- **Modern UI** - Next.js 15 + Tailwind CSS + Radix UI + Framer Motion frontend

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (agent-ui)                 │
│              Next.js 15 · Tailwind · Radix UI           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / WebSocket
       ┌───────────────┴───────────────┐
       │                               │
┌──────┴──────┐              ┌─────────┴─────────┐
│  Playground │              │   Auth Backend    │
│  (FastAPI)  │              │   (Express.js)    │
│  Port 7777  │              │   Port 5000       │
└──────┬──────┘              └───────────────────┘
       │
┌──────┴──────────────────────────────────────┐
│              Agent Team (agentTeam/)        │
│                                             │
│  ┌─────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ Mentor  │→ │ Predict &    │→ │Observer │ │
│  │ Agent   │  │ Plan Agent   │  │ Agent   │ │
│  └─────────┘  └──────────────┘  └────┬────┘ │
└──────────────────────────────────────┼──────┘
                                       │
┌──────────────────────────────────────┼─────┐
│          Domain Agents (agents/)     │     │
│                                      ▼     │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ CNC      │ │ OEE      │ │ Cycle Time  │ │
│  │ Agent    │ │ Agent    │ │ Agent       │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Six      │ │Knowledge │ │ Web         │ │
│  │ Sigma    │ │ Agent    │ │ Agent       │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
└────────────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │  PostgreSQL     │
              │  (Vector Store  │
              │   + Sessions)   │
              └─────────────────┘
```

---

## Project Structure

```
ShopFloorAI/
├── agent-ui/                  # Next.js 15 frontend (Tailwind + Radix UI)
│   ├── src/                   # React components, pages, stores
│   ├── package.json
│   └── ...
│
├── agents/                    # Domain-specific AI agents
│   ├── cnc_agent.py           # CNC machine data analysis
│   ├── oee_agent.py           # OEE (Overall Equipment Effectiveness)
│   ├── cycle_time_agent.py    # Cycle time analytics
│   ├── six_sigma_agent.py     # Six Sigma knowledge expert
│   ├── knowledge_agent.py     # RAG knowledge base agent
│   └── web_agent.py           # Web research agent (DuckDuckGo)
│
├── agentTeam/                 # Hierarchical agent orchestration
│   ├── observer.py            # Observer Agent — orchestrates domain agents
│   ├── predict_plan.py        # Predict & Plan Agent — forecasting
│   └── mentor.py              # Mentor Agent — strategic guidance
│
├── BACKEND/                   # Express.js auth backend
│   ├── src/
│   │   ├── server.js          # Express server entry point
│   │   ├── routes/            # Auth & machine routes
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/         # Auth middleware
│   │   └── config/            # DB config
│   └── package.json
│
├── client/                    # Agno Playground app (FastAPI)
│   └── playground_app.py      # Playground server with voice transcription
│
├── config/                    # Shared configuration
│   └── storage.py             # PostgreSQL storage setup
│
├── api_app.py                 # FastAPI chat API with session management
├── csv_api.py                 # Dynamic SQL API for CSV/OEE data queries
├── csv_search.py              # Semantic search over CSV embeddings
├── cycle_search.py            # Cycle time semantic search
├── cnc.py                     # CNC data processing utilities
├── temp.py                    # Knowledge base query utilities
├── agent.py                   # Standalone agent playground (legacy)
├── config.json                # MCP server configuration
│
├── .env.example               # Environment variable template (root)
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

---

## Getting Started

### Prerequisites

| Tool         | Version   |
|------------- |-----------|
| Python       | 3.10+     |
| Node.js      | 18+       |
| PostgreSQL   | 14+       |
| npm / pnpm   | Latest    |

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/ShopFloorAI.git
cd ShopFloorAI
```

### 2. Set Up Environment Variables

Copy the example env files and fill in your credentials:

```bash
# Root environment
cp .env.example .env

# Backend environment
cp BACKEND/.env.example BACKEND/.env
```

> **Important:** Never commit `.env` files. The `.gitignore` is configured to exclude them.

### 3. Set Up PostgreSQL Databases

Create the required databases in PostgreSQL:

```sql
CREATE DATABASE assistant;
CREATE DATABASE csv_embeddings;
CREATE DATABASE cycle_time_embeddings;
CREATE DATABASE cnc_embeddings;
CREATE DATABASE machinestatus;
CREATE DATABASE observer;
CREATE DATABASE login;
CREATE DATABASE registration;
```

### 4. Install Python Dependencies

```bash
pip install agno google-generativeai google-genai fastapi uvicorn psycopg2-binary python-dotenv duckduckgo-search pydantic PyJWT
```

### 5. Install Frontend Dependencies

```bash
# Agent UI (Next.js frontend)
cd agent-ui
npm install
cd ..

# Auth Backend (Express.js)
cd BACKEND
npm install
cd ..
```

### 6. Start the Services

Open **separate terminals** for each service:

```bash
# Terminal 1 - Playground API Server (port 7777)
python -m uvicorn client.playground_app:app --host 127.0.0.1 --port 7777

# Terminal 2 - Auth Backend (port 5000)
cd BACKEND
npm run dev

# Terminal 3 - Agent UI Frontend (port 3000)
cd agent-ui
npm run dev

# Terminal 4 (Optional) - Chat API (port 8000)
uvicorn api_app:app --host 127.0.0.1 --port 8000

# Terminal 5 (Optional) - CSV Query API
uvicorn csv_api:app --host 127.0.0.1 --port 8001
```

### 7. Open the App

Navigate to **http://localhost:3000** in your browser.

---

## Agent Descriptions

| Agent | Role | Model |
|-------|------|-------|
| **Observer Agent** | Orchestrates domain agents, detects inefficiencies and bottlenecks | Gemini 2.5 Flash |
| **Predict & Plan Agent** | Generates predictions and action plans from observer data | Gemini 2.5 Flash |
| **Mentor Agent** | Provides strategic guidance using Lean/Six Sigma/TPM frameworks | Gemini 2.5 Flash |
| **CNC Agent** | Analyzes CNC machine data via semantic search | Gemini 2.0 Flash |
| **OEE Agent** | Queries OEE metrics with AI-generated SQL | Gemini 2.5 Flash Lite |
| **Cycle Time Agent** | Analyzes manufacturing cycle time patterns | Gemini 2.0 Flash |
| **Six Sigma Agent** | Expert in Six Sigma methodologies with RAG knowledge base | Gemini 2.0 Flash Lite |
| **Knowledge Agent** | RAG-based retrieval from embedded knowledge documents | Gemini 2.0 Flash |
| **Web Agent** | Real-time web research via DuckDuckGo | Gemini 2.5 Flash Lite |

---

## API Endpoints

### Playground API (`localhost:7777`)
- `POST /v1/playground/agents` - List available agents
- `POST /v1/playground/agents/{agent_id}/runs` - Run an agent
- `POST /v1/playground/transcribe` - Transcribe audio input

### Chat API (`localhost:8000`)
- `POST /chat` - Send a message to the Observer Agent
- `GET /sessions` - List all chat sessions
- `GET /sessions/{session_id}` - Get a specific session
- `DELETE /sessions/{session_id}` - Delete a session

### CSV Query API (`localhost:8001`)
- `POST /query` - Natural language query over OEE data (requires JWT)

### Auth Backend (`localhost:5000`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Framework** | [Agno](https://github.com/agno-agi/agno) |
| **LLM** | Google Gemini (2.5 Flash, 2.0 Flash, Flash Lite) |
| **Backend (Agents)** | Python, FastAPI, Uvicorn |
| **Backend (Auth)** | Node.js, Express.js, JWT, bcrypt |
| **Frontend** | Next.js 15, React 18, Tailwind CSS, Radix UI, Framer Motion |
| **Database** | PostgreSQL (relational + pgvector for embeddings) |
| **Search** | DuckDuckGo API, Semantic vector search |
| **State Management** | Zustand |
| **Voice** | Gemini Audio Transcription |

---

## License

This project is open-source. See the [LICENSE](agent-ui/LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please read the [Contributing Guide](agent-ui/CONTRIBUTING.md) for guidelines.

---

<p align="center">
  Built with ❤️ using <strong>Agno</strong> + <strong>Google Gemini</strong>
</p>
