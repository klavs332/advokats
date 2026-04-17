import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { TopicManager } from '@/components/TopicManager'
import { Container } from '@/components/ui/container'

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
    <div className="min-h-screen bg-[var(--paper)]">
      <NavBar profile={profile} />
      <main className="py-6 sm:py-10">
        <Container size="narrow">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-display text-slate-900">Tēmu pārvaldība</h1>
            <p className="text-sm text-slate-500 mt-1">Pievienojiet vai dzēsiet uzdevumu kategorijas</p>
          </div>
          <TopicManager topics={topics ?? []} />
        </Container>
      </main>
    </div>
  )
}
