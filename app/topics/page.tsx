import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { TopicManager } from '@/components/TopicManager'

export default async function TopicsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: topics } = await supabase
    .from('topics')
    .select('*')
    .order('name')

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Tēmu pārvaldība</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pievienojiet vai dzēsiet uzdevumu kategorijas</p>
        </div>
        <TopicManager topics={topics ?? []} />
      </main>
    </div>
  )
}
