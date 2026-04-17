'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function PartnerList({ partners: initialPartners }: { partners: Profile[] }) {
  const [partners, setPartners] = useState(initialPartners)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const pending = partners.filter(p => !p.approved)
  const approved = partners.filter(p => p.approved)

  async function handleApprove(id: string) {
    setLoading(id)
    await supabase.from('profiles').update({ approved: true }).eq('id', id)
    setPartners(prev => prev.map(p => p.id === id ? { ...p, approved: true } : p))
    setLoading(null)
    router.refresh()
  }

  async function handleReject(id: string) {
    setLoading(id)
    await supabase.from('profiles').update({ approved: false }).eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
    setLoading(null)
    router.refresh()
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-sm font-semibold text-slate-700">Gaida apstiprinājumu</h2>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-200">
              {pending.length}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden divide-y divide-amber-100">
            {pending.map(partner => (
              <div key={partner.id} className="flex items-center justify-between px-5 py-4 bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                    {getInitials(partner.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reģistrējās {new Date(partner.created_at).toLocaleDateString('lv-LV', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {partner.topics.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {partner.topics.map(t => (
                          <span key={t} className="text-xs bg-white text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(partner.id)}
                    disabled={loading === partner.id}
                    className="text-xs bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    {loading === partner.id ? '...' : 'Apstiprināt'}
                  </button>
                  <button
                    onClick={() => handleReject(partner.id)}
                    disabled={loading === partner.id}
                    className="text-xs bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-semibold px-3.5 py-2 rounded-xl border border-red-200 transition-colors"
                  >
                    Noraidīt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-700">Aktīvie partneri</h2>
          <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
            {approved.length}
          </span>
        </div>

        {approved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-10 text-center shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-slate-600 font-semibold text-sm mb-1">Nav apstiprinātu partneru</p>
            <p className="text-slate-400 text-xs">Apstipriniet partneru pieteikumus augstāk</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {approved.map(partner => (
              <div key={partner.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {getInitials(partner.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{partner.name}</p>
                    {partner.topics.length > 0 ? (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {partner.topics.slice(0, 4).map(t => (
                          <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{t}</span>
                        ))}
                        {partner.topics.length > 4 && (
                          <span className="text-xs text-slate-400">+{partner.topics.length - 4}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-0.5">Nav izvēlētas tēmas</p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Aktīvs
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
