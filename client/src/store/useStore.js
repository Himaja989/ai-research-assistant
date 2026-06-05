import { create } from 'zustand'

const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    set({ user: null, token: null, conversations: [], activeConversationId: null, messages: [] })
  },

  // ── Theme ─────────────────────────────────────────────────────────────────
  isDark: localStorage.getItem('theme') === 'dark',

  toggleTheme: () => {
    const next = !get().isDark
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    set({ isDark: next })
  },

  // ── Conversations ─────────────────────────────────────────────────────────
  conversations: [],
  activeConversationId: null,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),

  updateConversation: (id, patch) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    })),

  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId:
        s.activeConversationId === id ? null : s.activeConversationId,
      messages: s.activeConversationId === id ? [] : s.messages,
    })),

  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: [],

  setMessages: (messages) => set({ messages }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content }
          break
        }
      }
      return { messages: msgs }
    }),

  // ── Documents ─────────────────────────────────────────────────────────────
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

  // ── Streaming ─────────────────────────────────────────────────────────────
  isStreaming: false,
  setStreaming: (v) => set({ isStreaming: v }),

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Subscription ──────────────────────────────────────────────────────────
  subscription: null,
  setSubscription: (sub) => set({ subscription: sub }),
}))

export default useStore
