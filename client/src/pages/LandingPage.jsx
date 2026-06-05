import { Link } from 'react-router-dom'
import { Brain, Search, FileText, Zap, Shield, Star, ArrowRight, MessageSquare, BookOpen, Video } from 'lucide-react'
import useStore from '../store/useStore'

const features = [
  { icon: MessageSquare, title: 'Real-time Streaming', desc: 'Watch answers appear word by word, just like ChatGPT. No waiting.' },
  { icon: FileText, title: 'Document Intelligence', desc: 'Upload PDFs, text files, and CSVs. Get answers grounded in your documents.' },
  { icon: Search, title: 'Citation Cards', desc: 'Every answer includes source references so you can verify and trust the results.' },
  { icon: Brain, title: 'RAG Pipeline', desc: 'Vector search (FAISS) finds the most relevant parts of your documents instantly.' },
  { icon: BookOpen, title: 'Conversation Memory', desc: 'Full history across sessions. Search past conversations, rename, or delete them.' },
  { icon: Video, title: 'Video Upload', desc: 'Upload videos (up to 100MB on Pro). Store and manage media alongside your research.' },
  { icon: Zap, title: 'Voice Input', desc: 'Speak your questions. Powered by the Web Speech API, no extra setup needed.' },
  { icon: Shield, title: 'Subscription Plans', desc: 'Free tier to get started. Pro and Enterprise for heavy users and teams.' },
]

export default function LandingPage() {
  const isDark = useStore((s) => s.isDark)
  const toggleTheme = useStore((s) => s.toggleTheme)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Brain className="text-brand-600" size={28} />
          <span className="brand-gradient">Research AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="btn-secondary px-3 py-2 text-sm">
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link to="/auth" className="btn-secondary text-sm">Sign In</Link>
          <Link to="/auth?mode=register" className="btn-primary text-sm">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Zap size={14} />
          Perplexity-style AI for your documents
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Research smarter,<br />
          <span className="brand-gradient">not harder.</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Ask questions, upload documents, and get structured AI answers with citations,
          summaries, and follow-up suggestions — all in real time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth?mode=register" className="btn-primary text-base px-8 py-3">
            Start for Free <ArrowRight size={18} />
          </Link>
          <Link to="/auth" className="btn-secondary text-base px-8 py-3">
            Sign In
          </Link>
        </div>

        {/* Demo preview */}
        <div className="mt-16 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl text-left">
          <div className="bg-gray-100 dark:bg-gray-900 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">AI Research Assistant</span>
          </div>
          <div className="bg-white dark:bg-gray-950 p-6 space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">U</div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm max-w-md">
                What are the key findings in my uploaded research paper?
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                <Brain size={14} className="text-white" />
              </div>
              <div className="flex-1 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100">## Answer</p>
                <p>Based on your uploaded document, the key findings include...</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-1 rounded-full">
                    📄 Source: Page 3
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                    ✓ Cited
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need for deep research</h2>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-12">
          Built with FastAPI, React, FAISS, and OpenAI GPT-4o
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-lg flex items-center justify-center mb-4">
                <Icon size={20} className="text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-20 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to research smarter?</h2>
        <p className="text-brand-200 mb-8">Free to start. No credit card required.</p>
        <Link to="/auth?mode=register" className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-3 rounded-lg font-semibold hover:bg-brand-50 transition-colors">
          Get Started Free <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        © 2024 AI Research Assistant · Built with FastAPI + React + GPT-4o
      </footer>
    </div>
  )
}
