# AI Research Assistant

A full-stack Perplexity-style AI research tool with real-time streaming, document intelligence, RAG pipeline, voice input, and subscription plans.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| AI | OpenAI GPT-4o + text-embedding-3-small |
| Vector DB | FAISS (in-process) |
| Database | MongoDB Atlas |
| Auth | JWT (bcrypt + PyJWT) |

---

## Setup

### 1. Backend

```bash
cd server

# Activate the virtual env (already created)
source venv/bin/activate

# Install new dependencies (bcrypt, PyJWT)
pip install bcrypt PyJWT

# OR reinstall everything
pip install -r requirements.txt

# Add your OpenAI key to .env
# OPENAI_API_KEY=sk-...

# Run
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

---

### 2. Frontend

```bash
cd client

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Features

- **Streaming chat** — SSE-based real-time streaming with GPT-4o
- **RAG pipeline** — Upload PDFs/text → FAISS vector index → grounded answers
- **Document panel** — Upload, list, and delete files per conversation
- **Summarize PDF** — One-click document summarization
- **Voice input** — Web Speech API (Chrome/Edge)
- **Prompt templates** — Explain / Compare / Summarize / Analyze
- **Follow-up suggestions** — Clickable question chips under every response
- **Conversation history** — Searchable, renameable, deleteable
- **Dark mode** — System-aware, persisted
- **Auth** — JWT register/login
- **Subscription tiers** — Free / Pro ($19) / Enterprise ($99)
- **Video upload** — Up to 100MB on Pro plan

---

## .env (server)

```
MONGO_URI=your_mongodb_uri
OPENAI_API_KEY=sk-...
JWT_SECRET=change-this-in-production
```

---

## File upload limits

| Plan | Documents | Videos |
|---|---|---|
| Free | 10 MB | Not allowed |
| Pro | 50 MB | 100 MB |
| Enterprise | 500 MB | 500 MB |
