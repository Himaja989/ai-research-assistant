import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Brain, User, Copy, Check, FileText, FileVideo, File, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { documentsAPI } from '../../utils/api'
import toast from 'react-hot-toast'

function GeneratingImage() {
  return (
    <div className="message-enter flex gap-3 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1">
        <Brain size={13} className="text-white" />
      </div>
      <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
        <Loader2 size={16} className="animate-spin text-brand-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Generating image…</span>
      </div>
    </div>
  )
}

function GeneratedImage({ message }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div className="message-enter flex gap-3 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1">
        <Brain size={13} className="text-white" />
      </div>
      <div className="max-w-lg w-full">
        {!loaded && !error && (
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-6 mb-2">
            <Loader2 size={18} className="animate-spin text-brand-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Generating image… (may take 10–20s)</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl px-4 py-3 text-sm text-red-500">
            Image generation failed. Try a different prompt.
          </div>
        )}
        <img
          src={message.imageUrl}
          alt={message.prompt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`rounded-2xl w-full object-cover shadow-md border border-gray-200 dark:border-gray-700 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0 h-0'}`}
        />
        {loaded && (
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex-1 truncate">{message.prompt}</p>
            <a href={message.imageUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
              <Download size={11} /> Save
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function FollowUpSuggestions({ content, onSuggestionClick }) {
  const match = content.match(/\*\*Follow-up questions:\*\*\n([\s\S]*?)$/)
  if (!match) return null
  const questions = match[1].split('\n').filter((l) => l.match(/^\d+\.\s/)).map((l) => l.replace(/^\d+\.\s/, '').trim()).filter(Boolean)
  if (!questions.length) return null
  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">Follow-up</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button key={i} onClick={() => onSuggestionClick?.(q)}
            className="text-xs bg-gray-100 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-700 dark:hover:text-brand-300 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full transition-colors text-left">
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function cleanContent(content) {
  return content.replace(/\n?---\n\*\*Follow-up questions:\*\*[\s\S]*$/, '').trim()
}

// Image uploaded by user — show thumbnail in chat
function ImageMessage({ message }) {
  return (
    <div className="message-enter flex gap-3 px-4 py-3 justify-end">
      <div className="max-w-[60%]">
        <img src={message.imageData} alt={message.filename}
          className="rounded-2xl rounded-tr-sm max-w-full max-h-72 object-contain border border-gray-200 dark:border-gray-700 shadow-sm" />
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-right">{message.filename}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
        <User size={13} className="text-gray-600 dark:text-gray-300" />
      </div>
    </div>
  )
}

// Document uploaded — show file card in chat
function FileMessage({ message }) {
  const icon = message.fileType === 'video' ? <FileVideo size={20} className="text-purple-500" />
    : message.fileType === 'image' ? null
    : <FileText size={20} className="text-brand-500" />

  return (
    <div className="message-enter flex gap-3 px-4 py-3 justify-end">
      <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{message.filename}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {message.fileType} {message.indexed ? `· ${message.chunks} chunks indexed ✓` : ''}
          </p>
        </div>
      </div>
      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
        <User size={13} className="text-gray-600 dark:text-gray-300" />
      </div>
    </div>
  )
}

function PDFDownloadCard({ message }) {
  return (
    <div className="message-enter flex gap-3 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1">
        <Brain size={13} className="text-white" />
      </div>
      <a
        href={message.url}
        download={message.filename}
        className="flex items-center gap-3 bg-white dark:bg-gray-900 border-2 border-brand-200 dark:border-brand-800 hover:border-brand-400 dark:hover:border-brand-600 rounded-2xl px-4 py-3 max-w-xs transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <FileText size={20} className="text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{message.filename}</p>
          <p className="text-xs text-brand-500 group-hover:text-brand-600 font-medium">Click to download PDF</p>
        </div>
        <Download size={16} className="text-brand-500 shrink-0" />
      </a>
    </div>
  )
}

export default function ChatMessage({ message, onSuggestionClick }) {
  const [copied, setCopied] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const isUser = message.role === 'user'
  const isStreaming = message.streaming

  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadPDF = () => {
    setGeneratingPDF(true)

    const loadJsPDF = () => new Promise((resolve) => {
      if (window.jspdf) return resolve(window.jspdf.jsPDF)
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      s.onload = () => resolve(window.jspdf.jsPDF)
      document.head.appendChild(s)
    })

    loadJsPDF().then((jsPDF) => {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' })
      const margin = 60
      const pageW = doc.internal.pageSize.getWidth()
      const maxW = pageW - margin * 2
      let y = margin

      // Strip follow-up section and markdown artifacts
      const clean = message.content
        .replace(/\n?---\n\*\*Follow-up questions:\*\*[\s\S]*$/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .trim()

      const lines = clean.split('\n')

      const addText = (text, size, bold, indent = 0) => {
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const wrapped = doc.splitTextToSize(text, maxW - indent)
        wrapped.forEach((line) => {
          if (y > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(line, margin + indent, y)
          y += size * 1.5
        })
      }

      lines.forEach((line) => {
        const s = line.trim()
        if (!s) { y += 6; return }
        if (s.startsWith('### ')) { addText(s.slice(4), 12, true); y += 2 }
        else if (s.startsWith('## ')) { y += 4; addText(s.slice(3), 14, true); y += 3 }
        else if (s.startsWith('# ')) {
          y += 8; addText(s.slice(2), 18, true); y += 4
          doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 6
        }
        else if (s.startsWith('---')) { doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 8 }
        else if (/^[-*]\s+/.test(s)) { addText('-  ' + s.replace(/^[-*]\s+/, ''), 10, false, 12) }
        else if (/^\d+\.\s+/.test(s)) { addText(s, 10, false, 12) }
        else { addText(s, 10, false) }
      })

      doc.save('document.pdf')
      toast.success('PDF downloaded!')
    }).catch(() => {
      toast.error('PDF generation failed')
    }).finally(() => {
      setGeneratingPDF(false)
    })
  }

  if (message.type === 'image') return <ImageMessage message={message} />
  if (message.type === 'upload') return <FileMessage message={message} />
  if (message.type === 'pdf_download') return <PDFDownloadCard message={message} />
  if (message.type === 'image_generating') return <GeneratingImage />
  if (message.type === 'generated_image') return <GeneratedImage message={message} />

  return (
    <div className={`message-enter flex gap-3 px-4 py-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1">
          <Brain size={13} className="text-white" />
        </div>
      )}

      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {isUser ? (
          <div className="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            {message.content}
          </div>
        ) : (
          <div className="group">
            <div className={`prose-chat text-sm ${isStreaming ? 'streaming-cursor' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {isStreaming ? (message.content || ' ') : cleanContent(message.content || ' ')}
              </ReactMarkdown>
            </div>
            {!isStreaming && message.content && (
              <>
                <FollowUpSuggestions content={message.content} onSuggestionClick={onSuggestionClick} />
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={downloadPDF} disabled={generatingPDF}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors disabled:opacity-50">
                    {generatingPDF ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    {generatingPDF ? 'Generating…' : 'Download PDF'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
          <User size={13} className="text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  )
}
