'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { members, permitWindows, PERMIT_OUTCOMES, type PermitOutcome } from '@/db/schema'
import { adminOrThrow, memberOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { getActiveTrip } from '@/server/trips'
import { addAttempt, deleteLottery, recordOutcome, removeAttempt, saveLottery, setVolunteer, syncPermitWindows } from '@/server/permits'

const done = () => {
  revalidatePath('/permits')
  revalidatePath('/')
}

async function activeTripId() {
  const trip = await getActiveTrip()
  if (!trip) throw new Error('No trip is being planned')
  return trip.id
}

export async function volunteer(on: boolean) {
  return attempt(async () => {
    const m = await memberOrThrow()
    await setVolunteer(m.id, await activeTripId(), on)
    done()
  })
}

export async function logOutcome(attemptId: string, outcome: PermitOutcome, formData?: FormData) {
  return attempt(async () => {
    const m = await memberOrThrow()
    if (!PERMIT_OUTCOMES.includes(outcome)) throw new Error('Unknown result')
    await recordOutcome(m, attemptId, outcome, formData ? String(formData.get('confirmation') ?? '') : null)
    done()
  })
}

export async function logPermitWin(attemptId: string, formData: FormData) {
  return logOutcome(attemptId, 'got_it', formData)
}

export async function syncWindows() {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const { skipped } = await syncPermitWindows(admin.id, await activeTripId())
    done()
    return skipped.length ? `No permit rules for: ${skipped.join(', ')}` : undefined
  })
}

export async function assignSlot(windowId: string, formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const tripId = await activeTripId()
    const [w] = await db.select().from(permitWindows).where(and(eq(permitWindows.id, windowId), eq(permitWindows.tripYearId, tripId)))
    if (!w) throw new Error('Unknown permit window')
    const memberId = String(formData.get('memberId') ?? '') || null
    if (memberId) {
      const [m] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId))
      if (!m) throw new Error('Unknown member')
    }
    await addAttempt(admin.id, windowId, memberId, String(formData.get('notes') ?? '') || null)
    done()
  })
}

export async function unassignSlot(attemptId: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    await removeAttempt(admin.id, attemptId)
    done()
  })
}

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null

export async function saveLotteryEntry(id: string | null, formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const result = txt(formData, 'result') as 'not_entered' | 'entered' | 'won' | 'lost' | null
    await saveLottery(
      admin.id,
      await activeTripId(),
      {
        lotteryName: txt(formData, 'lotteryName') ?? '',
        siteId: txt(formData, 'siteId'),
        memberId: txt(formData, 'memberId'),
        datesRequested: txt(formData, 'datesRequested'),
        closesOn: txt(formData, 'closesOn'),
        resultsOn: txt(formData, 'resultsOn'),
        result: result ?? 'entered',
        notes: txt(formData, 'notes'),
      },
      id ?? undefined,
    )
    done()
  })
}

export async function removeLotteryEntry(id: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    await deleteLottery(admin.id, id)
    done()
  })
}
