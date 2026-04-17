import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { PartnerList } from '@/components/PartnerList'

export default async function PartnersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: partners } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'partner')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar profile={profile} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Partneri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pārvaldiet partneru pieteikumus un aktīvos sadarbības partnerus
          </p>
        </div>
        <PartnerList partners={partners ?? []} />
      </main>
    </div>
  )
}
