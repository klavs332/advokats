import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { PartnerStatusDropdown } from '@/components/PartnerStatusDropdown'
import { ChatThread } from '@/components/ChatThread'
import { ProposalForm } from '@/components/ProposalForm'
import { ProposalList } from '@/components/ProposalList'
import { DeleteTaskButton } from '@/components/DeleteTaskButton'
import { Container } from '@/components/ui/container'
import Link from 'next/link'
import type { MessageWithSender, ProposalWithPartner, TaskWithRecipients } from '@/lib/types'

function formatAmount(n: number) {
  return new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('lv-LV', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  draft: { label: 'Melnraksts', className: 'bg-[var(--brand-soft)] text-[var(--brand-hover)] border border-[var(--brand)]/20', dot: 'bg-[var(--brand)]', bar: 'bg-[var(--brand)]' },
  sent: { label: 'Izsūtīts', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
  assigned: { label: 'Piešķirts', className: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-400', bar: 'bg-blue-400' },
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
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">
      <NavBar profile={profile} />
      <main className="py-6 sm:py-10 w-full flex-1">
        <Container>
          <div className="flex flex-col gap-5">

            {/* Back link */}
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Atpakaļ uz uzdevumiem
            </Link>

            {/* Task header card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className={`h-1 w-full ${status.bar}`} />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 lg:gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3 flex-wrap">
                      <h1 className="font-display text-2xl sm:text-3xl text-slate-900 leading-tight">{typedTask.title}</h1>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 mt-1 ${status.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-5 font-medium">{formatDate(typedTask.created_at)}</p>

                    {typedTask.description && (
                      <p className="text-slate-600 whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed mb-5">
                        {typedTask.description}
                      </p>
                    )}

                    {typedTask.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {typedTask.categories.map(cat => (
                          <span key={cat} className="text-xs bg-slate-50 text-slate-700 px-3 py-1 rounded-full border border-slate-200 font-medium">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-end lg:items-start justify-between lg:flex-col lg:text-right shrink-0 gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div>
                      <p className="font-display text-3xl sm:text-4xl text-slate-900 tabular-nums">{formatAmount(typedTask.amount)}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">Budžets</p>
                    </div>
                    {profile.role === 'admin' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/tasks/${id}/edit`}
                          className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2 rounded-xl border border-slate-200 transition-colors"
                        >
                          Rediģēt
                        </Link>
                        <DeleteTaskButton taskId={id} taskTitle={typedTask.title} />
                      </div>
                    )}
                  </div>
                </div>

                {profile.role === 'admin' && typedTask.task_recipients?.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <PartnerStatusDropdown recipients={typedTask.task_recipients as any} />
                  </div>
                )}
              </div>
            </div>

            {profile.role === 'admin' && (
              <ProposalList taskId={id} proposals={proposals} />
            )}
            {profile.role === 'partner' && typedTask.status !== 'assigned' && (
              <ProposalForm taskId={id} existingProposal={myProposal} />
            )}

            <ChatThread
              taskId={id}
              initialMessages={messages}
              profile={profile}
              recipients={typedTask.task_recipients as any}
            />
          </div>
        </Container>
      </main>
    </div>
  )
}
