'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProposalWithPartner } from '@/lib/types'

function formatAmount(n: number) {
  return new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(n)
}

const AVAILABILITY_LABEL: Record<string, { label: string; className: string }> = {
  available: { label: 'Pieejams', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  busy: { label: 'Aizņemts', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  unavailable: { label: 'Nav pieejams', className: 'bg-red-50 text-red-700 border-red-200' },
}

export function ProposalList({ taskId, proposals: initial }: { taskId: string; proposals: ProposalWithPartner[] }) {
  const [proposals, setProposals] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const sorted = [...proposals].sort((a, b) => {
    const order = { accepted: 0, pending: 1, rejected: 2 }
    return order[a.status] - order[b.status]
  })

  async function handleAccept(proposalId: string, partnerId: string) {
    setLoading(proposalId)
    await supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposalId)
    await supabase.from('proposals').update({ status: 'rejected' }).eq('task_id', taskId).neq('id', proposalId)
    await supabase.from('tasks').update({ assigned_to: partnerId, status: 'assigned' }).eq('id', taskId)
    setProposals(prev => prev.map(p => ({ ...p, status: p.id === proposalId ? 'accepted' : 'rejected' })))
    setLoading(null)
    router.refresh()
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-10 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <p className="text-slate-600 font-semibold text-sm mb-1">Nav saņemtu piedāvājumu</p>
        <p className="text-slate-400 text-xs">Partneri vēl nav iesnieguši piedāvājumus</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-amber-400" />
        <h3 className="text-sm font-semibold text-slate-700">Piedāvājumi</h3>
        <span className="ml-1 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">{proposals.length}</span>
      </div>

      <div className="divide-y divide-slate-100">
        {sorted.map(p => {
          const avail = p.profiles?.availability ? AVAILABILITY_LABEL[p.profiles.availability] : null
          const initials = p.profiles?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'
          const isAccepted = p.status === 'accepted'
          const isRejected = p.status === 'rejected'

          return (
            <div
              key={p.id}
              className={`px-5 py-4 flex items-start justify-between gap-4 transition-colors ${
                isAccepted ? 'bg-emerald-50/50' : isRejected ? 'opacity-60' : ''
              }`}
            >
              <div className="flex gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isAccepted ? 'bg-emerald-500 text-white' :
                  isRejected ? 'bg-slate-200 text-slate-400' :
                  'bg-slate-800 text-white'
                }`}>
                  {initials}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-slate-900 text-sm">{p.profiles?.name}</span>
                    {p.profiles?.rating && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#D97706">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        {p.profiles.rating.toFixed(1)}
                      </span>
                    )}
                    {avail && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${avail.className}`}>
                        {avail.label}
                      </span>
                    )}
                  </div>

                  {/* Experience */}
                  {p.profiles?.experience && (
                    <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">{p.profiles.experience}</p>
                  )}

                  {/* Message */}
                  {p.message && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-2">
                      <p className="text-xs text-slate-600 italic leading-relaxed">"{p.message}"</p>
                    </div>
                  )}

                  {/* Topics */}
                  {p.profiles?.topics && p.profiles.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.profiles.topics.slice(0, 4).map(t => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount + action */}
              <div className="flex flex-col items-end gap-2.5 shrink-0">
                <span className="text-xl font-bold text-slate-900 tabular-nums">{formatAmount(p.amount)}</span>

                {isAccepted && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
                    <svg width="11" height="11" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Pieņemts
                  </span>
                )}
                {isRejected && (
                  <span className="text-xs bg-slate-100 text-slate-400 px-3 py-1 rounded-full border border-slate-200 font-medium">
                    Noraidīts
                  </span>
                )}
                {p.status === 'pending' && (
                  <button
                    onClick={() => handleAccept(p.id, p.partner_id)}
                    disabled={loading === p.id}
                    className="text-xs bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    {loading === p.id ? 'Apstrādā...' : 'Pieņemt'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
