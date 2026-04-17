import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TaskCard } from '@/components/TaskCard'
import { NavBar } from '@/components/NavBar'
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
    <div className="min-h-screen bg-slate-50">
      <NavBar profile={profile} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Uzdevumi</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {tasks.length === 0 ? 'Nav uzdevumu' : `${tasks.length} uzdevum${tasks.length === 1 ? 's' : 'i'} kopā`}
            </p>
          </div>
          {profile.role === 'admin' && (
            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
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
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Melnraksti', count: draftCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
              { label: 'Izsūtīti', count: sentCount, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Piešķirti', count: assignedCount, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-xl border p-3.5 ${stat.bg}`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <p className="text-slate-900 font-semibold text-base mb-1">Nav uzdevumu</p>
            {profile.role === 'admin' ? (
              <>
                <p className="text-slate-500 text-sm mb-5">Izveidojiet pirmo uzdevumu, lai sāktu darbu</p>
                <Link
                  href="/tasks/new"
                  className="inline-flex items-center gap-2 bg-slate-950 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
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
          <div className="space-y-2.5">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} profile={profile} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
