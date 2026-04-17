import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TaskCard } from '@/components/TaskCard'
import { NavBar } from '@/components/NavBar'
import { Container } from '@/components/ui/container'
import type { TaskWithRecipients } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data } = await supabase
    .from('tasks')
    .select('*, task_recipients(*, profiles(*))')
    .order('created_at', { ascending: false })

  const tasks = (data as TaskWithRecipients[]) ?? []

  const draftCount = tasks.filter(t => t.status === 'draft').length
  const sentCount = tasks.filter(t => t.status === 'sent').length
  const assignedCount = tasks.filter(t => t.status === 'assigned').length

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <NavBar profile={profile} />

      <main className="py-6 sm:py-10">
        <Container>
          {/* Page header */}
          <div className="flex items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 flex-col sm:flex-row">
            <div>
              <h1 className="text-display text-slate-900">Uzdevumi</h1>
              <p className="text-sm text-slate-500 mt-1">
                {tasks.length === 0 ? 'Vēl nav izveidots neviens uzdevums' : `${tasks.length} uzdevum${tasks.length === 1 ? 's' : 'i'} kopā`}
              </p>
            </div>
            {profile.role === 'admin' && (
              <Link
                href="/tasks/new"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-3 sm:py-2.5 rounded-xl transition-colors shadow-card"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Jauns uzdevums
              </Link>
            )}
          </div>

          {/* Stats row (admin only) */}
          {profile.role === 'admin' && tasks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 sm:mb-8">
              {[
                { label: 'Melnraksti', count: draftCount, accent: 'text-[var(--brand)]', bg: 'bg-white', ring: 'ring-[var(--brand)]/20' },
                { label: 'Izsūtīti', count: sentCount, accent: 'text-emerald-600', bg: 'bg-white', ring: 'ring-emerald-200' },
                { label: 'Piešķirti', count: assignedCount, accent: 'text-blue-600', bg: 'bg-white', ring: 'ring-blue-200' },
              ].map(stat => (
                <div key={stat.label} className={`rounded-2xl ring-1 ${stat.ring} ${stat.bg} p-5 shadow-card`}>
                  <p className={`text-3xl font-display ${stat.accent} tabular-nums`}>{stat.count}</p>
                  <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Task list */}
          {tasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-16 sm:py-24 flex flex-col items-center justify-center text-center shadow-card px-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <p className="font-display text-xl text-slate-900 mb-1.5">Nav uzdevumu</p>
              {profile.role === 'admin' ? (
                <>
                  <p className="text-slate-500 text-sm mb-6 max-w-xs">Izveidojiet pirmo uzdevumu, lai sāktu sadarbību ar partneriem</p>
                  <Link
                    href="/tasks/new"
                    className="inline-flex items-center gap-2 bg-slate-950 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-card"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Izveidot uzdevumu
                  </Link>
                </>
              ) : (
                <p className="text-slate-500 text-sm">Jums vēl nav piešķirtu uzdevumu</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} profile={profile} />
              ))}
            </div>
          )}
        </Container>
      </main>
    </div>
  )
}
