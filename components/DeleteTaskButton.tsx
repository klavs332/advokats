'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DeleteTaskButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Vai tiešām dzēst uzdevumu "${taskTitle}"? Šī darbība ir neatgriezeniska.`)) return
    setLoading(true)
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      alert(`Kļūda dzēšot: ${error.message}`)
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-xs bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 font-semibold px-3 py-1.5 rounded-xl border border-red-200 transition-colors"
    >
      {loading ? '...' : 'Dzēst'}
    </button>
  )
}
