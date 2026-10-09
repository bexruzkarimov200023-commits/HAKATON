import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Ban, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { apiFetch } from './api.js'

function AdminPanel({ user, onLogout, onOpenFinance }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/admin/users')
      setUsers(result.users)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    let active = true
    apiFetch('/api/admin/users')
      .then((result) => { if (active) setUsers(result.users) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const setSuspended = async (account) => {
    const nextValue = !account.suspended
    if (nextValue && !window.confirm(`${account.name} hisobini vaqtincha to‘xtatib, faol sessiyalarini bekor qilamizmi?`)) return
    setBusyId(account.id)
    setError('')
    try {
      const result = await apiFetch(`/api/admin/users/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended: nextValue }),
      })
      setUsers((current) => current.map((item) => item.id === account.id ? result.user : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar"><a className="auth-brand" href="#admin"><span><ShieldCheck size={22} /></span> money<span>master</span></a><div className="admin-session"><span className="admin-status"><i /> ADMIN</span><span>{user.email}</span><button type="button" onClick={onOpenFinance}><Users size={16} /> Moliya sahifasi</button><button type="button" onClick={onLogout}><LogOut size={16} /> Chiqish</button></div></header>
      <div className="admin-content" id="admin">
        <div className="admin-title-row"><div><span className="auth-eyebrow"><i /> BOSHQARUV</span><h1>Foydalanuvchilar</h1><p>Hisob holatini boshqaring va kerak bo‘lsa sessiyani bekor qiling.</p></div><button className="admin-refresh" type="button" onClick={loadUsers} disabled={loading}><RefreshCw size={15} className={loading ? 'loading-spinner' : ''} /> Yangilash</button></div>
        <div className="admin-summary"><span className="admin-summary-icon"><Users size={19} /></span><div><strong>{users.length}</strong><span>jami hisob</span></div><span className="admin-summary-divider" /><span className="admin-summary-label">Faol: <b>{users.filter((account) => !account.suspended).length}</b></span><span className="admin-summary-label">To‘xtatilgan: <b>{users.filter((account) => account.suspended).length}</b></span></div>
        <section className="admin-table-panel"><div className="admin-table-head"><div><span className="section-kicker">RO‘YXAT</span><h2>Hisoblar</h2></div><span className="admin-count">{users.length} ta</span></div>{error && <p className="auth-error" role="alert">{error}</p>}{loading ? <div className="admin-empty">Ro‘yxat yuklanmoqda…</div> : users.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Foydalanuvchi</th><th>Ro‘yxatdan o‘tgan</th><th>Holat</th><th>Amal</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td><span className="admin-user"><i>{account.name.slice(0, 1).toUpperCase()}</i><span><strong>{account.name}</strong><small>{account.email}</small></span></span></td><td>{new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(account.createdAt))}</td><td><span className={`account-state ${account.suspended ? 'paused' : ''}`}><i />{account.suspended ? 'To‘xtatilgan' : 'Faol'}</span></td><td><button type="button" className={`account-action ${account.suspended ? 'restore' : ''}`} disabled={busyId === account.id} onClick={() => setSuspended(account)}>{account.suspended ? <><ArrowDownLeft size={14} /> Ruxsat berish</> : <><Ban size={14} /> Chiqarish</>}{busyId === account.id && <ArrowUpRight size={13} />}</button></td></tr>)}</tbody></table></div> : <div className="admin-empty"><Users size={20} /><span>Hozircha ro‘yxatdan o‘tgan foydalanuvchi yo‘q.</span></div>}</section>
        <p className="admin-footnote"><ShieldCheck size={14} /> Hisobni to‘xtatish foydalanuvchini darhol chiqaradi; moliyaviy ma’lumotlari o‘chirilmaydi.</p>
      </div>
    </main>
  )
}

export default AdminPanel
