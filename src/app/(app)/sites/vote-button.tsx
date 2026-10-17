'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/components/ui'
import { toggleVote } from './actions'

export function VoteButton({
  siteId,
  voted,
  count,
  canVoteMore,
  locked,
  size = 'md',
}: {
  siteId: string
  voted: boolean
  count: number
  canVoteMore: boolean
  locked?: boolean
  size?: 'md' | 'lg'
}) {
  const [state, setState] = useOptimistic({ voted, count })
  const [, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const disabled = locked || (!state.voted && !canVoteMore)

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={state.voted}
        onClick={() =>
          start(async () => {
            setError(null)
            const next = !state.voted
            setState({ voted: next, count: state.count + (next ? 1 : -1) })
            const res = await toggleVote(siteId, next)
            if (!res.ok) setError(res.error)
          })
        }
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors disabled:opacity-50',
          size === 'lg' ? 'h-11 px-4 text-[15px]' : 'h-9 px-3 text-sm',
          state.voted ? 'border-pine bg-pine text-card' : 'border-line bg-card text-ink hover:bg-pine-soft',
        )}
      >
        {state.voted ? <Check size={16} /> : <Plus size={16} />}
        {state.voted ? 'Voted' : 'Vote'}
        <span className={cn('ml-0.5 rounded-full px-1.5 text-xs', state.voted ? 'bg-card/20' : 'bg-paper')}>{state.count}</span>
      </button>
      {error && <p className="max-w-48 text-right text-xs text-ember">{error}</p>}
    </div>
  )
}
