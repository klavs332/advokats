'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, MessageWithSender, Task } from '@/lib/types'

/* ─── helpers ─── */

function formatTime(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString('lv-LV', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Vakar'
  if (diffDays < 7) return date.toLocaleDateString('lv-LV', { weekday: 'short' })
  return date.toLocaleDateString('lv-LV', { day: 'numeric', month: 'short' })
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

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-[var(--brand)]',
  sent: 'bg-emerald-400',
  assigned: 'bg-blue-400',
}

/* ─── localStorage unread tracking ─── */

function getLastViewed(taskId: string): string | null {
  try { return localStorage.getItem(`chat_viewed_${taskId}`) } catch { return null }
}
function markViewed(taskId: string) {
  try { localStorage.setItem(`chat_viewed_${taskId}`, new Date().toISOString()) } catch { /* noop */ }
}

/* ─── types ─── */

interface TaskEntry {
  id: string
  title: string
  status: 'draft' | 'sent' | 'assigned'
}

interface Props {
  profile: Profile
  open: boolean
  onClose: () => void
}

/* ═══════════════════════════════════════ COMPONENT ═══════════════════════════════════════ */

export function ChatSidebar({ profile, open, onClose }: Props) {
  const supabase = createClient()

  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [allMessages, setAllMessages] = useState<MessageWithSender[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [, forceUpdate] = useState(0) // trigger re-render after markViewed
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* ── fetch initial data ── */
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)

      let taskIds: string[] = []
      let taskList: TaskEntry[] = []

      if (profile.role === 'admin') {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, status')
          .order('created_at', { ascending: false })
        taskList = (data ?? []) as TaskEntry[]
        taskIds = taskList.map(t => t.id)
      } else {
        // partner: only tasks they're a recipient of
        const { data: recs } = await supabase
          .from('task_recipients')
          .select('task_id')
          .eq('partner_id', profile.id)
        taskIds = (recs ?? []).map(r => r.task_id)
        if (taskIds.length > 0) {
          const { data } = await supabase
            .from('tasks')
            .select('id, title, status')
            .in('id', taskIds)
          taskList = (data ?? []) as TaskEntry[]
        }
      }

      if (cancelled) return
      setTasks(taskList)

      if (taskIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*, profiles(name, role, id)')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true })
        if (!cancelled) setAllMessages((msgs ?? []) as MessageWithSender[])
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [open, profile.id, profile.role])

  /* ── realtime subscription ── */
  useEffect(() => {
    if (!open) return

    const channel = supabase
      .channel('sidebar-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(name, role, id)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setAllMessages(prev =>
              prev.find(m => m.id === data.id) ? prev : [...prev, data as MessageWithSender]
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [open])

  /* ── scroll to bottom when chat opens / new messages ── */
  useEffect(() => {
    if (selectedTaskId) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [selectedTaskId, allMessages])

  /* ── open task chat ── */
  function openTask(taskId: string) {
    markViewed(taskId)
    setSelectedTaskId(taskId)
    forceUpdate(n => n + 1)
    setContent('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  /* ── back to list ── */
  function backToList() {
    if (selectedTaskId) markViewed(selectedTaskId)
    setSelectedTaskId(null)
    forceUpdate(n => n + 1)
  }

  /* ── send message ── */
  const sendMessage = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || sending || !selectedTaskId) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      task_id: selectedTaskId,
      sender_id: profile.id,
      content: trimmed,
    })
    if (!error) {
      setContent('')
      markViewed(selectedTaskId)
      if (profile.role === 'partner') {
        await supabase
          .from('task_recipients')
          .update({ replied_at: new Date().toISOString() })
          .eq('task_id', selectedTaskId)
          .eq('partner_id', profile.id)
          .is('replied_at', null)
      }
    }
    setSending(false)
  }, [content, sending, selectedTaskId, profile])

  /* ─── derived data ─── */

  const taskMessages = (taskId: string) =>
    allMessages.filter(m => m.task_id === taskId)

  const latestMessage = (taskId: string) => {
    const msgs = taskMessages(taskId)
    return msgs.length > 0 ? msgs[msgs.length - 1] : null
  }

  const unreadCount = (taskId: string) => {
    const lastViewed = getLastViewed(taskId)
    if (!lastViewed) return taskMessages(taskId).filter(m => m.sender_id !== profile.id).length
    return taskMessages(taskId).filter(
      m => m.created_at > lastViewed && m.sender_id !== profile.id
    ).length
  }

  const totalUnread = tasks.reduce((sum, t) => sum + unreadCount(t.id), 0)

  // sort tasks by latest message time (most recent first), tasks with no messages last
  const sortedTasks = [...tasks]
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const la = latestMessage(a.id)?.created_at ?? ''
      const lb = latestMessage(b.id)?.created_at ?? ''
      if (!la && !lb) return 0
      if (!la) return 1
      if (!lb) return -1
      return lb.localeCompare(la)
    })

  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const selectedMessages = selectedTaskId ? taskMessages(selectedTaskId) : []
  const groups = groupByDate(selectedMessages)

  /* ─── render ─── */

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-96 lg:w-[28rem] bg-white z-50 flex flex-col shadow-elevated border-l border-slate-200 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── CHAT LIST VIEW ── */}
        {!selectedTaskId && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Sarakste</span>
                {totalUnread > 0 && (
                  <span className="bg-[var(--brand)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b border-slate-100 shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Meklēt uzdevumus..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                />
              </div>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                </div>
              ) : sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Nav sarunu</p>
                  <p className="text-xs text-slate-400 mt-1">Uzdevumu sarakste parādīsies šeit</p>
                </div>
              ) : (
                sortedTasks.map(task => {
                  const latest = latestMessage(task.id)
                  const unread = unreadCount(task.id)
                  const msgCount = taskMessages(task.id).length

                  return (
                    <button
                      key={task.id}
                      onClick={() => openTask(task.id)}
                      className="w-full px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left group"
                    >
                      {/* Status dot + icon */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          unread > 0 ? 'bg-slate-950' : 'bg-slate-100 border border-slate-200'
                        }`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke={unread > 0 ? 'white' : '#94A3B8'}
                            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_DOT[task.status] ?? 'bg-slate-300'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {task.title}
                          </span>
                          {latest && (
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                              {formatTime(latest.created_at)}
                            </span>
                          )}
                        </div>
                        {latest ? (
                          <p className={`text-xs truncate ${unread > 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span className={`font-medium ${latest.sender_id === profile.id ? 'text-slate-400' : ''}`}>
                              {latest.sender_id === profile.id ? 'Jūs: ' : `${latest.profiles?.name?.split(' ')[0]}: `}
                            </span>
                            {latest.content}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-300 italic">Nav ziņu</p>
                        )}
                      </div>

                      {/* Unread badge */}
                      {unread > 0 && (
                        <span className="shrink-0 bg-[var(--brand)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none mt-1">
                          {unread}
                        </span>
                      )}
                      {unread === 0 && msgCount > 0 && (
                        <span className="shrink-0 text-[10px] text-slate-300 font-medium mt-1">
                          {msgCount}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* ── CHAT VIEW ── */}
        {selectedTaskId && selectedTask && (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 bg-white shrink-0">
              <button
                onClick={backToList}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{selectedTask.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selectedTask.status] ?? 'bg-slate-300'}`} />
                  <span className="text-[10px] text-slate-400 font-medium capitalize">
                    {selectedTask.status === 'draft' ? 'Melnraksts' : selectedTask.status === 'sent' ? 'Izsūtīts' : 'Piešķirts'}
                  </span>
                </div>
              </div>
              <Link
                href={`/tasks/${selectedTask.id}`}
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                title="Atvērt uzdevumu"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 bg-slate-50/40">
              {selectedMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 text-center">
                  <p className="text-xs text-slate-400">Nav ziņu. Sāciet sarunu.</p>
                </div>
              )}

              {groups.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-medium">{group.date}</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="space-y-2">
                    {group.messages.map(msg => {
                      const isMe = msg.sender_id === profile.id
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] ${isMe ? '' : 'flex gap-1.5 items-end'}`}>
                            {!isMe && (
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mb-0.5 ${
                                msg.profiles?.role === 'admin' ? 'bg-[var(--brand)] text-white' : 'bg-slate-300 text-slate-600'
                              }`}>
                                {msg.profiles?.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              {!isMe && (
                                <p className="text-[10px] text-slate-400 mb-0.5 ml-0.5 font-medium">
                                  {msg.profiles?.name?.split(' ')[0]}
                                  {msg.profiles?.role === 'admin' && <span className="text-[var(--brand)] ml-1">·</span>}
                                </p>
                              )}
                              <div className={`rounded-2xl px-3 py-1.5 text-xs shadow-sm ${
                                isMe
                                  ? 'bg-slate-950 text-white rounded-br-sm'
                                  : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                              }`}>
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                              </div>
                              <p className={`text-[10px] text-slate-400 mt-0.5 ${isMe ? 'text-right' : 'ml-0.5'}`}>
                                {formatTime(msg.created_at)}
                              </p>
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

            {/* Input */}
            <div className="border-t border-slate-100 px-3 py-2.5 flex gap-2 items-end bg-white shrink-0">
              <textarea
                ref={inputRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Rakstiet ziņu..."
                rows={2}
                className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all leading-relaxed"
              />
              <button
                onClick={sendMessage}
                disabled={!content.trim() || sending}
                className="w-8 h-8 flex items-center justify-center bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm shrink-0"
              >
                {sending ? (
                  <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
