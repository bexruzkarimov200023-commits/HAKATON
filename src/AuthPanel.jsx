import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Wallet } from 'lucide-react'
import './Auth.css'

function AuthPanel({ onAuthenticate, error: sessionError }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const isRegister = mode === 'register'

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onAuthenticate(mode, { ...form, email: form.email.trim().toLowerCase() })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-aside">
        <a className="auth-brand" href="#login"><span><Wallet size={23} /></span> money<span>master</span></a>
        <div className="auth-story"><span className="auth-eyebrow"><i /> PULINGIZNI BOSHQARISH VAQTI</span><h1>Rejalaringizga<br />aniq yo‘l oching.</h1><p>Har bir xarajatni anglang. Har bir maqsadga yaqinlashing.</p><div className="auth-stat"><div><strong>50 / 30 / 20</strong><span>oddiy budjet qoidasi</span></div><div className="stat-dots"><i /><i /><i /></div></div></div>
        <div className="auth-aside-footer"><ShieldCheck size={15} /> Hisobingiz himoyalangan sessiya orqali saqlanadi</div>
        <div className="auth-pattern" />
      </div>
      <section className="auth-main" id="login">
        <div className="auth-form-wrap">
          <span className="auth-form-kicker"><KeyRound size={14} /> SHAXSIY HISOB</span>
          <h2>{isRegister ? 'Hisob yarating' : 'Hisobingizga kiring'}</h2>
          <p className="auth-subtitle">{isRegister ? 'Moliyaviy ma’lumotlaringiz shu hisobda saqlanadi.' : 'Davom etish uchun email va parolingizni kiriting.'}</p>
          <div className="auth-switch" role="tablist" aria-label="Kirish yoki ro‘yxatdan o‘tish"><button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Kirish</button><button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>Ro‘yxatdan o‘tish</button></div>
          <form className="auth-form" onSubmit={submit}>
            {isRegister && <label>Ismingiz<input autoComplete="name" required minLength="2" maxLength="80" placeholder="Ism va familiya" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
            <label>Email manzil<input autoComplete="email" required type="email" placeholder="siz@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Parol<div className="password-field"><input autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 6 : undefined} type={showPassword ? 'text' : 'password'} placeholder={isRegister ? 'Kamida 6 ta belgi' : 'Parolingiz'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            {(error || sessionError) && <p className="auth-error" role="alert">{error || sessionError}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Tekshirilmoqda…' : isRegister ? 'Hisob yaratish' : 'Kirish'} <ArrowRight size={16} /></button>
          </form>
          <p className="auth-privacy">Parolingiz serverda ochiq ko‘rinishda saqlanmaydi.</p>
        </div>
        <span className="auth-copyright">© 2026 MoneyMaster UZ</span>
      </section>
    </main>
  )
}

export default AuthPanel
