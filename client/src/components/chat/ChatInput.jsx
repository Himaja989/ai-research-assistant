import { useState, useRef, useCallback } from 'react'
import { Send, Mic, MicOff, Paperclip, X, Loader2, ChevronDown, FileText } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { streamChat, streamSummarize, documentsAPI, conversationsAPI } from '../../utils/api'
import useStore from '../../store/useStore'
import toast from 'react-hot-toast'

const PROMPT_TEMPLATES = [
  { label: '📖 Explain', prefix: 'Explain in detail: ' },
  { label: '⚖️ Compare', prefix: 'Compare and contrast: ' },
  { label: '📝 Summarize', prefix: 'Summarize: ' },
  { label: '🔍 Analyze', prefix: 'Analyze the following: ' },
  { label: '💡 Brainstorm', prefix: 'Give me 5 ideas for: ' },
  { label: '✅ Pros & Cons', prefix: 'List pros and cons of: ' },
]

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export default function ChatInput({ onSend, isStreaming, externalValue, onExternalValueUsed }) {
  const [text, setText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(null)
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)

  const activeConversationId = useStore((s) => s.activeConversationId)
  const setActiveConversation = useStore((s) => s.setActiveConversation)
  const addConversation = useStore((s) => s.addConversation)
  const addMessage = useStore((s) => s.addMessage)
  const updateLastAssistantMessage = useStore((s) => s.updateLastAssistantMessage)
  const setStreaming = useStore((s) => s.setStreaming)

  if (externalValue && externalValue !== text) {
    setText(externalValue)
    onExternalValueUsed?.()
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const { isListening, startListening, stopListening } = useVoiceInput({
    onResult: (transcript) => {
      setText((prev) => (prev ? prev + ' ' + transcript : transcript))
      textareaRef.current?.focus()
    },
  })

  const markStreamingDone = () => {
    useStore.setState((s) => {
      const msgs = [...s.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], streaming: false }
          break
        }
      }
      return { messages: msgs }
    })
  }

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (isStreaming) return

    // ── File attachment path ──────────────────────────────────────────────────
    if (pendingAttachment) {
      const att = pendingAttachment
      setPendingAttachment(null)
      setText('')

      const question = trimmed || (att.type === 'image'
        ? 'Describe what you see in this image in detail.'
        : 'Summarize this document.')

      // ── Image attachment → vision analysis ───────────────────────────────
      if (att.type === 'image') {
        addMessage({
          id: Date.now() + '_img',
          type: 'image',
          filename: att.filename,
          imageData: att.base64,
          created_at: new Date().toISOString(),
        })
        if (trimmed) {
          addMessage({ id: Date.now() + '_uq', role: 'user', content: trimmed, created_at: new Date().toISOString() })
        }

        const aiMsg = { id: Date.now() + '_a', role: 'assistant', content: '', streaming: true, created_at: new Date().toISOString() }
        addMessage(aiMsg)
        setStreaming(true)

        const token = localStorage.getItem('token')
        try {
          const response = await fetch('/api/chat/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ image_base64: att.base64, conversation_id: att.convId, question }),
          })
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let acc = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '))
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.type === 'chunk') { acc += parsed.content; updateLastAssistantMessage(acc) }
                if (parsed.type === 'done') { setStreaming(false); markStreamingDone() }
                if (parsed.type === 'error') { setStreaming(false); updateLastAssistantMessage(`❌ ${parsed.message}`); markStreamingDone() }
              } catch {}
            }
          }
        } catch {
          setStreaming(false)
          markStreamingDone()
          toast.error('Vision analysis failed')
        }
        return
      }

      // ── Document attachment → chat or summarize ──────────────────────────
      addMessage({
        id: Date.now() + '_upload',
        type: 'upload',
        filename: att.filename,
        fileType: att.docData?.file_type,
        chunks: att.docData?.chunks,
        indexed: att.docData?.indexed,
        created_at: new Date().toISOString(),
      })
      if (trimmed) {
        addMessage({ id: Date.now() + '_uq', role: 'user', content: trimmed, created_at: new Date().toISOString() })
      }
      addMessage({ id: Date.now() + '_a', role: 'assistant', content: '', streaming: true, created_at: new Date().toISOString() })
      setStreaming(true)

      if (trimmed) {
        // User asked a specific question — stream AI response with doc context
        let acc = ''
        await streamChat({
          question: trimmed,
          conversationId: att.convId,
          onChunk: (chunk) => { acc += chunk; updateLastAssistantMessage(acc) },
          onDone: (data) => {
            setStreaming(false)
            markStreamingDone()
            if (!att.convId && data?.conversation_id) {
              useStore.getState().setActiveConversation(data.conversation_id)
              import('../../utils/api').then(({ conversationsAPI: cAPI }) => {
                cAPI.list().then(({ data: convs }) => {
                  useStore.getState().setConversations(convs)
                })
              })
            }
          },
          onError: (msg) => {
            setStreaming(false)
            updateLastAssistantMessage(`❌ Error: ${msg}`)
            markStreamingDone()
            toast.error(msg)
          },
        })
      } else {
        // No question — auto-summarize the document
        let acc = ''
        await streamSummarize({
          conversationId: att.convId,
          onChunk: (chunk) => { acc += chunk; updateLastAssistantMessage(acc) },
          onDone: () => { setStreaming(false); markStreamingDone() },
          onError: (msg) => { setStreaming(false); updateLastAssistantMessage(`❌ ${msg}`); markStreamingDone() },
        })
      }
      return
    }

    // ── Plain text message path ───────────────────────────────────────────────
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }, [text, isStreaming, pendingAttachment, onSend, addMessage, updateLastAssistantMessage, setStreaming])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const applyTemplate = (prefix) => {
    setText(prefix)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingFile(file.name)

    try {
      // Ensure a conversation exists for RAG indexing
      let convId = activeConversationId
      if (!convId) {
        const { data: conv } = await conversationsAPI.create(`Chat: ${file.name}`)
        convId = conv.id
        addConversation(conv)
        setActiveConversation(convId)
      }

      const isImage = IMAGE_TYPES.includes(file.type)

      if (isImage) {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const base64 = ev.target.result
          await documentsAPI.upload(file, convId).catch(() => {})
          setPendingAttachment({ type: 'image', filename: file.name, base64, convId })
          setUploadingFile(null)
          textareaRef.current?.focus()
        }
        reader.readAsDataURL(file)
      } else {
        const { data } = await documentsAPI.upload(file, convId)
        setPendingAttachment({ type: 'doc', filename: file.name, docData: data, convId })
        setUploadingFile(null)
        textareaRef.current?.focus()
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
      setUploadingFile(null)
    }
  }

  const canSend = (text.trim() || pendingAttachment) && !isStreaming

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4">
      <div className="max-w-4xl mx-auto">

        {/* Prompt templates */}
        {showTemplates && (
          <div className="mb-3 flex flex-wrap gap-2">
            {PROMPT_TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => applyTemplate(t.prefix)}
                className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-300 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full transition-colors">
                {t.label}
              </button>
            ))}
            <button onClick={() => setShowTemplates(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Pending attachment preview */}
        {pendingAttachment && (
          <div className="mb-2 flex items-center gap-2">
            {pendingAttachment.type === 'image' ? (
              <div className="relative inline-block">
                <img src={pendingAttachment.base64} alt={pendingAttachment.filename}
                  className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                <button onClick={() => setPendingAttachment(null)}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                <FileText size={16} className="text-brand-500 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{pendingAttachment.filename}</span>
                <button onClick={() => setPendingAttachment(null)} className="text-gray-400 hover:text-red-500 transition-colors ml-1">
                  <X size={12} />
                </button>
              </div>
            )}
            <span className="text-xs text-gray-400">Ready — type a question or press Send</span>
          </div>
        )}

        {/* Upload progress */}
        {uploadingFile && (
          <div className="mb-2 flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
            <Loader2 size={14} className="animate-spin" /> Uploading {uploadingFile}…
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-all">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 mb-0.5"
            title="Prompt templates">
            <ChevronDown size={18} className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingAttachment ? 'Ask about this file… (or just press Send)' : 'Ask anything… (Shift+Enter for new line)'}
            rows={1}
            style={{ resize: 'none', maxHeight: '160px', overflowY: 'auto' }}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 leading-relaxed"
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
          />

          <div className="flex items-center gap-1 shrink-0">
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.txt,.md,.csv,.json,.html,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.mkv,.webm"
              onChange={handleFileSelect} />

            <button
              onClick={() => fileRef.current?.click()}
              disabled={isStreaming || !!uploadingFile || !!pendingAttachment}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
              title="Upload file or image">
              {uploadingFile ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
            </button>

            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isStreaming}
              className={`p-1.5 transition-colors disabled:opacity-40 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              title={isListening ? 'Stop' : 'Voice input'}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={handleSend}
              disabled={!canSend}
              className="p-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
