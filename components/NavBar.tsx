'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatSidebar } from '@/components/ChatSidebar'
import type { Profile } from '@/lib/types'

export function NavBar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const isAdmin = profile.role === 'admin'

  const navLinks = isAdmin
    ? [
        { href: '/', label: 'Uzdevumi' },
        { href: '/partners', label: 'Partneri' },
        { href: '/topics', label: 'Tēmas' },
      ]
    : [
        { href: '/', label: 'Uzdevumi' },
        { href: '/settings', label: 'Mans profils' },
      ]

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  useEffect(() => {
    async function computeUnread() {
      let taskIds: string[] = []
      if (isAdmin) {
        const { data } = await supabase.from('tasks').select('id')
        taskIds = (data ?? []).map(t => t.id)
      } else {
        const { data } = await supabase
          .from('task_recipients')
          .select('task_id')
          .eq('partner_id', profile.id)
        taskIds = (data ?? []).map(r => r.task_id)
      }

      if (taskIds.length === 0) return

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, task_id, created_at, sender_id')
        .in('task_id', taskIds)
        .neq('sender_id', profile.id)

      if (!msgs) return

      let count = 0
      for (const msg of msgs) {
        try {
          const lastViewed = localStorage.getItem(`chat_viewed_${msg.task_id}`)
          if (!lastViewed || msg.created_at > lastViewed) count++
        } catch { /* noop */ }
      }
      setUnreadCount(count)
    }

    computeUnread()
  }, [profile.id, isAdmin])

  useEffect(() => {
    const channel = supabase
      .channel('navbar-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.sender_id !== profile.id) {
            const taskId = payload.new.task_id as string
            try {
              const lastViewed = localStorage.getItem(`chat_viewed_${taskId}`)
              const msgTime = payload.new.created_at as string
              if (!lastViewed || msgTime > lastViewed) {
                setUnreadCount(n => n + 1)
              }
            } catch {
              setUnreadCount(n => n + 1)
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile.id])

  function openSidebar() { setSidebarOpen(true); setMenuOpen(false) }

  function closeSidebar() {
    setSidebarOpen(false)
    setTimeout(() => setUnreadCount(prev => {
      supabase
        .from('messages')
        .select('id, task_id, created_at, sender_id')
        .neq('sender_id', profile.id)
        .then(({ data: msgs }) => {
          if (!msgs) return
          let count = 0
          for (const msg of msgs) {
            try {
              const lastViewed = localStorage.getItem(`chat_viewed_${msg.task_id}`)
              if (!lastViewed || msg.created_at > lastViewed) count++
            } catch { /* noop */ }
          }
          setUnreadCount(count)
        })
      return prev
    }), 300)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <nav className="bg-[oklch(0.15_0.008_260)] border-b border-white/5 sticky top-0 z-30">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center shadow-sm group-hover:bg-[var(--brand-hover)] transition-colors ring-1 ring-white/10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/>
              </svg>
            </div>
            <span className="font-display text-white text-lg leading-none">Leimanis</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 flex-1 ml-4">
            {navLinks.map(link => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Chat toggle */}
            <button
              onClick={sidebarOpen ? closeSidebar : openSidebar}
              className={`relative w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors ${
                sidebarOpen
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
              aria-label="Sarakste"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadCount > 0 && !sidebarOpen && (
                <span className="absolute top-1 right-1 bg-[var(--brand)] text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none ring-2 ring-[oklch(0.15_0.008_260)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Desktop user + logout */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-white/10 ${
                  isAdmin ? 'bg-[var(--brand)] text-white' : 'bg-white/10 text-white'
                }`}>
                  {initials}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm text-white font-medium leading-none">{profile.name}</p>
                  <p className="text-[11px] text-white/50 leading-none mt-0.5">{isAdmin ? 'Advokāts' : 'Partneris'}</p>
                </div>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <button
                onClick={handleLogout}
                className="text-xs text-white/60 hover:text-white transition-colors font-medium"
              >
                Iziet
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Izvēlne"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[oklch(0.15_0.008_260)]">
            <div className="px-4 py-3 space-y-1">
              {/* User block */}
              <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-white/5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-1 ring-white/10 ${
                  isAdmin ? 'bg-[var(--brand)] text-white' : 'bg-white/10 text-white'
                }`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{profile.name}</p>
                  <p className="text-xs text-white/50">{isAdmin ? 'Advokāts' : 'Partneris'}</p>
                </div>
              </div>

              {navLinks.map(link => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-3 rounded-lg text-[15px] font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Iziet
              </button>
            </div>
          </div>
        )}
      </nav>

      <ChatSidebar
        profile={profile}
        open={sidebarOpen}
        onClose={closeSidebar}
      />
    </>
  )
}
