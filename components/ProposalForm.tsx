'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Proposal } from '@/lib/types'

interface Props {
  taskId: string
  existingProposal: Proposal | null
}

export function ProposalForm({ taskId, existingProposal }: Props) {
  const [amount, setAmount] = useState(existingProposal?.amount?.toString() ?? '')
  const [message, setMessage] = useState(existingProposal?.message ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  if (existingProposal?.status === 'accepted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Jūsu piedāvājums pieņemts!</p>
            <p className="text-sm text-emerald-600 mt-0.5">
              Apstiprināta summa: <span className="font-bold">€{existingProposal.amount}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (existingProposal?.status === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800 text-sm">Jūsu piedāvājums noraidīts</p>
            <p className="text-xs text-red-600 mt-0.5">Šoreiz netika izvēlēts jūsu piedāvājums</p>
          </div>
        </div>
      </div>
    )
  }

  if (existingProposal?.status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">Piedāvājums nosūtīts — gaida lēmumu</p>
            <p className="text-xs text-amber-700 mt-1">
              Jūsu summa: <span className="font-bold">€{existingProposal.amount}</span>
            </p>
            {existingProposal.message && (
              <p className="text-xs text-amber-600 mt-1 italic">"{existingProposal.message}"</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) { setError('Ievadiet summu'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Nav autorizācijas'); setLoading(false); return }

    const { error: err } = await supabase.from('proposals').insert({
      task_id: taskId,
      partner_id: user.id,
      amount: parseFloat(amount),
      message: message.trim(),
    })

    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-2 h-2 rounded-full bg-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Iesniegt piedāvājumu</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Jūsu cena (€)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all font-semibold"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Ziņa <span className="normal-case font-normal text-slate-400">(neobligāti)</span></label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Īss apraksts, kāpēc esat piemērots šim uzdevumam..."
          rows={3}
          className="w-full resize-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors shadow-sm"
      >
        {loading ? 'Sūta...' : 'Nosūtīt piedāvājumu'}
      </button>
    </form>
  )
}
