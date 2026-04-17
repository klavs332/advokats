'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MessageWithSender, Profile, TaskRecipient } from '@/lib/types'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(d: string) {
  const date = new Date(d), today = new Date(), yday = new Date(today)
  yday.setDate(yday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Šodien'
  if (date.toDateString() === yday.toDateString()) return 'Vakar'
  return date.toLocaleDateString('lv-LV', { day: 'numeric', month: 'long' })
}

function groupByDate(msgs: MessageWithSender[]) {
  const groups: { date: string; messages: MessageWithSender[] }[] = []
  for (const msg of msgs) {
    const d = formatDay(msg.created_at)
    const last = groups[groups.length - 1]
    if (last?.date === d) last.messages.push(msg)
    else groups.push({ date: d, messages: [msg] })
  }
  return groups
}

function ReadReceipt({ message, recipients }: { message: MessageWithSender; recipients: (TaskRecipient & { profiles: Profile })[] }) {
  const seenCount = recipients.filter(r => r.opened_at && r.opened_at > message.created_at).length
  const color = seenCount > 0 ? '#10B981' : '#94A3B8'
  return (
    <span className="inline-flex items-center ml-1">
      {seenCount > 0 ? (
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
          <path d="M1 5.5L4.5 9L10 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 5.5L9.5 9L15 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
          <path d="M1 5.5L4.5 9L11 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  )
}

interface Props {
  taskId: string
  initialMessages: MessageWithSender[]
  profile: Profile
  recipients: (TaskRecipient & { profiles: Profile })[]
}

export function ChatThread({ taskId, initialMessages, profile, recipients }: Props) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${taskId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          const { data } = await supabase.from('messages').select('*, profiles(*)').eq('id', payload.new.id).single()
          if (data) setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data as MessageWithSender])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [taskId])

  const sendMessage = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      task_id: taskId,
      sender_id: profile.id,
      content: trimmed,
    })
    if (!error) {
      setContent('')
      if (profile.role === 'partner') {
        await supabase.from('task_recipients').update({ replied_at: new Date().toISOString() })
          .eq('task_id', taskId).eq('partner_id', profile.id).is('replied_at', null)
      }
    }
    setSending(false)
    textareaRef.current?.focus()
  }, [content, sending, taskId, profile])

  const groups = groupByDate(messages)
  const isAdmin = profile.role === 'admin'

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <h2 className="text-sm font-semibold text-slate-700">Sarakste</h2>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-slate-400 font-medium">{messages.length} ziņa{messages.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 min-h-64 max-h-[500px] bg-slate-50/50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm text-slate-400">Nav ziņu. Sāciet sarunu.</p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium bg-slate-50/50 px-2">{group.date}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-3">
              {group.messages.map(msg => {
                const isMe = msg.sender_id === profile.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[72%] ${isMe ? '' : 'flex gap-2.5 items-end'}`}>
                      {/* Avatar for others */}
                      {!isMe && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-1 ${
                          msg.profiles?.role === 'admin'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {msg.profiles?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        {!isMe && (
                          <p className="text-xs text-slate-400 mb-1 ml-1 font-medium">
                            {msg.profiles?.name}
                            {msg.profiles?.role === 'admin' && (
                              <span className="ml-1 text-amber-600">· Advokāts</span>
                            )}
                          </p>
                        )}

                        {/* Bubble */}
                        <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          isMe
                            ? 'bg-slate-950 text-white rounded-br-sm'
                            : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                        }`}>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                        </div>

                        {/* Time + read receipt */}
                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start ml-1'}`}>
                          <span className="text-[11px] text-slate-400">{formatTime(msg.created_at)}</span>
                          {isMe && isAdmin && (
                            <ReadReceipt message={msg} recipients={recipients} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-100 px-4 py-3 flex gap-2.5 items-end bg-white">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Rakstiet ziņu... (Enter = sūtīt)"
          rows={2}
          className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={!content.trim() || sending}
          className="shrink-0 h-10 w-10 flex items-center justify-center bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
        >
          {sending ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
