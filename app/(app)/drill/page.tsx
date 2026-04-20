'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DrillSession } from '@/components/drill/DrillSession'
import { PromptCard } from '@/components/drill/PromptCard'
import type { Prompt, DrillMode, Session } from '@/types'
import { createClient } from '@/lib/supabase/client'

function DrillPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') ?? 'daily') as DrillMode
  const retrySessionId = searchParams.get('retry')

  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function bootstrap() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/sign-in'); return }

        let fetchedPrompt: Prompt

        if (retrySessionId) {
          // Retry: fetch the same prompt from the original session
          const { data: originalSession } = await supabase
            .from('sessions')
            .select('*, prompts(*)')
            .eq('id', retrySessionId)
            .single()

          if (!originalSession?.prompts) throw new Error('Original session not found')
          fetchedPrompt = originalSession.prompts as Prompt
        } else {
          // Fetch a random prompt
          const res = await fetch(`/api/prompts?mode=${mode}`)
          if (!res.ok) throw new Error('Failed to load prompt')
          fetchedPrompt = await res.json()
        }

        setPrompt(fetchedPrompt)

        // Create session
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promptId: fetchedPrompt.id,
            mode,
            difficulty: fetchedPrompt.difficulty,
          }),
        })

        if (!sessionRes.ok) throw new Error('Failed to create session')
        const newSession = await sessionRes.json()
        setSession(newSession)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [mode, retrySessionId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border border-border-default animate-spin border-t-accent" />
          </div>
          <p className="text-sm text-text-muted">Loading prompt…</p>
        </div>
      </div>
    )
  }

  if (error || !prompt || !session) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-danger text-sm">{error ?? 'Failed to load drill'}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>
        <span className="text-xs text-text-muted capitalize">{mode} mode</span>
      </div>

      <DrillSession
        sessionId={session.id}
        prompt={prompt}
        attemptNumber={1}
        retryMode={!!retrySessionId}
      />
    </div>
  )
}

export default function DrillPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32"><p className="text-text-muted text-sm">Loading…</p></div>}>
      <DrillPageContent />
    </Suspense>
  )
}
