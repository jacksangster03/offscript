'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function SignUpPage() {
  const router = useRouter()

  if (!isSupabaseConfigured()) {
    return (
      <AuthShell title="Setup required">
        <div className="space-y-3 text-sm text-text-secondary">
          <p>Supabase credentials are missing. Visit <Link href="/sign-in" className="text-accent hover:underline">sign in</Link> for setup instructions.</p>
        </div>
      </AuthShell>
    )
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Your name">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Alex"
            required
            className="auth-input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="auth-input"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="auth-input"
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>

        <p className="text-xs text-text-muted text-center">
          By signing up you agree to use this for training purposes only.
        </p>
      </form>

      <p className="text-sm text-text-muted text-center">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">OS</span>
            </div>
            <span className="font-semibold text-text-primary">OffScript</span>
          </Link>
          <h1 className="text-2xl font-light text-text-primary">{title}</h1>
          <p className="text-sm text-text-muted mt-1">Your first drill takes 90 seconds.</p>
        </div>

        <div className="bg-bg-elevated border border-border-default rounded-2xl p-7 space-y-5 shadow-elevated">
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-secondary">{label}</label>
      {children}
    </div>
  )
}
