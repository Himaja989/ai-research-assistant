import { useCallback } from 'react'
import { streamChat, chatsAPI, documentsAPI } from '../utils/api'
import useStore from '../store/useStore'
import toast from 'react-hot-toast'

const PDF_KEYWORDS = /\b(pdf|send.*resume|send.*document|send.*report|generate.*pdf|create.*pdf|make.*pdf|export.*pdf|download.*pdf|resume.*pdf|pdf.*resume)\b/i

// Matches: "generate a nature picture", "draw a portrait", "create an image of..."
// Also matches: "show me a photo of", "paint a landscape", "make a picture of a cat"
const IMAGE_KEYWORDS = /\b(generate|create|draw|make|paint|show|design|render|produce)\b.{0,60}\b(image|picture|photo|illustration|artwork|painting|scene|landscape|portrait|wallpaper|sketch|drawing)\b|\b(image|picture|photo|illustration|artwork)\b.{0,20}\b(of|with|showing|depicting)\b/i

export function useChat() {
  const {
    messages,
    activeConversationId,
    isStreaming,
    setMessages,
    addMessage,
    updateLastAssistantMessage,
    setStreaming,
    setActiveConversation,
  } = useStore()

  const loadMessages = useCallback(
    async (conversationId) => {
      try {
        const { data } = await chatsAPI.getByConversation(conversationId)
        if (data.length > 0) {
          const msgs = []
          data.forEach((chat) => {
            msgs.push({ id: chat.id + '_q', role: 'user', content: chat.question, created_at: chat.created_at })
            msgs.push({ id: chat.id + '_a', role: 'assistant', content: chat.answer, created_at: chat.created_at })
          })
          setMessages(msgs)
        }
      } catch {
        toast.error('Failed to load messages')
      }
    },
    [setMessages]
  )

  // Image generation — calls backend which uses OpenAI DALL-E
  const generateImage = useCallback(async (prompt) => {
    addMessage({ id: Date.now() + '_u', role: 'user', content: prompt, created_at: new Date().toISOString() })

    const loadingId = Date.now() + '_img_loading'
    addMessage({ id: loadingId, type: 'image_generating', created_at: new Date().toISOString() })
    setStreaming(true)

    try {
      const token = localStorage.getItem('token')
      const resp = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.detail || 'Generation failed')
      }
      const data = await resp.json()

      // gpt-image-1 returns base64
      const imageUrl = `data:image/png;base64,${data.image}`

      useStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === loadingId
            ? { ...m, type: 'generated_image', imageUrl, prompt }
            : m
        ),
      }))
    } catch (err) {
      useStore.setState((s) => ({ messages: s.messages.filter((m) => m.id !== loadingId) }))
      toast.error(err.message || 'Image generation failed.')
    } finally {
      setStreaming(false)
    }
  }, [addMessage, setStreaming])

  const sendMessage = useCallback(
    async (question) => {
      if (!question.trim() || isStreaming) return

      // Route image requests straight to image generation
      if (IMAGE_KEYWORDS.test(question)) {
        return generateImage(question)
      }

      const userMsg = {
        id: Date.now() + '_u',
        role: 'user',
        content: question,
        created_at: new Date().toISOString(),
      }
      const assistantMsg = {
        id: Date.now() + '_a',
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        streaming: true,
      }

      addMessage(userMsg)
      addMessage(assistantMsg)
      setStreaming(true)

      let accumulated = ''

      await streamChat({
        question,
        conversationId: activeConversationId,
        onChunk: (chunk) => {
          accumulated += chunk
          updateLastAssistantMessage(accumulated)
        },
        onDone: async (data) => {
          setStreaming(false)
          let finalContent = ''
          useStore.setState((s) => {
            const msgs = [...s.messages]
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === 'assistant') {
                msgs[i] = { ...msgs[i], streaming: false }
                finalContent = msgs[i].content
                break
              }
            }
            return { messages: msgs }
          })

          // Auto-create conversation in sidebar if new
          if (!activeConversationId && data.conversation_id) {
            setActiveConversation(data.conversation_id)
            import('../utils/api').then(({ conversationsAPI }) => {
              conversationsAPI.list().then(({ data: convs }) => {
                useStore.getState().setConversations(convs)
              })
            })
            // Load persisted messages for the new conversation
            loadMessages(data.conversation_id)
          }

          // Auto-generate downloadable PDF if user asked for one
          if (PDF_KEYWORDS.test(question)) {
            try {
              const q = question.toLowerCase()
              const guessedName = (q.includes('resume') || q.includes('cv')) ? 'resume'
                : q.includes('report') ? 'report'
                : 'document'
              const contentToConvert = accumulated || finalContent
              toast.loading('Generating PDF…', { id: 'pdf-gen' })
              const { data: pdfData } = await documentsAPI.generatePDF(contentToConvert, guessedName)
              toast.dismiss('pdf-gen')
              addMessage({
                id: Date.now() + '_pdf',
                type: 'pdf_download',
                url: pdfData.url,
                filename: pdfData.filename,
                created_at: new Date().toISOString(),
              })
            } catch (err) {
              toast.dismiss('pdf-gen')
              toast.error('Could not generate PDF: ' + (err?.response?.data?.detail || err?.message || 'Unknown error'))
            }
          }
        },
        onError: (msg) => {
          setStreaming(false)
          updateLastAssistantMessage(`❌ Error: ${msg}`)
          toast.error(msg)
        },
      })
    },
    [isStreaming, activeConversationId, addMessage, updateLastAssistantMessage, setStreaming, setActiveConversation, generateImage, loadMessages]
  )

  return { messages, isStreaming, loadMessages, sendMessage }
}
