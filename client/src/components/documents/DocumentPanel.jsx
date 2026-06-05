import { useEffect } from 'react'
import {
  FileText,
  FileImage,
  FileVideo,
  Trash2,
  X,
  Upload,
} from 'lucide-react'
import { documentsAPI } from '../../utils/api'
import useStore from '../../store/useStore'
import toast from 'react-hot-toast'

function fileIcon(type) {
  if (type === 'video') return <FileVideo size={16} className="text-purple-500" />
  if (type === 'image') return <FileImage size={16} className="text-green-500" />
  return <FileText size={16} className="text-brand-500" />
}

export default function DocumentPanel({ onClose }) {
  const activeConversationId = useStore((s) => s.activeConversationId)
  const documents = useStore((s) => s.documents)
  const setDocuments = useStore((s) => s.setDocuments)
  const removeDocument = useStore((s) => s.removeDocument)

  // Load documents from API when conversation is active
  useEffect(() => {
    if (activeConversationId) {
      documentsAPI.list(activeConversationId).then(({ data }) => {
        setDocuments(data)
      }).catch(() => {})
    }
  }, [activeConversationId, setDocuments])

  const handleDelete = async (id, name) => {
    try {
      await documentsAPI.delete(id)
      removeDocument(id)
      toast.success(`Deleted ${name}`)
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="w-72 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Upload size={14} /> Documents ({documents.length})
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No documents yet.<br />
              Use the 📎 button in the chat input to upload a PDF, image, or video.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 group"
              >
                <div className="shrink-0 mt-0.5">{fileIcon(doc.file_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" title={doc.original_filename || doc.filename}>
                    {doc.original_filename || doc.filename}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {doc.size_mb} MB · {doc.file_type}
                    {doc.chunks > 0 && ` · ${doc.chunks} chunks`}
                  </p>
                  {doc.indexed && (
                    <span className="inline-block mt-1 text-[10px] bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                      ✓ RAG indexed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.original_filename || doc.filename)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
          Supported: PDF, TXT, MD, CSV, JSON, images, videos (Pro)
        </p>
      </div>
    </div>
  )
}
