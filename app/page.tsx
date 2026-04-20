import Link from 'next/link'
import { cn } from '@/components/ui/cn'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">OS</span>
            </div>
            <span className="font-semibold text-text-primary text-sm tracking-tight">OffScript</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="h-8 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/6 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
            Train the ability to speak under uncertainty
          </div>

          <h1 className="text-5xl sm:text-6xl font-light text-text-primary leading-tight tracking-tight text-balance">
            Stop freezing.
            <br />
            <span className="text-accent">Keep speaking.</span>
          </h1>

          <p className="mt-6 text-lg text-text-secondary max-w-xl mx-auto leading-relaxed text-balance">
            OffScript trains the exact skill most speaking apps ignore: what to do when you blank, lose your place, or
            run out of words.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/sign-up"
              className="h-12 px-7 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all hover:shadow-glow-accent inline-flex items-center gap-2"
            >
              Start training free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/sign-in"
              className="h-12 px-6 text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong rounded-xl transition-all text-sm inline-flex items-center"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-xs text-text-muted">No credit card. 60-second first drill.</p>
        </div>
      </section>

      {/* Before / After */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-light text-text-primary mb-12 tracking-tight">
            The transformation OffScript trains
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <BeforeAfterCard
              label="Before"
              items={[
                '"I need a perfect script."',
                '"I blanked and could not recover."',
                '"I froze on an unfamiliar topic."',
                '"I rely on memorised wording."',
              ]}
              type="before"
            />
            <BeforeAfterCard
              label="After"
              items={[
                '"I can handle not knowing what comes next."',
                '"I used a bridge phrase and kept going."',
                '"I structured a response in real time."',
                '"I completed the answer even when uncertain."',
              ]}
              type="after"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-light text-text-primary mb-12 tracking-tight">
            One drill. Real analysis. Specific coaching.
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Random unfamiliar prompt',
                desc: '100+ curated topics across difficulty levels — nothing you can memorise in advance.',
              },
              {
                step: '02',
                title: '20s prep. 60s live.',
                desc: 'A focused format that mirrors real pressure. No script. Just you and the clock.',
              },
              {
                step: '03',
                title: 'Freeze Resilience Score',
                desc: 'Our signature metric measures how well you handle uncertainty — not just polish.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
                <p className="text-xs font-mono text-accent/60 mb-3">{step}</p>
                <h3 className="text-base font-medium text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section className="px-6 py-20 bg-bg-surface border-y border-border-subtle">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-4">
            What makes this different
          </p>
          <p className="text-2xl sm:text-3xl font-light text-text-primary text-balance leading-relaxed">
            Most apps train you to sound better.
            <br />
            <span className="text-accent">OffScript trains you to keep going</span> when you do not know what to say next.
          </p>
          <p className="mt-6 text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
            Filler words and pace are secondary. The real skill is continuing coherently when you blank.
            That is what OffScript specifically measures and trains.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-light text-text-primary mb-4 tracking-tight">
            One drill, right now.
          </h2>
          <p className="text-text-secondary text-sm mb-8">
            60 seconds. A random unfamiliar topic. Real feedback on what to fix.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 h-12 px-8 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all hover:shadow-glow-accent"
          >
            Start your first drill
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-text-muted">
          <span>OffScript</span>
          <span>The goal is not to sound perfect. The goal is to keep going.</span>
        </div>
      </footer>
    </div>
  )
}

function BeforeAfterCard({
  label,
  items,
  type,
}: {
  label: string
  items: string[]
  type: 'before' | 'after'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 space-y-3',
        type === 'before'
          ? 'bg-bg-surface border-border-subtle'
          : 'bg-success/5 border-success/20'
      )}
    >
      <p
        className={cn(
          'text-[10px] font-medium uppercase tracking-widest mb-4',
          type === 'before' ? 'text-text-muted' : 'text-success'
        )}
      >
        {label}
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className={cn(
            'flex-shrink-0 mt-0.5',
            type === 'before' ? 'text-text-disabled' : 'text-success'
          )}>
            {type === 'before' ? '—' : '✓'}
          </span>
          <p className={cn(
            'text-sm',
            type === 'before' ? 'text-text-muted' : 'text-text-secondary'
          )}>
            {item}
          </p>
        </div>
      ))}
    </div>
  )
}
