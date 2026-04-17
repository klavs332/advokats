'use client'

import { useState } from 'react'
import { CheckmarkIcon } from '@/components/CheckmarkIcon'
import type { TaskRecipient, Profile } from '@/lib/types'

type RecipientWithProfile = TaskRecipient & { profiles: Profile }

function statusOrder(r: RecipientWithProfile) {
  if (r.replied_at) return 0
  if (r.opened_at) return 1
  return 2
}

export function PartnerStatusDropdown({ recipients }: { recipients: RecipientWithProfile[] }) {
  const [open, setOpen] = useState(false)

  const sorted = [...recipients].sort((a, b) => statusOrder(a) - statusOrder(b))
  const openedCount = recipients.filter(r => r.opened_at).length
  const repliedCount = recipients.filter(r => r.replied_at).length
  const allOpened = recipients.length > 0 && openedCount === recipients.length

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <CheckmarkIcon opened={allOpened} />
        <span className="font-medium">
          {openedCount}/{recipients.length} atvēruši
          {repliedCount > 0 && (
            <span className="text-emerald-600 ml-1">· {repliedCount} atbildēja</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {sorted.map(r => {
            const initials = r.profiles?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'
            return (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    r.replied_at ? 'bg-emerald-100 text-emerald-700' :
                    r.opened_at ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{r.profiles?.name}</span>
                  {r.replied_at && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                      Atbildēja
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckmarkIcon opened={!!r.opened_at} />
                  {r.opened_at && (
                    <span className="text-xs text-slate-400 tabular-nums">
                      {new Date(r.opened_at).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {!r.opened_at && (
                    <span className="text-xs text-slate-300">Nav atvēris</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
