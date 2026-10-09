import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, BadgeCheck, Banknote, Bell,
  CalendarDays, CarFront, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Coffee, CreditCard, Gamepad2, Home, Lightbulb, Menu,
  LogOut, MoreHorizontal, Plus, ReceiptText, Settings2, ShieldCheck, ShoppingBag, Sparkles,
  Target, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

const appStartedAt = new Date()
const monthNames = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const formatNumber = new Intl.NumberFormat('uz-UZ')
const money = (value) => `${formatNumber.format(Math.round(value || 0))} so'm`
const compact = (value) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} mln` : value >= 1_000 ? `${Math.round(value / 1_000)} ming` : `${Math.round(value)}`

const categories = [
  { name: 'Oziq-ovqat', color: '#f2c431', icon: Coffee },
  { name: 'Transport', color: '#292820', icon: CarFront },
  { name: "O'yin-kulgi", color: '#c79d18', icon: Gamepad2 },
  { name: 'Xaridlar', color: '#77746a', icon: ShoppingBag },
  { name: 'Uy va aloqa', color: '#d9d3bf', icon: Home },
  { name: 'Boshqa', color: '#ad741e', icon: MoreHorizontal },
]
const navItems = [
  { label: 'Umumiy', href: '#overview', icon: Home },
  { label: 'Xarajatlar', href: '#spending', icon: ReceiptText },
  { label: 'Maqsadlar', href: '#savings', icon: Target },
  { label: '30 kunlik challenge', href: '#challenge', icon: BadgeCheck },
]
const tips = [
  { title: '50 / 30 / 20 qoidasini sinab ko‘ring', text: 'Daromadning 50 foizini ehtiyojlarga, 30 foizini istaklarga va 20 foizini jamg‘armaga ajrating.' },
  { title: 'Xarid oldidan 24 soat kuting', text: 'Shoshilinch bo‘lmagan xaridni bir kunga kechiktiring. Ko‘pincha bu pulni tejashga yordam beradi.' },
  { title: 'Avval o‘zingizga to‘lang', text: 'Oylik tushishi bilan jamg‘arma uchun belgilangan summani alohida olib qo‘ying.' },
]

const categoryIcon = (category) => categories.find((item) => item.name === category)?.icon || Banknote

function Dashboard({ user, data, setData, onLogout, onOpenAdmin }) {
  const [modal, setModal] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [contribution, setContribution] = useState('')
  const [activeNav, setActiveNav] = useState('Umumiy')
  const [monthOffset, setMonthOffset] = useState(0)
  const [activeTip, setActiveTip] = useState(0)
  const [activeRange, setActiveRange] = useState('Hafta')
  const [credit, setCredit] = useState({ amount: 5_000_000, rate: 24, months: 12 })
  const [form, setForm] = useState({ type: 'expense', title: '', amount: '', category: 'Oziq-ovqat', date: appStartedAt.toISOString().slice(0, 10) })

  useEffect(() => {
    const targets = document.querySelectorAll('[data-scroll-reveal], [data-reveal]')
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'))
      return undefined
    }
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        entry.target.classList.add('is-visible')
        activeObserver.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const sections = navItems.map((item) => ({ ...item, element: document.querySelector(item.href) })).filter((item) => item.element)
    if (!('IntersectionObserver' in window)) return undefined
    const visibility = new Map()
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0))
      const current = sections
        .filter((item) => visibility.get(item.element) > 0)
        .sort((first, second) => {
          if (first.element.contains(second.element)) return 1
          if (second.element.contains(first.element)) return -1
          return Math.abs(first.element.getBoundingClientRect().top - window.innerHeight * 0.25) - Math.abs(second.element.getBoundingClientRect().top - window.innerHeight * 0.25)
        })[0]
      if (current) setActiveNav(current.label)
    }, { threshold: [0, 0.15, 0.3, 0.5], rootMargin: '-15% 0px -65% 0px' })
    sections.forEach((item) => observer.observe(item.element))
    return () => observer.disconnect()
  }, [])
  const shownMonth = useMemo(() => {
    return new Date(appStartedAt.getFullYear(), appStartedAt.getMonth() + monthOffset, 1)
  }, [monthOffset])
  const monthTransactions = useMemo(() => data.transactions.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    return date.getMonth() === shownMonth.getMonth() && date.getFullYear() === shownMonth.getFullYear()
  }), [data.transactions, shownMonth])
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0)
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0)
  const balance = income - expenses
  const goal = data.goal
  const goalRemaining = Math.max(0, Number(goal.target) - Number(goal.saved))
  const goalProgress = goal.target ? Math.min(100, (Number(goal.saved) / Number(goal.target)) * 100) : 0
  const monthsToGoal = goal.monthly > 0 ? Math.ceil(goalRemaining / goal.monthly) : 0
  const monthlyPayment = useMemo(() => {
    const principal = Math.max(0, Number(credit.amount))
    const rate = Math.max(0, Number(credit.rate)) / 1200
    const count = Math.max(1, Number(credit.months))
    return rate ? principal * (rate * (1 + rate) ** count) / ((1 + rate) ** count - 1) : principal / count
  }, [credit])
  const expenseByCategory = categories.map((category) => ({
    ...category,
    value: monthTransactions.filter((item) => item.type === 'expense' && item.category === category.name).reduce((sum, item) => sum + Number(item.amount), 0),
  })).filter((item) => item.value > 0).sort((first, second) => second.value - first.value)
  const daysInMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 0).getDate()
  const chartData = Array.from({ length: activeRange === 'Hafta' ? 7 : 4 }, (_, index) => {
    const start = activeRange === 'Hafta' ? Math.max(1, appStartedAt.getDate() - 6 + index) : index * 7 + 1
    const end = activeRange === 'Hafta' ? start : Math.min((index + 1) * 7, daysInMonth)
    const total = monthTransactions.filter((item) => {
      const day = Number(item.date.slice(-2))
      return item.type === 'expense' && day >= start && day <= end
    }).reduce((sum, item) => sum + Number(item.amount), 0)
    return { name: activeRange === 'Hafta' ? `${start}` : `${start}–${end}`, xarajat: total }
  })
  const recentTransactions = [...monthTransactions].sort((first, second) => second.date.localeCompare(first.date)).slice(0, 5)
  const monthLabel = `${monthNames[shownMonth.getMonth()]} ${shownMonth.getFullYear()}`
  const todayKey = appStartedAt.toISOString().slice(0, 10)
  const challengeComplete = data.challengeDays.includes(todayKey)

  const addTransaction = (event) => {
    event.preventDefault()
    const amount = Number(form.amount)
    if (!form.title.trim() || !amount || amount < 0) return
    setData((current) => ({ ...current, transactions: [{ ...form, id: crypto.randomUUID(), title: form.title.trim(), amount }, ...current.transactions] }))
    setForm((current) => ({ ...current, title: '', amount: '' }))
    setModal(false)
  }
  const updateGoal = (key, value) => {
    setData((current) => ({ ...current, goal: { ...current.goal, [key]: value } }))
  }
  const addContribution = (event) => {
    event.preventDefault()
    const amount = Number(contribution)
    if (!amount || amount < 1) return
    updateGoal('saved', Number(goal.saved) + amount)
    setContribution('')
  }
  const toggleChallenge = () => setData((current) => ({ ...current, challengeDays: challengeComplete ? current.challengeDays.filter((day) => day !== todayKey) : [...current.challengeDays, todayKey] }))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveNav('Umumiy')}><span className="brand-mark"><Wallet size={22} strokeWidth={2.3} /></span><span>money<span className="brand-accent">master</span><small>UZBEKISTAN</small></span></a>
        <div className="nav-caption">MENYU</div>
        <nav className="side-nav" aria-label="Asosiy navigatsiya">{navItems.map(({ label, href, icon: Icon }) => <a key={label} href={href} aria-current={activeNav === label ? 'location' : undefined} className={`nav-link ${activeNav === label ? 'active' : ''}`} onClick={() => setActiveNav(label)}><Icon size={18} strokeWidth={1.9} /><span>{label}</span>{label === '30 kunlik challenge' && <span className="nav-dot" />}</a>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-promo"><span className="promo-icon"><Sparkles size={18} /></span><p>Har bir kichik qadam katta maqsadga olib boradi.</p><a href="#savings" onClick={() => setActiveNav('Maqsadlar')}>Maqsadlaringiz <ArrowRight size={14} /></a><div className="promo-orbit orbit-one" /><div className="promo-orbit orbit-two" /></div><button className="profile-button" type="button" onClick={onLogout} title="Hisobdan chiqish"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span className="profile-name">{user.name}<small>{user.email}</small></span><LogOut size={16} /></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu icon-button" aria-label={mobileNavOpen ? 'Menyuni yopish' : 'Menyuni ochish'} aria-expanded={mobileNavOpen} aria-controls="mobile-navigation" type="button" onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumb">Shaxsiy moliya <span>/</span> <strong>{activeNav}</strong></div><div className="topbar-actions"><div className="month-picker"><button type="button" aria-label="Oldingi oy" onClick={() => setMonthOffset((value) => value - 1)}><ChevronLeft size={16} /></button><CalendarDays size={16} /><span>{monthLabel}</span><button type="button" aria-label="Keyingi oy" onClick={() => setMonthOffset((value) => value + 1)}><ChevronRight size={16} /></button></div>{onOpenAdmin && <button className="icon-button" type="button" onClick={onOpenAdmin} title="Boshqaruv paneli" aria-label="Boshqaruv paneli"><ShieldCheck size={18} /></button>}<button className="icon-button notification-button" type="button" aria-label="Bildirishnomalar"><Bell size={18} /><i /></button><button className="add-button" type="button" onClick={() => setModal(true)}><Plus size={17} /><span>Yangi yozuv</span></button></div></header>
        {mobileNavOpen && <div className="mobile-nav-backdrop" role="presentation" onClick={() => setMobileNavOpen(false)}><nav className="mobile-nav" id="mobile-navigation" aria-label="Asosiy navigatsiya" onClick={(event) => event.stopPropagation()}>{navItems.map(({ label, href, icon: Icon }) => <a key={label} href={href} className={`nav-link ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); setMobileNavOpen(false) }}><Icon size={18} /><span>{label}</span>{label === '30 kunlik challenge' && <span className="nav-dot" />}</a>)}</nav></div>}
        <div className="page-body">
          <section className="welcome-row scroll-target" id="overview"><div><div className="eyebrow"><span className="eyebrow-line" /> MOLIYAVIY HOLATINGIZ</div><h1>Salom, {user.name.split(' ')[0]} <span className="wave">✦</span></h1><p>Bugun pulingiz qayerga ketayotganini ko‘rib chiqing.</p></div><button className="period-select" type="button" onClick={() => setMonthOffset((value) => value === 0 ? -1 : 0)}><CalendarDays size={16} /> {monthOffset === 0 ? 'Shu oy' : monthLabel} <ChevronDown size={15} /></button></section>

          <section className="summary-grid" data-scroll-reveal aria-label="Moliyaviy ko‘rsatkichlar">
            <article className="balance-card"><div className="balance-top"><span>Umumiy balans</span><span className="balance-chip"><span className="status-dot" /> OYLIK</span></div><div className="balance-value">{money(balance)}</div><div className="balance-foot"><span><TrendingUp size={15} /> {income ? `${Math.round((balance / income) * 100)}%` : '0%'} saqlanib qoldi</span><span>Daromad va xarajat farqi</span></div><div className="balance-sparkline" aria-hidden="true">{[36, 52, 43, 64, 48, 76, 61, 83, 58, 91, 70, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></article>
            <article className="metric-card"><div className="metric-heading"><span className="metric-icon income-icon"><ArrowDownLeft size={18} /></span><span className="metric-trend positive"><TrendingUp size={13} /> Daromad</span></div><span className="metric-label">Jami daromad</span><strong>{money(income)}</strong><div className="metric-footer"><span className="mini-bar"><i style={{ width: '68%' }} /></span><span>Bu oy</span></div></article>
            <article className="metric-card"><div className="metric-heading"><span className="metric-icon expense-icon"><ArrowUpRight size={18} /></span><span className="metric-trend negative"><TrendingDown size={13} /> Xarajat</span></div><span className="metric-label">Jami xarajat</span><strong>{money(expenses)}</strong><div className="metric-footer"><span className="mini-bar expense-mini"><i style={{ width: `${income ? Math.min(100, (expenses / income) * 100) : 0}%` }} /></span><span>{income ? Math.round((expenses / income) * 100) : 0}% daromaddan</span></div></article>
          </section>

          <section className="content-grid scroll-target" data-scroll-reveal id="spending">
            <article className="panel spending-panel" data-reveal="from-left"><div className="panel-header"><div><span className="section-kicker">PUL OQIMI</span><h2>Pulim qayerga ketmoqda?</h2></div><div className="segmented-control">{['Hafta', 'Oy'].map((range) => <button type="button" key={range} className={activeRange === range ? 'selected' : ''} onClick={() => setActiveRange(range)}>{range}</button>)}</div></div><div className="chart-legend"><span><i className="legend-dot green-dot" /> Xarajatlar</span><span className="chart-total">{money(expenses)}</span></div><div className="bar-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 8, left: -15, bottom: 0 }} barCategoryGap="35%"><CartesianGrid vertical={false} stroke="#edf0eb" strokeDasharray="3 5" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ba39a', fontSize: 11 }} dy={12} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ba39a', fontSize: 11 }} tickFormatter={compact} /><Tooltip cursor={{ fill: '#eff3ec' }} formatter={(value) => [money(value), 'Xarajat']} contentStyle={{ border: '1px solid #e7ece4', borderRadius: 10, fontSize: 12 }} /><Bar dataKey="xarajat" fill="#3a735c" radius={[5, 5, 1, 1]} maxBarSize={34} /></BarChart></ResponsiveContainer></div><div className="chart-insight"><span className="insight-icon"><Sparkles size={15} /></span><span>Eng ko‘p xarajat <b>{expenseByCategory[0]?.name || 'hozircha yo‘q'}</b> kategoriyasida.</span><a href="#categories">Batafsil <ArrowRight size={13} /></a></div></article>
            <article className="panel category-panel" id="categories" data-reveal="from-right"><div className="panel-header"><div><span className="section-kicker">KATEGORIYALAR</span><h2>Xarajatlar tarkibi</h2></div><button className="more-button" aria-label="Ko‘proq" type="button"><MoreHorizontal size={21} /></button></div><div className="donut-layout"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="92%" paddingAngle={4} stroke="none">{expenseByCategory.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => money(value)} contentStyle={{ border: '1px solid #e7ece4', borderRadius: 10, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><span>JAMI</span><strong>{compact(expenses)}</strong></div></div><div className="category-list">{expenseByCategory.length ? expenseByCategory.slice(0, 5).map(({ name, color, value }) => <div className="category-item" key={name}><span className="category-swatch" style={{ background: color }} /><span className="category-name">{name}</span><span className="category-value">{compact(value)}</span></div>) : <p className="empty-copy">Xarajat qo‘shsangiz, tarkibi shu yerda ko‘rinadi.</p>}</div></div><a className="text-link" href="#transactions">Barcha kategoriyalar <ArrowRight size={14} /></a></article>
          </section>

          <section className="lower-grid scroll-target" data-scroll-reveal id="savings">
            <article className="panel goal-panel" data-reveal="zoom">
              <div className="panel-header"><div><span className="section-kicker">KATTA REJA</span><h2>Jamg‘arma maqsadi</h2></div><span className="goal-badge"><Target size={14} /> MAQSAD</span></div>
              <div className="goal-content"><div className="goal-illustration"><div className="goal-sun" /><div className="goal-mountain mountain-back" /><div className="goal-mountain mountain-front" /><div className="goal-coin"><Banknote size={25} /></div></div><div className="goal-data"><div className="goal-name-line"><input aria-label="Maqsad nomi" maxLength="100" value={data.goal.name} onChange={(event) => updateGoal('name', event.target.value)} /><button type="button" className="edit-quiet" aria-label="Maqsad nomini tahrirlash"><Settings2 size={15} /></button></div><strong className="goal-amount">{money(data.goal.target)}</strong><div className="goal-progress-track"><i style={{ width: `${goalProgress}%` }} /></div><div className="goal-caption"><span>{money(data.goal.saved)} yig‘ildi</span><b>{Math.round(goalProgress)}%</b></div><div className="goal-remaining"><span>Maqsadga qolgan</span><strong>{money(goalRemaining)}</strong></div><div className="goal-estimate"><span className="estimate-icon"><CalendarDays size={15} /></span><span>Maqsadga yetish uchun</span><strong>{goalRemaining === 0 ? 'Maqsadga yetdingiz!' : monthsToGoal ? `taxminan ${monthsToGoal} oy` : 'oylik jamg‘armani kiriting'}</strong></div></div></div>
              <div className="goal-controls"><label>Maqsad narxi<div className="input-with-unit"><input type="number" min="1" value={data.goal.target} onChange={(event) => updateGoal('target', Number(event.target.value))} /><span>so‘m</span></div></label><label>Har oy yig‘aman<div className="input-with-unit"><input type="number" min="0" value={data.goal.monthly} onChange={(event) => updateGoal('monthly', Number(event.target.value))} /><span>so‘m</span></div></label></div>
              <form className="goal-contribution" onSubmit={addContribution}><label>Jamg‘armaga pul qo‘shish<div className="input-with-unit"><input type="number" min="1" required placeholder="Masalan, 100 000" value={contribution} onChange={(event) => setContribution(event.target.value)} /><span>so‘m</span></div></label><button type="submit" disabled={!contribution}><Plus size={15} /> Qo‘shish</button></form>
            </article>
            <article className="panel challenge-panel" id="challenge" data-reveal="tilt"><div className="challenge-top"><div className="challenge-icon"><BadgeCheck size={19} /></div><span className="challenge-tag">30 KUNLIK CHALLENGE</span><button className="more-button" aria-label="Ko‘proq" type="button"><MoreHorizontal size={20} /></button></div><h2>Bugun tejadingizmi?</h2><p>Har kuni ozgina tejang. 30 kundan so‘ng o‘zgarishni his qilasiz.</p><div className="challenge-progress"><div className="challenge-count"><strong>{Math.min(30, data.challengeDays.length)}</strong><span>/ 30 kun</span></div><div className="challenge-track">{Array.from({ length: 30 }, (_, index) => <i key={index} className={index < data.challengeDays.length ? 'done' : ''} />)}</div></div><button type="button" className={`challenge-button ${challengeComplete ? 'checked' : ''}`} onClick={toggleChallenge}>{challengeComplete ? <><Check size={16} /> Bugungi qadam bajarildi</> : <>Bugungi qadamni belgilash <ArrowRight size={16} /></>}</button></article></section>

          <section className="bottom-grid" data-scroll-reveal><article className="panel transactions-panel" id="transactions" data-reveal="from-left"><div className="panel-header"><div><span className="section-kicker">SO‘NGGI FAOLLIK</span><h2>Oxirgi tranzaksiyalar</h2></div><button className="text-link-button" type="button" onClick={() => setModal(true)}>Barchasini ko‘rish <ArrowRight size={14} /></button></div><div className="transaction-table">{recentTransactions.length ? recentTransactions.map((item) => { const Icon = categoryIcon(item.category); return <div className="transaction-row" key={item.id}><span className={`transaction-icon ${item.type === 'income' ? 'tx-income' : ''}`}><Icon size={17} /></span><span className="transaction-title"><strong>{item.title}</strong><small>{item.category}</small></span><span className="transaction-date">{new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00`))}</span><strong className={`transaction-amount ${item.type}`}>{item.type === 'income' ? '+' : '−'}{money(item.amount)}</strong></div> }) : <div className="empty-transactions">Bu oy uchun yozuvlar yo‘q. Birinchi tranzaksiyangizni qo‘shing.</div>}</div></article>
            <div className="right-stack"><article className="tip-card" data-reveal="from-right"><div className="tip-top"><span className="tip-bulb"><Lightbulb size={18} /></span><span>BUGUNGI MASLAHAT</span><span className="tip-number">0{activeTip + 1} / 03</span></div><h3>{tips[activeTip].title}</h3><p>{tips[activeTip].text}</p><button type="button" onClick={() => setActiveTip((activeTip + 1) % tips.length)}>Keyingi maslahat <ArrowRight size={14} /></button><div className="tip-decoration">✳</div></article>
              <article className="panel credit-panel"><div className="credit-heading"><span className="credit-icon"><CreditCard size={17} /></span><div><span className="section-kicker">REJALASHTIRING</span><h2>Kredit kalkulyatori</h2></div><CircleHelp size={15} className="help-icon" /></div><div className="credit-fields"><label>Kredit summasi<div className="input-with-unit"><input type="number" min="0" step="100000" value={credit.amount} onChange={(event) => setCredit({ ...credit, amount: event.target.value })} /><span>so‘m</span></div></label><div className="credit-pair"><label>Yillik foiz<div className="input-with-unit"><input type="number" min="0" step="0.1" value={credit.rate} onChange={(event) => setCredit({ ...credit, rate: event.target.value })} /><span>%</span></div></label><label>Muddat<div className="input-with-unit"><input type="number" min="1" value={credit.months} onChange={(event) => setCredit({ ...credit, months: event.target.value })} /><span>oy</span></div></label></div></div><div className="credit-result"><span>Oylik to‘lov</span><strong>{money(monthlyPayment)}</strong></div></article></div>
          </section>
          <section className="principles-section" data-scroll-reveal>
            <div className="principles-heading"><span className="section-kicker">ODDIY REJA, BARQAROR NATIJA</span><h2>Oylik pulni 3 qismga ajrating</h2><p>50 / 30 / 20 qoidasi byudjetni tushunarli va boshqariladigan qiladi.</p></div>
            <div className="principles-grid"><article className="principle-card needs-card" data-reveal="from-left"><div className="principle-top"><span>50%</span><span>ASOSIY EHTIYOJ</span></div><h3>Avval zarur narsalar</h3><p>Uy, oziq-ovqat, transport va kundalik to‘lovlar.</p><div className="principle-bar"><i style={{ width: '50%' }} /></div><strong>{money(income * 0.5)}</strong></article><article className="principle-card wants-card" data-reveal="zoom"><div className="principle-top"><span>30%</span><span>SHAXSIY ISTAKLAR</span></div><h3>O‘zingizga ham joy qoldiring</h3><p>Hordiq, xaridlar va yoqtirgan mashg‘ulotlar.</p><div className="principle-bar"><i style={{ width: '30%' }} /></div><strong>{money(income * 0.3)}</strong></article><article className="principle-card savings-card" data-reveal="from-right"><div className="principle-top"><span>20%</span><span>JAMG‘ARMA</span></div><h3>Kelajak uchun yig‘ing</h3><p>Kutilmagan holatlar va katta maqsadlar uchun.</p><div className="principle-bar"><i style={{ width: '20%' }} /></div><strong>{money(income * 0.2)}</strong></article></div>
          </section>

          <footer className="page-footer"><span>© 2026 MoneyMaster UZ</span><span><i /> Ma’lumotlaringiz faqat ushbu qurilmada saqlanadi</span><a href="#overview">Yuqoriga <ArrowUpRight size={13} /></a></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false) }}><form className="transaction-modal" onSubmit={addTransaction}><div className="modal-heading"><div><span className="section-kicker">YANGI YOZUV</span><h2>Tranzaksiya qo‘shish</h2></div><button type="button" className="icon-button" aria-label="Yopish" onClick={() => setModal(false)}><X size={19} /></button></div><div className="type-toggle"><button type="button" className={form.type === 'expense' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'expense', category: 'Oziq-ovqat' })}><ArrowUpRight size={16} /> Xarajat</button><button type="button" className={form.type === 'income' ? 'selected income-selected' : ''} onClick={() => setForm({ ...form, type: 'income', category: 'Ish haqi' })}><ArrowDownLeft size={16} /> Daromad</button></div><label className="form-label">Nomi<input autoFocus required placeholder="Masalan, tushlik" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="form-label">Summa<input required type="number" min="1" placeholder="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><div className="form-row"><label className="form-label">Kategoriya<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{(form.type === 'income' ? ['Ish haqi', 'Qo‘shimcha daromad', 'Boshqa'] : categories.map((item) => item.name)).map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-label">Sana<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label></div><button className="modal-submit" type="submit"><Plus size={16} /> Tranzaksiyani saqlash</button></form></div>}
    </div>
  )
}

export default Dashboard
