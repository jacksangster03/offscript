import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/dashboard/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav userId={user.id} email={user.email ?? ''} />
      <main className="flex-1 pt-14">
        {children}
      </main>
    </div>
  )
}
