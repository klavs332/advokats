'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('approved, role')
        .eq('id', data.user.id)
        .single()

      if (profile && profile.role === 'partner' && !profile.approved) {
        await supabase.auth.signOut()
        setError('Jūsu konts vēl nav apstiprināts. Lūdzu, gaidiet administratora apstiprinājumu.')
        setLoading(false)
        return
      }
    }

    router.push('/')
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('Vārds ir obligāts')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim(), role: 'partner' },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess('Reģistrācija veiksmīga! Lūdzu, gaidiet administratora apstiprinājumu, lai pieteiktos.')
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-[var(--paper)]">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col bg-[oklch(0.14_0.008_260)] relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '28px 28px'
        }} />
        <div className="absolute -top-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-[var(--brand)]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-[var(--brand)]/15 to-transparent" />

        <div className="relative flex flex-col flex-1 p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)] flex items-center justify-center shadow-lg ring-1 ring-white/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
              </svg>
            </div>
            <span className="font-display text-white text-2xl leading-none">Leimanis</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-10">
              <p className="text-[var(--brand)] text-xs font-semibold uppercase tracking-[0.2em] mb-5">Advokātu birojs</p>
              <h1 className="font-display text-white leading-[1.05] mb-5 text-5xl">
                Juridiskā ekselence,<br />
                <span className="text-[var(--brand)]">precīzi sadalīta.</span>
              </h1>
              <p className="text-white/60 text-base leading-relaxed max-w-md">
                Mūsdienīga darba vide uzdevumu izpildei, piedāvājumu izvērtēšanai un sadarbībai ar partneriem.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                'Uzdevumu izsūtīšana izvēlētiem partneriem',
                'Piedāvājumu strukturēta salīdzināšana',
                'Privāta, šifrēta sarakste par katru lietu',
              ].map(feat => (
                <li key={feat} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--brand)]/15 ring-1 ring-[var(--brand)]/30 flex items-center justify-center shrink-0">
                    <svg width="11" height="11" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-white/30 text-xs">© 2026 Leimanis. Visas tiesības aizsargātas.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
              </svg>
            </div>
            <span className="font-display text-slate-900 text-xl">Leimanis</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-slate-900 text-3xl sm:text-4xl mb-2">
              {mode === 'login' ? 'Laipni lūgti' : 'Pievienojieties'}
            </h2>
            <p className="text-slate-500 text-sm">
              {mode === 'login' ? 'Piesakieties savā kontā, lai turpinātu' : 'Izveidojiet partnera kontu'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Vārds Uzvārds</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Juris Bērziņš"
                  required
                  className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">E-pasta adrese</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juris@example.com"
                required
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Parole</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p className="text-sm text-emerald-700">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 sm:h-11 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors mt-2 shadow-card"
            >
              {loading
                ? (mode === 'login' ? 'Piesakās...' : 'Reģistrē...')
                : (mode === 'login' ? 'Pieteikties' : 'Reģistrēties')
              }
            </button>
          </form>

          <div className="mt-7 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-slate-500">
                Nav konta?{' '}
                <button
                  onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                  className="text-[var(--brand)] hover:text-[var(--brand-hover)] font-semibold transition-colors"
                >
                  Reģistrēties kā partneris
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Jau ir konts?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  className="text-[var(--brand)] hover:text-[var(--brand-hover)] font-semibold transition-colors"
                >
                  Pieteikties
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
