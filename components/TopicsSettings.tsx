'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { Topic } from '@/lib/types'

export function TopicsSettings({ topics, currentTopics }: { topics: Topic[]; currentTopics: string[] }) {
  const [selected, setSelected] = useState<string[]>(currentTopics)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  function toggle(name: string) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ topics: selected }).eq('id', user.id)
    }
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex flex-wrap gap-2 mb-6">
        {topics.map(topic => (
          <button
            key={topic.id}
            type="button"
            onClick={() => toggle(topic.name)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              selected.includes(topic.name)
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {topic.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saglabā...' : 'Saglabāt'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Saglabāts!</span>
        )}
        {selected.length > 0 && (
          <span className="text-sm text-gray-400">Izvēlētas: {selected.length} tēmas</span>
        )}
      </div>
    </div>
  )
}
