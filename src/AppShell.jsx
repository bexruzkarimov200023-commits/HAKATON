import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import AdminPanel from './AdminPanel.jsx'
import AuthPanel from './AuthPanel.jsx'
import Dashboard from './Dashboard.jsx'
import { ApiError, apiFetch } from './api.js'

function AppShell() {
  const [user, setUser] = useState(null)
  const [finance, setFinance] = useState(null)
  const [view, setView] = useState('dashboard')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      try {
        const { user: sessionUser } = await apiFetch('/api/auth/me')
        if (!active) return
        setUser(sessionUser)
        setView(sessionUser.role === 'admin' ? 'admin' : 'dashboard')
        const { finance: savedFinance } = await apiFetch('/api/finance')
        if (active) setFinance(savedFinance)
      } catch (requestError) {
        if (active && !(requestError instanceof ApiError && requestError.status === 401)) setError(requestError.message)
      } finally {
        if (active) setReady(true)
      }
    }
    restoreSession()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return undefined
    const interval = window.setInterval(async () => {
      try {
        await apiFetch('/api/auth/me')
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          setUser(null)
          setFinance(null)
          setError('Sessiya yakunlandi. Qayta kiring.')
        }
      }
    }, 15000)
    return () => window.clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!ready || !user || !finance) return undefined
    let active = true
    const timer = window.setTimeout(async () => {
      try {
        await apiFetch('/api/finance', { method: 'PUT', body: JSON.stringify(finance) })
      } catch (requestError) {
        if (active && requestError instanceof ApiError && requestError.status === 401) {
          setUser(null)
          setFinance(null)
          setError('Hisobingiz sessiyasi bekor qilindi.')
        }
      }
    }, 350)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [finance, ready, user])

  const authenticate = async (mode, values) => {
    const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const result = await apiFetch(path, { method: 'POST', body: JSON.stringify(values) })
    setUser(result.user)
    setView(result.user.role === 'admin' ? 'admin' : 'dashboard')
    const savedFinance = result.finance || (await apiFetch('/api/finance')).finance
    setFinance(savedFinance)
    setError('')
  }
  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setFinance(null)
      setView('dashboard')
    }
  }

  if (!ready) return <main className="auth-loading"><LoaderCircle size={24} className="loading-spinner" /><span>MoneyMaster yuklanmoqda</span></main>
  if (!user) return <AuthPanel onAuthenticate={authenticate} error={error} />
  if (!finance) return <main className="auth-loading"><LoaderCircle size={24} className="loading-spinner" /><span>Hisob ma’lumotlari yuklanmoqda</span></main>
  if (user.role === 'admin' && view === 'admin') {
    return <AdminPanel user={user} onLogout={logout} onOpenFinance={() => setView('dashboard')} />
  }
  return <Dashboard user={user} data={finance} setData={setFinance} onLogout={logout} onOpenAdmin={user.role === 'admin' ? () => setView('admin') : undefined} />
}

export default AppShell
