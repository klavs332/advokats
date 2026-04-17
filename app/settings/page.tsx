import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavBar } from '@/components/NavBar'
import { PartnerProfileForm } from '@/components/PartnerProfileForm'
import { Container } from '@/components/ui/container'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: topics } = await supabase.from('topics').select('*').order('name')

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <NavBar profile={profile} />
      <main className="py-6 sm:py-10">
        <Container size="narrow">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-display text-slate-900">Mans profils</h1>
            <p className="text-sm text-slate-500 mt-1">Atjauniniet savu informāciju un specializācijas jomas</p>
          </div>
          <PartnerProfileForm profile={profile} topics={topics ?? []} />
        </Container>
      </main>
    </div>
  )
}
