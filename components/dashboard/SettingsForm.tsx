'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { DrillMode, Difficulty } from '@/types'

interface SettingsFormProps {
  userId: string
  displayName: string
  preferredMode: DrillMode
  preferredDifficulty: Difficulty
}

export function SettingsForm({ userId, displayName, preferredMode, preferredDifficulty }: SettingsFormProps) {
  const supabase = createClient()
  const [name, setName] = useState(displayName)
  const [mode, setMode] = useState<DrillMode>(preferredMode)
  const [difficulty, setDifficulty] = useState<Difficulty>(preferredDifficulty)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('profiles').upsert({
      id: userId,
      display_name: name,
      preferred_mode: mode,
      preferred_difficulty: difficulty,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Profile</p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Display name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-9 px-3 bg-bg-base border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-all"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Preferences</p>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Default drill mode</label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'chaos', 'retry'] as DrillMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                  mode === m
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-bg-base border-border-default text-text-muted hover:border-border-strong'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-secondary">Default difficulty</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d as Difficulty)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  difficulty === d
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-bg-base border-border-default text-text-muted hover:border-border-strong'
                }`}
              >
                {d === 1 ? 'L1' : d === 2 ? 'L2' : d === 3 ? 'L3' : 'L4'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-muted">L1 familiar · L2 unfamiliar · L3 abstract · L4 pressure</p>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving} size="md">
          {saved ? 'Saved ✓' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
