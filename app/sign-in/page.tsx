'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isSupabaseConfigured()) {
    return (
      <AuthLayout title="Setup required">
        <SetupCard />
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <AuthLayout title="Welcome back">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="••••••••"
            required
            className="auth-input"
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="text-sm text-text-muted text-center">
        No account?{' '}
        <Link href="/sign-up" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}

function SetupCard() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 bg-warning/5 border border-warning/20 rounded-xl">
        <span className="text-warning mt-0.5 flex-shrink-0">⚠</span>
        <div>
          <p className="text-sm font-medium text-text-primary">Supabase not configured</p>
          <p className="text-xs text-text-muted mt-1">
            Add your project credentials to <code className="text-accent bg-bg-base px-1 py-0.5 rounded">.env.local</code> to enable auth.
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <Step n={1} text="Create a free project at supabase.com" />
        <Step n={2} text="Copy your URL and anon key from Project Settings → API" />
        <Step n={3} text="Paste them into .env.local in the project root" />
        <Step n={4} text="Run the migration: supabase/migrations/001_initial.sql" />
        <Step n={5} text="Seed the prompts: supabase/seed.sql" />
        <Step n={6} text="Restart the dev server: npm run dev" />
      </div>

      <div className="p-4 bg-bg-base border border-border-subtle rounded-xl font-mono text-xs text-text-secondary space-y-1.5 leading-relaxed">
        <p className="text-text-muted"># .env.local</p>
        <p><span className="text-accent">NEXT_PUBLIC_SUPABASE_URL</span>=https://xxx.supabase.co</p>
        <p><span className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=eyJhbGc...</p>
        <p><span className="text-accent">SUPABASE_SERVICE_ROLE_KEY</span>=eyJhbGc...</p>
        <p className="text-text-muted"># Optional — leave blank for mock mode</p>
        <p><span className="text-accent">OPENAI_API_KEY</span>=sk-proj-...</p>
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-text-secondary">{text}</p>
    </div>
  )
}

function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
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
        </div>

        <div className="bg-bg-elevated border border-border-default rounded-2xl p-7 shadow-elevated">
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
