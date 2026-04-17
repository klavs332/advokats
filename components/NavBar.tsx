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

  /* ── compute total unread from localStorage ── */
  useEffect(() => {
    async function computeUnread() {
      // fetch all tasks user is involved in
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

      // fetch messages not sent by current user
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, task_id, created_at, sender_id')
        .in('task_id', taskIds)
        .neq('sender_id', profile.id)

      if (!msgs) return

      // count unread using localStorage timestamps
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

  /* ── realtime: increment badge on new messages from others ── */
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

  /* ── when sidebar opens, recount after a tick ── */
  function openSidebar() {
    setSidebarOpen(true)
    // badge will naturally recalculate via localStorage as user views chats
  }

  function closeSidebar() {
    setSidebarOpen(false)
    // recompute badge after sidebar closes (user may have read messages)
    setTimeout(() => setUnreadCount(prev => {
      // re-derive — simplest: just trigger a fresh recount
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
      <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shadow-sm group-hover:bg-amber-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-semibold text-white tracking-tight text-sm">Advokatam</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5 flex-1">
            {navLinks.map(link => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Chat toggle button */}
            <button
              onClick={sidebarOpen ? closeSidebar : openSidebar}
              className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                sidebarOpen
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Sarakste"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadCount > 0 && !sidebarOpen && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <div className="w-px h-5 bg-slate-700" />

            {/* User info */}
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isAdmin ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-200'
              }`}>
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-slate-200 font-medium leading-none">{profile.name}</p>
                <p className="text-xs text-slate-500 leading-none mt-0.5">{isAdmin ? 'Administrators' : 'Partneris'}</p>
              </div>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              Iziet
            </button>
          </div>
        </div>
      </nav>

      {/* Chat sidebar — rendered outside the nav flow but inside this client tree */}
      <ChatSidebar
        profile={profile}
        open={sidebarOpen}
        onClose={closeSidebar}
      />
    </>
  )
}
