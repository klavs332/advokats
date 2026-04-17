import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { PartnerStatusDropdown } from '@/components/PartnerStatusDropdown'
import { ChatThread } from '@/components/ChatThread'
import { ProposalForm } from '@/components/ProposalForm'
import { ProposalList } from '@/components/ProposalList'
import { DeleteTaskButton } from '@/components/DeleteTaskButton'
import Link from 'next/link'
import type { MessageWithSender, ProposalWithPartner, TaskWithRecipients } from '@/lib/types'

function formatAmount(n: number) {
  return new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lv-LV', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  draft: { label: 'Melnraksts', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  sent: { label: 'Izsūtīts', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  assigned: { label: 'Piešķirts', className: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-400' },
} as const

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: task } = await supabase
    .from('tasks').select('*, task_recipients(*, profiles(*))').eq('id', id).single()
  if (!task) notFound()

  const typedTask = task as TaskWithRecipients

  // Mark as opened for partner
  if (profile.role === 'partner') {
    const mine = typedTask.task_recipients?.find(r => r.partner_id === profile.id)
    if (mine && !mine.opened_at) {
      await supabase.from('task_recipients').update({ opened_at: new Date().toISOString() })
        .eq('task_id', id).eq('partner_id', profile.id)
    }
  }

  const [{ data: messagesRaw }, { data: proposalsRaw }, { data: myProposalRaw }] = await Promise.all([
    supabase.from('messages').select('*, profiles(*)').eq('task_id', id).order('created_at', { ascending: true }),
    profile.role === 'admin'
      ? supabase.from('proposals').select('*, profiles(*)').eq('task_id', id).order('created_at', { ascending: false })
      : { data: null },
    profile.role === 'partner'
      ? supabase.from('proposals').select('*').eq('task_id', id).eq('partner_id', profile.id).single()
      : { data: null },
  ])

  const messages = (messagesRaw as MessageWithSender[]) ?? []
  const proposals = (proposalsRaw as ProposalWithPartner[]) ?? []
  const myProposal = myProposalRaw ?? null

  const status = STATUS_CONFIG[typedTask.status] ?? STATUS_CONFIG.draft

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavBar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 py-8 w-full flex flex-col flex-1 gap-5">

        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Atpakaļ uz uzdevumiem
        </Link>

        {/* Task header card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Status bar on top */}
          <div className={`h-1 w-full ${
            typedTask.status === 'draft' ? 'bg-amber-400' :
            typedTask.status === 'sent' ? 'bg-emerald-400' : 'bg-blue-400'
          }`} />

          <div className="p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start gap-3 mb-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">{typedTask.title}</h1>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 mt-0.5 ${status.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                  {profile.role === 'admin' && (
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      <Link
                        href={`/tasks/${id}/edit`}
                        className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
                      >
                        Rediģēt
                      </Link>
                      <DeleteTaskButton taskId={id} taskTitle={typedTask.title} />
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4 font-medium">{formatDate(typedTask.created_at)}</p>

                {typedTask.description && (
                  <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed mb-5">
                    {typedTask.description}
                  </p>
                )}

                {typedTask.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {typedTask.categories.map(cat => (
                      <span key={cat} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className="text-3xl font-bold text-slate-900 tabular-nums">{formatAmount(typedTask.amount)}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">Budžets</p>
              </div>
            </div>

            {/* Partner status (admin only) */}
            {profile.role === 'admin' && typedTask.task_recipients?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <PartnerStatusDropdown recipients={typedTask.task_recipients as any} />
              </div>
            )}
          </div>
        </div>

        {/* Proposals */}
        {profile.role === 'admin' && (
          <ProposalList taskId={id} proposals={proposals} />
        )}
        {profile.role === 'partner' && typedTask.status !== 'assigned' && (
          <ProposalForm taskId={id} existingProposal={myProposal} />
        )}

        {/* Chat */}
        <ChatThread
          taskId={id}
          initialMessages={messages}
          profile={profile}
          recipients={typedTask.task_recipients as any}
        />
      </main>
    </div>
  )
}
