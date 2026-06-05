# AI Research Assistant

A production-ready AI-powered research platform built with FastAPI, React, MongoDB, FAISS, and modern AI APIs. The application enables users to chat with AI, upload and analyze documents, process images and videos, manage conversations, and perform retrieval-augmented research using their own data.

## Features

### AI Chat

* Real-time streaming AI responses using Server-Sent Events (SSE)
* Conversation history and management
* Research-focused AI assistant
* Markdown and code rendering support

### Retrieval-Augmented Generation (RAG)

* Semantic search using FAISS vector indexing
* Context-aware responses from uploaded documents
* Document chunking and embedding generation
* Citation-based answers

### Document Processing

* PDF support
* TXT support
* CSV support
* JSON support
* Markdown support
* HTML support
* XML support
* OCR fallback for scanned PDFs

### Image Understanding

* Upload and analyze images
* AI-powered image descriptions
* Question answering on uploaded images

### Video Analysis

* Upload video files
* Frame extraction using OpenCV
* AI-generated video summaries

### Voice Input

* Speech-to-text transcription
* Voice-enabled AI interactions

### Authentication & Security

* JWT authentication
* Secure password hashing with bcrypt
* Protected API routes
* User account management

### Subscription System

* Free Plan
* Pro Plan
* Enterprise Plan
* Usage and upload limits

### Additional Features

* Dark mode support
* Responsive design
* PDF export generation
* Conversation search
* File upload management

---

## Architecture

Frontend:

* React 18
* Vite
* Tailwind CSS
* Zustand
* React Router
* Axios
* Nginx

Backend:

* FastAPI
* Uvicorn
* MongoDB Atlas
* FAISS
* Sentence Transformers
* Groq API
* OpenAI API
* ReportLab
* OpenCV

---

## Project Structure

```text
ai-research-assistant/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── rag/
│   │
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
│
├── docker-compose.yml
├── README.md
└── railway.toml
```

---

## Docker Images

Frontend:

```bash
docker pull himajaarabati/ai-research-assistant-frontend
```

Backend:

```bash
docker pull himajaarabati/ai-research-assistant-backend
```

---

## Quick Start

### Clone Repository

```bash
git clone https://github.com/Himaja989/ai-research-assistant.git
cd ai-research-assistant
```

### Create Environment File

Create:

```text
server/.env
```

Example:

```env
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_secret_key
```

### Run with Docker Compose

```bash
docker-compose up -d
```

Frontend:

```text
http://localhost
```

Backend API:

```text
http://localhost:8000
```

API Documentation:

```text
http://localhost:8000/docs
```

Health Check:

```text
http://localhost:8000/health
```

---

## Environment Variables

| Variable       | Required | Description               |
| -------------- | -------- | ------------------------- |
| MONGO_URI      | Yes      | MongoDB connection string |
| GROQ_API_KEY   | Yes      | Groq API key              |
| OPENAI_API_KEY | Optional | OpenAI API key            |
| JWT_SECRET     | Yes      | JWT signing secret        |

---

## API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Conversations

```text
GET    /api/conversations
POST   /api/conversations
DELETE /api/conversations/{id}
```

### Chat

```text
POST /api/chat/stream
POST /api/chat/vision
POST /api/chat/summarize
```

### Documents

```text
POST   /api/documents/upload
GET    /api/documents/{conversation_id}
DELETE /api/documents/{id}
POST   /api/documents/generate-pdf
```

### Subscription

```text
GET  /api/subscription/plans
GET  /api/subscription/current
POST /api/subscription/upgrade
```

### System

```text
GET /health
```

---

## Deployment

### Docker Hub

Frontend:

```bash
docker pull himajaarabati/ai-research-assistant-frontend
```

Backend:

```bash
docker pull himajaarabati/ai-research-assistant-backend
```

### Railway

```bash
railway up
```

---

## Technologies Used

### Frontend

* React 18
* Vite
* Tailwind CSS
* Zustand
* React Router
* Axios
* Nginx

### Backend

* FastAPI
* Uvicorn
* MongoDB Atlas
* FAISS
* Sentence Transformers
* Groq
* OpenAI
* OpenCV
* ReportLab

---

## License

This project is provided for educational and portfolio purposes.
