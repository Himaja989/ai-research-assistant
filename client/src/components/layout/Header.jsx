import { useState } from 'react'
import { Sun, Moon, LogOut, Crown, PanelLeft, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import useStore from '../../store/useStore'

export default function Header() {
  const isDark = useStore((s) => s.isDark)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const user = useStore((s) => s.user)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <PanelLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
            AI Research Assistant
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/subscription')}
            className="btn-secondary text-xs py-1.5 px-3 text-yellow-600 dark:text-yellow-400 hidden sm:flex"
          >
            <Crown size={13} /> {user?.subscription === 'free' ? 'Upgrade' : 'My Plan'}
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Sign out?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => { logout(); setShowLogoutModal(false) }}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
