import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/dashboard/SettingsForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-light text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">{user.email}</p>
      </div>

      <SettingsForm
        userId={user.id}
        displayName={profile?.display_name ?? ''}
        preferredMode={profile?.preferred_mode ?? 'daily'}
        preferredDifficulty={profile?.preferred_difficulty ?? 1}
      />
    </div>
  )
}
