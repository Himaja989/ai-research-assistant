#!/usr/bin/env bash
# ============================================================
# push-to-dockerhub.sh
# Tags, pushes, and sets Docker Hub descriptions for
# AI Research Assistant (frontend + backend)
# Usage: bash push-to-dockerhub.sh
# ============================================================

set -e

DOCKERHUB_USER="himajaarabati"
BACKEND_REPO="ai-research-assistant-backend"
FRONTEND_REPO="ai-research-assistant-frontend"

# ── Step 1: Login ────────────────────────────────────────────
echo ""
echo "🔐 Logging in to Docker Hub..."
docker login --username "$DOCKERHUB_USER"

# ── Step 2: Tag images ───────────────────────────────────────
echo ""
echo "🏷️  Tagging images..."
docker tag ai-research-assistant-backend:latest "$DOCKERHUB_USER/$BACKEND_REPO:latest"
docker tag ai-research-assistant-frontend:latest "$DOCKERHUB_USER/$FRONTEND_REPO:latest"
echo "   ✅ Tagged backend  → $DOCKERHUB_USER/$BACKEND_REPO:latest"
echo "   ✅ Tagged frontend → $DOCKERHUB_USER/$FRONTEND_REPO:latest"

# ── Step 3: Push images ──────────────────────────────────────
echo ""
echo "🚀 Pushing backend..."
docker push "$DOCKERHUB_USER/$BACKEND_REPO:latest"

echo ""
echo "🚀 Pushing frontend..."
docker push "$DOCKERHUB_USER/$FRONTEND_REPO:latest"

# ── Step 4: Get Docker Hub JWT token ────────────────────────
echo ""
echo "📝 Fetching Docker Hub token to update descriptions..."
read -s -p "   Re-enter your Docker Hub password (for API): " DH_PASS
echo ""

TOKEN=$(curl -s -X POST "https://hub.docker.com/v2/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$DOCKERHUB_USER\", \"password\": \"$DH_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

if [ -z "$TOKEN" ]; then
  echo "   ❌ Could not get token. Check your credentials."
  exit 1
fi
echo "   ✅ Authenticated."

# ── Step 5: Backend description ─────────────────────────────
BACKEND_SHORT="FastAPI backend for AI Research Assistant — RAG-powered chat, document intelligence, and streaming AI responses."

BACKEND_FULL="# 🧠 AI Research Assistant — Backend

> **Supercharge your research with AI-powered document analysis, semantic search, and streaming chat.**

## Overview

This is the **FastAPI backend** for the AI Research Assistant platform — a full-featured, production-ready service that combines Retrieval-Augmented Generation (RAG), multi-modal document processing, and real-time streaming AI responses.

---

## ✨ Features

- 🔍 **RAG Pipeline** — FAISS vector store + sentence-transformers for semantic document search
- 📄 **Document Intelligence** — PDF, TXT, CSV, JSON, Markdown, HTML extraction via pdfplumber / pypdf
- 🤖 **Streaming Chat** — Server-Sent Events (SSE) with Groq (LLaMA 3.1 8B)
- 🖼️ **Vision Support** — Image understanding via OpenAI GPT-4o vision
- 🎙️ **Voice Input** — Whisper-based audio transcription
- 👁️ **Video Analysis** — Frame extraction + AI description for uploaded videos
- 📊 **Subscription Tiers** — Free / Pro / Enterprise plan enforcement
- 🔐 **JWT Authentication** — Secure registration, login, token refresh
- 💾 **MongoDB Atlas** — Persistent conversations, documents, and user data
- 📁 **File Management** — Upload, index, delete documents per conversation

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn |
| AI / LLM | Groq (LLaMA 3.1-8B-Instant) |
| Vision | OpenAI GPT-4o |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Vector Store | FAISS (CPU) |
| Database | MongoDB Atlas (Motor async driver) |
| Auth | JWT (HS256) |
| PDF | pdfplumber, pypdf |
| Speech | OpenAI Whisper |

---

## 🚀 Quick Start

\`\`\`bash
docker pull himajaarabati/ai-research-assistant-backend

docker run -d \\
  -p 8000:8000 \\
  -e MONGO_URI=your_mongo_uri \\
  -e GROQ_API_KEY=your_groq_key \\
  -e OPENAI_API_KEY=your_openai_key \\
  -e JWT_SECRET=your_secret \\
  himajaarabati/ai-research-assistant-backend
\`\`\`

Or use **docker-compose** with the full stack — see the [frontend image](https://hub.docker.com/r/himajaarabati/ai-research-assistant-frontend).

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| \`MONGO_URI\` | ✅ | MongoDB Atlas connection string |
| \`GROQ_API_KEY\` | ✅ | Groq API key for LLaMA chat |
| \`OPENAI_API_KEY\` | ✅ | OpenAI key for vision & Whisper |
| \`JWT_SECRET\` | ✅ | Secret for signing JWT tokens |

---

## 📡 API Highlights

| Method | Endpoint | Description |
|---|---|---|
| POST | \`/api/auth/register\` | Register new user |
| POST | \`/api/auth/login\` | Login & get JWT |
| POST | \`/api/chat/stream\` | Streaming SSE chat |
| POST | \`/api/documents/upload\` | Upload & index document |
| GET | \`/api/documents/{conv_id}\` | List documents |
| POST | \`/api/chat/vision\` | Image understanding |
| GET | \`/health\` | Health check |

---

## 🏗️ Architecture

\`\`\`
Client Request
     │
     ▼
FastAPI Router
     │
  ┌──┴──────────────────┐
  │  Auth Middleware     │
  │  (JWT Validation)   │
  └──┬──────────────────┘
     │
  ┌──┴──────────────────────────────────┐
  │  Services                           │
  │  ├─ ChatService (Groq SSE stream)   │
  │  ├─ DocumentService (RAG + FAISS)   │
  │  ├─ VisionService (OpenAI)          │
  │  └─ SubscriptionService             │
  └──┬──────────────────────────────────┘
     │
  ┌──┴────────────────┐
  │  MongoDB Atlas    │
  │  FAISS Index      │
  └───────────────────┘
\`\`\`

---

## 🔗 Related

- **Frontend**: [himajaarabati/ai-research-assistant-frontend](https://hub.docker.com/r/himajaarabati/ai-research-assistant-frontend)
- **Full stack docker-compose**: see the GitHub repository

---

*Built with ❤️ using FastAPI, Groq, and FAISS*"

# ── Step 6: Frontend description ────────────────────────────
FRONTEND_SHORT="React 18 + Vite frontend for AI Research Assistant — chat UI with document uploads, voice input, image analysis, and real-time streaming AI responses served via Nginx."

FRONTEND_FULL="# AI Research Assistant — Frontend

A production-ready, responsive single-page application that gives users a clean interface to chat with AI, upload research documents, analyze images, and manage their conversations — all powered by a FastAPI backend.

---

## What This Image Contains

This Docker image packages the compiled React application and serves it through an Nginx web server. When a user visits the app in their browser, Nginx serves the HTML/CSS/JS files and forwards all API calls (anything under /api/) to the backend container running on port 8000.

---

## Features

**Streaming Chat**
Messages from the AI appear word by word in real time. This is achieved using Server-Sent Events (SSE) — the browser opens a persistent connection to the backend and receives chunks of text as the AI generates them, instead of waiting for the full response.

**Document Upload**
Users can upload PDF, TXT, CSV, JSON, Markdown, and HTML files into a conversation. The backend extracts the text, breaks it into chunks, and stores it in a vector index so the AI can search and cite from those documents when answering questions.

**Image Understanding**
Users can upload images (JPG, PNG, GIF, WebP) and ask questions about them. The frontend sends the image to the backend, which passes it to OpenAI's vision model for analysis.

**Voice Input**
Users can click a microphone button, speak their question, and have it transcribed automatically. The audio is sent to the backend, which uses OpenAI Whisper to convert speech to text and then processes it as a regular chat message.

**Video Upload**
Users can upload video files (MP4, MOV, AVI, MKV, WebM). The backend extracts frames from the video and uses AI to describe what is happening, then returns a summary to the user.

**Conversation History**
All conversations are saved to MongoDB through the backend. The left sidebar lists every conversation the user has had, with a search bar to find old ones quickly.

**Citation Cards**
When the AI answers using content from an uploaded document, it shows a citation card below the message indicating which document and section the information came from. This helps users trace the source of every AI-generated answer.

**Subscription Plans**
The app supports three tiers — Free, Pro, and Enterprise — each with different limits on file size, number of documents, and messages per day. The frontend shows a plan comparison page and handles the upgrade flow. Free plan switches instantly; paid plans show a payment details modal.

**Dark Mode**
The entire interface supports both light and dark themes, toggled by the user.

**Responsive Design**
The layout adjusts for both desktop and mobile screen sizes.

**Markdown Rendering**
AI responses are rendered as rich text — headings, bold, italics, bullet lists, numbered lists, tables, and code blocks with syntax highlighting are all supported.

**JWT Authentication**
Users register and log in through a tabbed auth page. On login, the backend issues a JSON Web Token (JWT) that the frontend stores in localStorage and attaches to every API request as a Bearer token. If the token expires or is invalid, the user is automatically redirected back to the login page.

---

## Tech Stack Explained

**React 18**
The UI framework. React lets the interface update efficiently when data changes — for example, appending a new word to a streaming message — without re-rendering the whole page. Version 18 adds concurrent rendering, which keeps the UI responsive even during heavy updates like long streaming responses.

**Vite**
The build tool that compiles and bundles the React source code into static HTML, CSS, and JavaScript files for production. Vite is significantly faster than older tools like Webpack, especially during development. The final output (the /dist folder) is what gets copied into the Nginx container.

**Tailwind CSS**
A utility-first CSS framework. Instead of writing separate CSS files, styles are applied directly in JSX using class names like \`bg-gray-900\`, \`text-white\`, or \`flex items-center\`. This keeps styling co-located with components and makes it easy to build consistent, responsive layouts quickly.

**Zustand**
A lightweight global state manager for React. It holds shared data like the currently logged-in user, the active conversation, the list of messages, and the subscription plan — so any component in the app can read or update this data without passing props through every level of the component tree.

**React Router v6**
Handles client-side navigation. When a user clicks between the chat page, the subscription page, or the auth page, React Router swaps the displayed component without making a full page reload. The Nginx \`try_files\` fallback ensures that if a user refreshes or navigates directly to a URL like /subscription, Nginx serves index.html and lets React Router take over.

**Axios**
An HTTP client used for all standard API calls (login, listing conversations, fetching documents, etc.). It is configured with a base URL of /api and an interceptor that automatically attaches the JWT token to every outgoing request.

**Fetch API with SSE Reader**
For streaming chat responses, the app uses the native browser Fetch API rather than Axios. Fetch exposes a ReadableStream on the response body, which allows the app to read incoming text chunks one by one as the backend sends them. Each chunk is a JSON-encoded SSE event (data: {...}) that the app parses and appends to the message being displayed.

**react-markdown + remark-gfm**
react-markdown converts the plain text AI response (which uses Markdown syntax) into properly formatted HTML elements. remark-gfm is a plugin that adds support for GitHub Flavored Markdown — tables, strikethrough, task lists, and autolinks.

**react-syntax-highlighter**
When the AI response contains a code block (fenced with triple backticks), this library renders it with language-specific syntax highlighting, making code easy to read.

**react-hot-toast**
A lightweight notification library. It displays small toast messages in the corner of the screen for events like successful file upload, plan upgrade, login errors, or copy-to-clipboard confirmation. Toasts automatically disappear after a few seconds.

**Lucide React**
A set of clean, consistent SVG icons used throughout the UI — for buttons, sidebar items, file type indicators, and action menus.

**Nginx (Alpine)**
The web server that runs inside the container. It serves the compiled React files as static assets and acts as a reverse proxy — forwarding all requests to /api/* and /uploads/* to the backend container. The Alpine variant keeps the image size small. Key configuration details are listed in the Nginx Configuration section below.

---

## Quick Start

Pull and run the frontend container alone:

\`\`\`bash
docker pull himajaarabati/ai-research-assistant-frontend
docker run -d -p 80:80 himajaarabati/ai-research-assistant-frontend
\`\`\`

Note: running the frontend alone will not work end-to-end because all /api/ calls will fail without the backend. Use docker-compose for the full stack.

---

## Full Stack with docker-compose

\`\`\`yaml
version: \"3.9\"

services:
  backend:
    image: himajaarabati/ai-research-assistant-backend:latest
    env_file: ./server/.env
    volumes:
      - uploads_data:/app/app/uploads
    ports:
      - \"8000:8000\"

  frontend:
    image: himajaarabati/ai-research-assistant-frontend:latest
    ports:
      - \"80:80\"
    depends_on:
      - backend

volumes:
  uploads_data:
\`\`\`

Save this as docker-compose.yml, create a server/.env file with your environment variables, then run:

\`\`\`bash
docker-compose up -d
\`\`\`

Open http://localhost in your browser.

---

## Nginx Configuration

The Nginx server inside this container is configured with the following settings:

**client_max_body_size 500M**
By default, Nginx rejects any request body larger than 1MB with a 413 error. This limit is raised to 500MB to support enterprise-plan users uploading large files. Without this setting, file uploads would silently fail.

**proxy_buffering off / proxy_cache off**
Nginx normally buffers backend responses before sending them to the client. For SSE streaming, this would mean the user sees nothing until the entire AI response is finished. Disabling buffering ensures each text chunk is forwarded to the browser immediately as the backend produces it.

**chunked_transfer_encoding on**
Enables HTTP chunked transfer, which allows the server to send data in pieces without knowing the total content length upfront — required for streaming responses.

**proxy_read_timeout 300s / proxy_send_timeout 300s**
For large file uploads, the connection between Nginx and the backend needs to stay open long enough to complete the transfer. These timeouts are set to 5 minutes to prevent Nginx from dropping the connection mid-upload.

**try_files $uri $uri/ /index.html**
For any URL that does not match a static file, Nginx serves index.html. This is required for React Router to work correctly — without it, refreshing the page on a route like /subscription would return a 404 from Nginx.

---

## Related

- Backend image: [himajaarabati/ai-research-assistant-backend](https://hub.docker.com/r/himajaarabati/ai-research-assistant-backend)

---

Built with React 18, Vite, Tailwind CSS, and Nginx."

# ── Step 7: Patch descriptions via API ──────────────────────
echo ""
echo "📝 Updating backend repository description..."
curl -s -X PATCH "https://hub.docker.com/v2/repositories/$DOCKERHUB_USER/$BACKEND_REPO/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"description\": $(echo "$BACKEND_SHORT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'), \"full_description\": $(echo "$BACKEND_FULL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('   ✅ Backend description updated!' if 'name' in d else f'   ⚠️  {d}')"

echo ""
echo "📝 Updating frontend repository description..."
curl -s -X PATCH "https://hub.docker.com/v2/repositories/$DOCKERHUB_USER/$FRONTEND_REPO/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"description\": $(echo "$FRONTEND_SHORT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'), \"full_description\": $(echo "$FRONTEND_FULL" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))')}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('   ✅ Frontend description updated!' if 'name' in d else f'   ⚠️  {d}')"

echo ""
echo "🎉 All done!"
echo "   🔗 https://hub.docker.com/r/$DOCKERHUB_USER/$BACKEND_REPO"
echo "   🔗 https://hub.docker.com/r/$DOCKERHUB_USER/$FRONTEND_REPO"
