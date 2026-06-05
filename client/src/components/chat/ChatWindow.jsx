import { useEffect, useRef } from 'react'
import { Brain } from 'lucide-react'
import ChatMessage from './ChatMessage'

const emptyPrompts = [
  'What is quantum computing and how does it work?',
  'Summarize the key points from my uploaded document',
  'Compare machine learning vs deep learning',
  'Explain the concept of RAG in AI systems',
  'What are the latest trends in large language models?',
  'Help me understand the main themes in this paper',
]

export default function ChatWindow({ messages, isStreaming, onSuggestionClick, onPromptClick }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Brain size={32} className="text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
          Ask anything. Research everything.
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8">
          Upload documents, ask questions, and get structured AI answers with citations and follow-up suggestions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
          {emptyPrompts.map((p) => (
            <button
              key={p}
              onClick={() => onPromptClick?.(p)}
              className="text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto py-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onSuggestionClick={onSuggestionClick}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
