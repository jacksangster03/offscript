'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

interface AppNavProps {
  userId: string
  email: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/curiosity', label: 'Curiosity' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings', label: 'Settings' },
]

export function AppNav({ email }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-bg-base/90 backdrop-blur-xl h-14">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">OS</span>
            </div>
            <span className="font-semibold text-text-primary text-sm">OffScript</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-bg-elevated text-text-primary'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-surface'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted hidden sm:block">{email}</span>
          <button
            onClick={signOut}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1"
          >
            {email === 'demo@offscript.app' ? 'Exit demo' : 'Sign out'}
          </button>
        </div>
      </div>
    </header>
  )
}
