import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { TaskForm } from '@/components/TaskForm'
import { Container } from '@/components/ui/container'

export default async function NewTaskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const [{ data: topics }, { data: partners }] = await Promise.all([
    supabase.from('topics').select('*').order('name'),
    supabase.from('profiles').select('*').eq('role', 'partner').eq('approved', true).order('name'),
  ])

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <NavBar profile={profile} />
      <main className="py-6 sm:py-10">
        <Container size="narrow">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-display text-slate-900">Jauns uzdevums</h1>
            <p className="text-sm text-slate-500 mt-1">Izveidojiet un izsūtiet uzdevumu partneriem</p>
          </div>
          <TaskForm topics={topics ?? []} partners={partners ?? []} />
        </Container>
      </main>
    </div>
  )
}
