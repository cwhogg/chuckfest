'use client'

import { useOptimistic, useState, useTransition } from 'react'
import type { DateResponse } from '@/db/schema'
import { cn } from '@/components/ui'
import { respondToDate } from './actions'

const CHOICES: { value: DateResponse; label: string; on: string }[] = [
  { value: 'yes', label: 'Yes', on: 'bg-pine text-card border-pine' },
  { value: 'maybe', label: 'Maybe', on: 'bg-gold text-ink border-gold' },
  { value: 'no', label: 'No', on: 'bg-ember text-card border-ember' },
]

export function DateChoice({ optionId, mine, disabled }: { optionId: string; mine: DateResponse | null; disabled?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(mine)
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Your availability">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={optimistic === c.value}
            disabled={disabled}
            onClick={() =>
              start(async () => {
                setError(null)
                setOptimistic(c.value)
                const res = await respondToDate(optionId, c.value)
                if (!res.ok) setError(res.error)
              })
            }
            className={cn(
              'h-10 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60',
              optimistic === c.value ? c.on : 'border-line bg-card text-ink hover:bg-paper',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-ember">{error}</p>}
    </div>
  )
}
