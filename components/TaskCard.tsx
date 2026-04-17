'use client'

import Link from 'next/link'
import { CheckmarkIcon } from '@/components/CheckmarkIcon'
import type { Profile, TaskWithRecipients } from '@/lib/types'

function formatAmount(amount: number) {
  return new Intl.NumberFormat('lv-LV', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Vakar'
  if (diffDays < 7) return date.toLocaleDateString('lv-LV', { weekday: 'short' })
  return date.toLocaleDateString('lv-LV', { day: 'numeric', month: 'short' })
}

const STATUS_CONFIG = {
  draft: { label: 'Melnraksts', className: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  sent: { label: 'Izsūtīts', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  assigned: { label: 'Piešķirts', className: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-400' },
} as const

export function TaskCard({ task, profile }: { task: TaskWithRecipients; profile: Profile }) {
  const recipients = task.task_recipients ?? []
  const totalRecipients = recipients.length
  const openedCount = recipients.filter(r => r.opened_at).length
  const repliedCount = recipients.filter(r => r.replied_at).length

  const myRecipient = profile.role === 'partner'
    ? recipients.find(r => r.partner_id === profile.id)
    : null

  const allOpened = totalRecipients > 0 && openedCount === totalRecipients
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.draft

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-150 overflow-hidden">
        <div className="flex">
          {/* Left status accent bar */}
          <div className={`w-1 shrink-0 ${
            task.status === 'draft' ? 'bg-amber-400' :
            task.status === 'sent' ? 'bg-emerald-400' : 'bg-blue-400'
          }`} />

          <div className="flex-1 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              {/* Left content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-semibold text-slate-900 text-[15px] truncate leading-snug group-hover:text-slate-700 transition-colors">
                    {task.title}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${status.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                {task.description && (
                  <p className="text-sm text-slate-500 truncate leading-relaxed mb-2.5">
                    {task.description}
                  </p>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  {task.categories.slice(0, 3).map(cat => (
                    <span key={cat} className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      {cat}
                    </span>
                  ))}
                  {task.categories.length > 3 && (
                    <span className="text-xs text-slate-400">+{task.categories.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Right content */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-bold text-slate-900 text-base tabular-nums">
                  {formatAmount(task.amount)}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {formatDate(task.created_at)}
                </span>

                {/* Read receipts */}
                <div className="flex items-center gap-1.5">
                  {profile.role === 'admin' ? (
                    totalRecipients > 0 ? (
                      <>
                        <CheckmarkIcon opened={allOpened} />
                        <span className="text-xs text-slate-400 tabular-nums">
                          {openedCount}/{totalRecipients}
                          {repliedCount > 0 && (
                            <span className="text-emerald-600 ml-1">· {repliedCount} atb.</span>
                          )}
                        </span>
                      </>
                    ) : null
                  ) : (
                    myRecipient && <CheckmarkIcon opened={!!myRecipient.opened_at} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
