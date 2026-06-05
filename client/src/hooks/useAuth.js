import { useCallback } from 'react'
import { authAPI } from '../utils/api'
import useStore from '../store/useStore'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  const { user, token, setAuth, logout } = useStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (email, password) => {
      try {
        const { data } = await authAPI.login({ email, password })
        setAuth(data.user, data.token)
        toast.success(`Welcome back, ${data.user.name}!`)
        navigate('/chat')
        return true
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Login failed')
        return false
      }
    },
    [setAuth, navigate]
  )

  const register = useCallback(
    async (name, email, password) => {
      try {
        await authAPI.register({ name, email, password })
        toast.success('Account created! Please sign in.')
        navigate('/auth')
        return true
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Registration failed')
        return false
      }
    },
    [navigate]
  )

  const handleLogout = useCallback(() => {
    logout()
    navigate('/')
    toast.success('Logged out')
  }, [logout, navigate])

  return { user, token, isAuthenticated: !!token, login, register, logout: handleLogout }
}
