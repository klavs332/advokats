'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Topic } from '@/lib/types'

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Pieejams', description: 'Gatavs pieņemt jaunus uzdevumus', icon: '●', className: 'bg-emerald-50 border-emerald-300 text-emerald-700', dotColor: 'bg-emerald-400' },
  { value: 'busy', label: 'Aizņemts', description: 'Ierobežota pieejamība', icon: '●', className: 'bg-amber-50 border-amber-300 text-amber-700', dotColor: 'bg-amber-400' },
  { value: 'unavailable', label: 'Nav pieejams', description: 'Šobrīd nepieņemu uzdevumus', icon: '●', className: 'bg-red-50 border-red-300 text-red-700', dotColor: 'bg-red-400' },
]

export function PartnerProfileForm({ profile, topics }: { profile: Profile; topics: Topic[] }) {
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [experience, setExperience] = useState(profile.experience ?? '')
  const [hourlyRate, setHourlyRate] = useState(profile.hourly_rate?.toString() ?? '')
  const [availability, setAvailability] = useState(profile.availability ?? 'available')
  const [selectedTopics, setSelectedTopics] = useState<string[]>(profile.topics)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  function toggleTopic(name: string) {
    setSelectedTopics(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        name: name.trim(),
        bio: bio.trim() || null,
        experience: experience.trim() || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        availability: availability as Profile['availability'],
        topics: selectedTopics,
      }).eq('id', user.id)
    }
    setSaving(false)
    setSaved(true)
  }

  const selectedAvailOpt = AVAILABILITY_OPTIONS.find(o => o.value === availability)

  return (
    <form onSubmit={handleSave} className="space-y-5">

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Pamatinformācija</h2>
        </div>
        <div className="p-6 space-y-5">

          {/* Avatar row */}
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-bold text-white shadow-sm">
              {name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{name || 'Jūsu vārds'}</p>
              <p className="text-sm text-slate-500">Partneris</p>
              {selectedAvailOpt && (
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium border mt-1.5 ${selectedAvailOpt.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedAvailOpt.dotColor}`} />
                  {selectedAvailOpt.label}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Vārds Uzvārds *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setSaved(false) }}
              required
              placeholder="Juris Bērziņš"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Apraksts (bio)</label>
            <textarea
              value={bio}
              onChange={e => { setBio(e.target.value); setSaved(false) }}
              placeholder="Īss apraksts par jums, jūsu specializāciju un pieeju darbam..."
              rows={3}
              className="w-full resize-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Pieredze</label>
            <textarea
              value={experience}
              onChange={e => { setExperience(e.target.value); setSaved(false) }}
              placeholder="Darba pieredze, izglītība, sertifikāti..."
              rows={3}
              className="w-full resize-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Stundas likme (€/h)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={e => { setHourlyRate(e.target.value); setSaved(false) }}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-48 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-700">Pieejamība</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setAvailability(opt.value as 'available' | 'busy' | 'unavailable'); setSaved(false) }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  availability === opt.value
                    ? `${opt.className} shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full mb-2 ${availability === opt.value ? opt.dotColor : 'bg-slate-300'}`} />
                <p className={`text-sm font-semibold mb-0.5 ${availability === opt.value ? '' : 'text-slate-700'}`}>{opt.label}</p>
                <p className={`text-xs leading-snug ${availability === opt.value ? 'opacity-80' : 'text-slate-400'}`}>{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topics */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <h2 className="text-sm font-semibold text-slate-700">Specializācijas tēmas</h2>
          {selectedTopics.length > 0 && (
            <span className="ml-auto bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-amber-200">
              {selectedTopics.length} izvēlētas
            </span>
          )}
        </div>
        <div className="p-6">
          {topics.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nav pieejamu tēmu</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => {
                const selected = selectedTopics.includes(topic.name)
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.name)}
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

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          {saving ? 'Saglabā...' : 'Saglabāt izmaiņas'}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold">
            <svg width="14" height="14" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Saglabāts
          </div>
        )}
      </div>
    </form>
  )
}
