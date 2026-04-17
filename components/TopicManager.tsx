'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Topic } from '@/lib/types'

export function TopicManager({ topics: initialTopics }: { topics: Topic[] }) {
  const [topics, setTopics] = useState(initialTopics)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return

    if (topics.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Šāda tēma jau eksistē')
      return
    }

    setLoading(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('topics')
      .insert({ name: trimmed })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    if (data) {
      setTopics(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setNewName('')
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Vai tiešām dzēst tēmu "${name}"?`)) return
    setDeleting(id)
    const { error: deleteError } = await supabase.from('topics').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(null)
      return
    }
    setTopics(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <h2 className="text-sm font-semibold text-slate-700">Pievienot tēmu</h2>
        </div>
        <form onSubmit={handleAdd} className="p-5 flex gap-3">
          <input
            value={newName}
            onChange={e => { setNewName(e.target.value); setError('') }}
            placeholder="Jaunas tēmas nosaukums..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm shrink-0"
          >
            {loading ? 'Pievieno...' : 'Pievienot'}
          </button>
        </form>
        {error && (
          <div className="mx-5 mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Topic list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Visas tēmas</h2>
          <span className="ml-auto bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">{topics.length}</span>
        </div>

        {topics.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <p className="text-slate-600 font-semibold text-sm">Nav tēmu</p>
            <p className="text-slate-400 text-xs mt-1">Pievienojiet pirmo tēmu augstāk</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topics.map(topic => (
              <div key={topic.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 group transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-slate-900">{topic.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(topic.id, topic.name)}
                  disabled={deleting === topic.id}
                  className="text-xs text-slate-300 hover:text-red-600 disabled:opacity-50 font-medium opacity-0 group-hover:opacity-100 transition-all px-2.5 py-1 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
                >
                  {deleting === topic.id ? '...' : 'Dzēst'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
