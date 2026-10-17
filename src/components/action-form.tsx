'use client'

import { useActionState, type ReactNode } from 'react'
import type { ActionResult } from '@/server/result'

/** A form bound to a server action that returns an ActionResult; shows errors and a saved note. */
export function ActionForm({
  action,
  children,
  className,
  successMessage = 'Saved',
}: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>
  children: ReactNode
  className?: string
  successMessage?: string | null
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionResult<unknown> | null, formData: FormData) => action(formData),
    null,
  )
  return (
    <form action={formAction} className={className} aria-busy={isPending}>
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
      {state && !state.ok && <p className="mt-2 text-sm text-ember">{state.error}</p>}
      {state?.ok && (typeof state.data === 'string' || successMessage) && (
        <p className="mt-2 text-sm text-pine">{typeof state.data === 'string' ? state.data : successMessage}</p>
      )}
    </form>
  )
}
