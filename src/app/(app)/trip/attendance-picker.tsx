'use client'

import { useOptimistic, useState, useTransition } from 'react'
import type { Attendance } from '@/db/schema'
import { cn } from '@/components/ui'
import { setMyAttendance } from './actions'

const OPTIONS: { value: Attendance; label: string; on: string }[] = [
  { value: 'in', label: "I'm in", on: 'bg-pine text-card border-pine' },
  { value: 'maybe', label: 'Maybe', on: 'bg-gold text-ink border-gold' },
  { value: 'out', label: "I'm out", on: 'bg-ember text-card border-ember' },
]

export function AttendancePicker({ current }: { current: Attendance | null }) {
  const [value, setValue] = useOptimistic(current)
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Are you going?">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() =>
              start(async () => {
                setError(null)
                setValue(o.value)
                const res = await setMyAttendance(o.value)
                if (!res.ok) setError(res.error)
              })
            }
            className={cn('h-12 rounded-xl border text-[15px] font-semibold', value === o.value ? o.on : 'border-line bg-card text-ink hover:bg-paper')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-ember">{error}</p>}
    </div>
  )
}
