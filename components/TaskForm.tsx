'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Topic } from '@/lib/types'

interface Props {
  topics: Topic[]
  partners: Profile[]
}

export function TaskForm({ topics, partners }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPartners, setSelectedPartners] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const suggestedPartners = selectedCategories.length > 0
    ? partners.filter(p => p.topics.some(t => selectedCategories.includes(t)))
    : partners

  function toggleCategory(name: string) {
    setSelectedCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
  }

  function togglePartner(id: string) {
    setSelectedPartners(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedPartners(partners.map(p => p.id))
  }

  function deselectAll() {
    setSelectedPartners([])
  }

  async function handleSubmit(e: React.FormEvent, asDraft = false) {
    e.preventDefault()
    if (!title.trim()) { setError('Virsraksts ir obligāts'); return }
    if (!asDraft && selectedPartners.length === 0) { setError('Izvēlieties vismaz vienu partneri'); return }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Nav autorizācijas'); setLoading(false); return }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim(),
        amount: parseFloat(amount) || 0,
        categories: selectedCategories,
        created_by: user.id,
        status: asDraft ? 'draft' : 'sent',
      })
      .select()
      .single()

    if (taskError || !task) {
      setError(taskError?.message ?? 'Kļūda saglabājot')
      setLoading(false)
      return
    }

    if (!asDraft && selectedPartners.length > 0) {
      await supabase.from('task_recipients').insert(
        selectedPartners.map(partnerId => ({
          task_id: task.id,
          partner_id: partnerId,
        }))
      )
    }

    router.push(`/tasks/${task.id}`)
    router.refresh()
  }

  return (
    <form className="space-y-4">
      {/* Title & Description */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Uzdevuma informācija</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Virsraksts *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Uzdevuma nosaukums"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Apraksts</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalizēts uzdevuma apraksts, prasības, termiņi..."
              rows={5}
              className="w-full resize-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Budžets (€)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">€</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-48 pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-sm font-semibold text-slate-700">Kategorijas</span>
          {selectedCategories.length > 0 && (
            <span className="ml-auto bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-200">
              {selectedCategories.length} izvēlētas
            </span>
          )}
        </div>
        <div className="p-5">
          {topics.length === 0 ? (
            <p className="text-sm text-slate-400">Nav pieejamu kategoriju</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => {
                const selected = selectedCategories.includes(topic.name)
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleCategory(topic.name)}
                    className={`px-3.5 py-1.5 rounded-full text-sm border font-medium transition-all ${
                      selected
                        ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {selected && <span className="mr-1.5">✓</span>}
                    {topic.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Partners */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold text-slate-700">Partneri</span>
          {selectedCategories.length > 0 && (
            <span className="text-xs text-amber-600 font-medium ml-1">· ieteicamie atzīmēti</span>
          )}
          {partners.length > 0 && (
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">
                Visi ({partners.length})
              </button>
              {selectedPartners.length > 0 && (
                <button type="button" onClick={deselectAll} className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
                  Notīrīt
                </button>
              )}
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {partners.length === 0 && (
            <p className="text-sm text-slate-400 px-5 py-6 text-center">Nav apstiprinātu partneru</p>
          )}
          {partners.map(partner => {
            const isSuggested = suggestedPartners.includes(partner)
            const isSelected = selectedPartners.includes(partner.id)
            const initials = partner.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

            return (
              <button
                key={partner.id}
                type="button"
                onClick={() => togglePartner(partner.id)}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                  isSelected ? 'bg-slate-950' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {initials}
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {partner.name}
                    </span>
                    {isSuggested && selectedCategories.length > 0 && (
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isSelected ? 'bg-amber-400/30 text-amber-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        Ieteicams
                      </span>
                    )}
                    {partner.topics.length > 0 && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {partner.topics.slice(0, 2).join(', ')}{partner.topics.length > 2 ? ` +${partner.topics.length - 2}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                  isSelected ? 'bg-white border-white' : 'border-slate-300'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-slate-950" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {selectedPartners.length > 0 && (
          <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">
              Izvēlēti <span className="text-slate-900 font-bold">{selectedPartners.length}</span> no {partners.length} partneriem
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={e => handleSubmit(e, true)}
          disabled={loading}
          className="bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-200 text-slate-700 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors shadow-sm"
        >
          Saglabāt kā melnrakstu
        </button>
        <button
          type="button"
          onClick={e => handleSubmit(e, false)}
          disabled={loading}
          className="flex-1 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors shadow-sm"
        >
          {loading
            ? 'Sūta...'
            : selectedPartners.length > 0
              ? `Izsūtīt ${selectedPartners.length} partneriem`
              : 'Izsūtīt partneriem'
          }
        </button>
      </div>
    </form>
  )
}
