'use client'

import { useSyncExternalStore } from 'react'

const TICK = 30_000

// A shared 30-second clock. Snapshots are rounded so repeated reads are stable.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK)
  return () => clearInterval(id)
}
const now = () => Math.floor(Date.now() / TICK) * TICK
const serverNow = () => null

function format(ms: number) {
  if (ms <= 0) return 'open now'
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `in ${d}d ${h}h`
  if (h > 0) return `in ${h}h ${m}m`
  return `in ${m}m`
}

/** "in 3d 4h", updated every 30 seconds. Renders nothing on the server to avoid hydration drift. */
export function Countdown({ to }: { to: string }) {
  const t = useSyncExternalStore(subscribe, now, serverNow)
  if (t == null) return null
  return <span>{format(new Date(to).getTime() - t)}</span>
}
