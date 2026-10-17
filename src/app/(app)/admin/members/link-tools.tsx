'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui'
import { getPersonalLink, resetPersonalLink } from './actions'

/** Reveal, copy, or replace a member's personal sign-in link. */
export function LinkTools({ memberId }: { memberId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  const run = (fn: typeof getPersonalLink) =>
    start(async () => {
      setMsg(null)
      const res = await fn(memberId)
      if (!res.ok) return setMsg(res.error)
      setLink(res.data ?? null)
      try {
        await navigator.clipboard.writeText(res.data ?? '')
        setMsg('Copied')
      } catch {
        setMsg(null)
      }
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => run(getPersonalLink)}>
        Copy sign-in link
      </Button>
      {confirming ? (
        <span className="inline-flex items-center gap-2 text-sm">
          Old link stops working.
          <Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => (setConfirming(false), run(resetPersonalLink))}>
            Replace
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </span>
      ) : (
        <Button type="button" size="sm" variant="quiet" disabled={pending} onClick={() => setConfirming(true)}>
          New link
        </Button>
      )}
      {msg && <span className="text-xs text-pine">{msg}</span>}
      {link && <input readOnly value={link} className="w-full rounded border border-line bg-paper px-2 py-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />}
    </div>
  )
}
