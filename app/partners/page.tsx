import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { PartnerList } from '@/components/PartnerList'
import { Container } from '@/components/ui/container'

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
    <div className="min-h-screen bg-[var(--paper)]">
      <NavBar profile={profile} />
      <main className="py-6 sm:py-10">
        <Container>
          <div className="mb-6 sm:mb-8">
            <h1 className="text-display text-slate-900">Partneri</h1>
            <p className="text-sm text-slate-500 mt-1">
              Pārvaldiet partneru pieteikumus un aktīvos sadarbības partnerus
            </p>
          </div>
          <PartnerList partners={partners ?? []} />
        </Container>
      </main>
    </div>
  )
}
