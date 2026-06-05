import { useCallback } from 'react'
import { conversationsAPI } from '../utils/api'
import useStore from '../store/useStore'
import toast from 'react-hot-toast'

export function useConversations() {
  const {
    conversations,
    activeConversationId,
    setConversations,
    addConversation,
    updateConversation,
    removeConversation,
    setActiveConversation,
    setMessages,
    setDocuments,
  } = useStore()

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await conversationsAPI.list()
      setConversations(data)
    } catch {}
  }, [setConversations])

  const selectConversation = useCallback(
    async (id) => {
      setActiveConversation(id)
    },
    [setActiveConversation]
  )

  const createConversation = useCallback(
    async (title = 'New Conversation') => {
      try {
        const { data } = await conversationsAPI.create(title)
        addConversation(data)
        setActiveConversation(data.id)
        setMessages([])
        return data
      } catch (err) {
        toast.error('Failed to create conversation')
      }
    },
    [addConversation, setActiveConversation, setMessages]
  )

  const renameConversation = useCallback(
    async (id, title) => {
      try {
        await conversationsAPI.rename(id, title)
        updateConversation(id, { title })
      } catch {
        toast.error('Failed to rename')
      }
    },
    [updateConversation]
  )

  const deleteConversation = useCallback(
    async (id) => {
      try {
        await conversationsAPI.delete(id)
        removeConversation(id)
        toast.success('Conversation deleted')
      } catch {
        toast.error('Failed to delete')
      }
    },
    [removeConversation]
  )

  return {
    conversations,
    activeConversationId,
    loadConversations,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,
  }
}
