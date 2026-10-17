'use client'

import { useState, useTransition, type ReactNode } from 'react'
import type { ActionResult } from '@/server/result'
import { Button } from './ui'

/** A button that runs a server action, shows progress, and shows any error inline. */
export function ActionButton({
  action,
  children,
  pending,
  confirm,
  onDone,
  ...buttonProps
}: {
  action: () => Promise<ActionResult<unknown>>
  children: ReactNode
  pending?: ReactNode
  confirm?: string
  onDone?: () => void
} & Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'>) {
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [askConfirm, setAskConfirm] = useState(false)

  const run = () =>
    start(async () => {
      setError(null)
      setNote(null)
      setAskConfirm(false)
      const res = await action()
      if (!res.ok) setError(res.error)
      else {
        if (typeof res.data === 'string') setNote(res.data)
        onDone?.()
      }
    })

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {askConfirm ? (
        <span className="inline-flex items-center gap-2">
          <span className="text-sm text-ink">{confirm}</span>
          <Button size="sm" variant="danger" onClick={run} disabled={isPending}>
            Yes
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAskConfirm(false)}>
            No
          </Button>
        </span>
      ) : (
        <Button {...buttonProps} disabled={isPending || buttonProps.disabled} onClick={() => (confirm ? setAskConfirm(true) : run())}>
          {isPending && pending ? pending : children}
        </Button>
      )}
      {error && <span className="text-sm text-ember">{error}</span>}
      {note && <span className="text-sm text-muted">{note}</span>}
    </span>
  )
}
