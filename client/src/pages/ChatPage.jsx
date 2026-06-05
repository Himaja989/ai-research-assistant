import { useState, useCallback, useEffect } from 'react'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import ChatWindow from '../components/chat/ChatWindow'
import ChatInput from '../components/chat/ChatInput'
import useStore from '../store/useStore'
import { useChat } from '../hooks/useChat'

export default function ChatPage() {
  const { messages, isStreaming, loadMessages, sendMessage } = useChat()
  const activeConversationId = useStore((s) => s.activeConversationId)
  const setActiveConversation = useStore((s) => s.setActiveConversation)
  const setDocuments = useStore((s) => s.setDocuments)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (!activeConversationId) {
      setDocuments([])
    }
  }, [activeConversationId, setDocuments])

  const handleNewChat = useCallback(
    (convId) => {
      setActiveConversation(convId)
      setDocuments([])
      if (convId) {
        loadMessages(convId)
      }
    },
    [setActiveConversation, setDocuments, loadMessages]
  )

  const handleSuggestionClick = useCallback((suggestion) => {
    setInputValue(suggestion)
  }, [])

  const handleExternalValueUsed = useCallback(() => {
    setInputValue('')
  }, [])

  return (
    <div className="h-screen flex bg-white dark:bg-gray-950 overflow-hidden">
      <Sidebar onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <ChatWindow
          messages={messages}
          isStreaming={isStreaming}
          onSuggestionClick={handleSuggestionClick}
          onPromptClick={handleSuggestionClick}
        />

        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          externalValue={inputValue}
          onExternalValueUsed={handleExternalValueUsed}
        />
      </div>
    </div>
  )
}
