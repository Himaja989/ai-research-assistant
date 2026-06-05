import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Brain,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Crown,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useConversations } from '../../hooks/useConversations'
import useStore from '../../store/useStore'
import { useNavigate } from 'react-router-dom'

function ConversationItem({ conv, isActive, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(conv.title)
  const [showActions, setShowActions] = useState(false)

  const save = () => {
    if (title.trim()) onRename(conv.id, title.trim())
    setEditing(false)
  }

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
      }`}
      onClick={() => !editing && onSelect(conv.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); if (!editing) {} }}
    >
      <MessageSquare size={14} className="shrink-0 opacity-70" />

      {editing ? (
        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 text-xs bg-white dark:bg-gray-700 border border-brand-400 rounded px-1.5 py-0.5 outline-none"
          />
          <button onClick={save} className="text-green-500 hover:text-green-600"><Check size={12} /></button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{conv.title}</p>
            {conv.updated_at && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
              </p>
            )}
          </div>
          {(showActions || isActive) && (
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <Edit2 size={11} />
              </button>
              <button
                onClick={() => onDelete(conv.id)}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Sidebar({ onNewChat }) {
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const user = useStore((s) => s.user)
  const navigate = useNavigate()

  const {
    conversations,
    activeConversationId,
    loadConversations,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,
  } = useConversations()

  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQ.toLowerCase())
  )

  const handleSelect = (id) => {
    selectConversation(id)
    onNewChat?.(id)
  }

  const handleNewChat = async () => {
    onNewChat?.(null)
  }

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center py-4 px-2 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 w-12">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={handleNewChat}
          className="mt-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title="New chat"
        >
          <Plus size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-brand-600" />
          <span className="font-semibold text-sm brand-gradient">Research AI</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 pt-3">
        <button
          onClick={handleNewChat}
          className="btn-primary w-full justify-center text-sm py-2"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8 px-4">
            {searchQ ? 'No conversations found' : 'Start a new chat to get going'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
                onRename={renameConversation}
                onDelete={deleteConversation}
              />
            ))}
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
        <button
          onClick={() => navigate('/subscription')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Crown size={14} className="text-yellow-500" />
          <span className="flex-1 text-left">
            {user?.name || 'User'} ·{' '}
            <span className="capitalize font-medium text-brand-600 dark:text-brand-400">
              {user?.subscription || 'free'}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
