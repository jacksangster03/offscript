import { redirect } from 'next/navigation'
import { AppNav } from '@/components/dashboard/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    redirect('/sign-in')
  }

  const { createClient } = await import('@/lib/supabase/server')
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
