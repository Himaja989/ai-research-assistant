import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversationsAPI = {
  list: () => api.get('/conversations'),
  create: (title) => api.post('/conversations', { title }),
  rename: (id, title) => api.put(`/conversations/${id}`, { title }),
  delete: (id) => api.delete(`/conversations/${id}`),
  search: (q) => api.get(`/conversations/search?q=${encodeURIComponent(q)}`),
}

// ── Chats ─────────────────────────────────────────────────────────────────────
export const chatsAPI = {
  getByConversation: (conversationId) => api.get(`/chats/${conversationId}`),
  search: (q) => api.get(`/chats/search/${encodeURIComponent(q)}`),
}

// ── Streaming chat (SSE) ─────────────────────────────────────────────────────
export async function streamChat({ question, conversationId, onChunk, onDone, onError }) {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      conversation_id: conversationId || null,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Request failed' }))
    onError?.(err.detail || 'Something went wrong')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n').filter((l) => l.startsWith('data: '))

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'chunk') onChunk?.(data.content)
        else if (data.type === 'done') await onDone?.(data)
        else if (data.type === 'error') onError?.(data.message)
      } catch {
        // ignore parse errors
      }
    }
  }
}

// ── Summarize ─────────────────────────────────────────────────────────────────
export async function streamSummarize({ conversationId, onChunk, onDone, onError }) {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/chat/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversation_id: conversationId }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed' }))
    onError?.(err.detail || 'Summarization failed')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    const lines = text.split('\n').filter((l) => l.startsWith('data: '))
    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'chunk') onChunk?.(data.content)
        else if (data.type === 'done') onDone?.(data)
      } catch {}
    }
  }
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsAPI = {
  upload: (file, conversationId) => {
    const form = new FormData()
    form.append('file', file)
    if (conversationId) form.append('conversation_id', conversationId)
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: (conversationId) => api.get(`/documents/${conversationId}`),
  delete: (id) => api.delete(`/documents/${id}`),
  generatePDF: (content, filename) => api.post('/documents/generate-pdf', { content, filename }),
}

// ── Subscription ──────────────────────────────────────────────────────────────
export const subscriptionAPI = {
  plans: () => api.get('/subscription/plans'),
  current: () => api.get('/subscription/current'),
  upgrade: (plan) => api.post('/subscription/upgrade', { plan }),
}

export default api
