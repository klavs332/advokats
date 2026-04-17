import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { TaskForm } from '@/components/TaskForm'

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const [{ data: task }, { data: recipients }, { data: topics }, { data: partners }] = await Promise.all([
    supabase.from('tasks').select('*').eq('id', id).single(),
    supabase.from('task_recipients').select('partner_id').eq('task_id', id),
    supabase.from('topics').select('*').order('name'),
    supabase.from('profiles').select('*').eq('role', 'partner').eq('approved', true).order('name'),
  ])

  if (!task) notFound()

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Rediģēt uzdevumu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Atjauniniet uzdevuma informāciju un saņēmējus</p>
        </div>
        <TaskForm
          topics={topics ?? []}
          partners={partners ?? []}
          task={task}
          existingRecipientIds={(recipients ?? []).map(r => r.partner_id)}
        />
      </main>
    </div>
  )
}
