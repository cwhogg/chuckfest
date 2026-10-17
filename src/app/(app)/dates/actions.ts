'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { dateOptions, DATE_RESPONSES, type DateResponse } from '@/db/schema'
import { adminOrThrow, memberOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { getActiveTrip, lockDates, setDateResponse, unlockDates } from '@/server/trips'

export async function respondToDate(dateOptionId: string, status: DateResponse) {
  return attempt(async () => {
    const member = await memberOrThrow()
    if (!DATE_RESPONSES.includes(status)) throw new Error('Unknown answer')
    const trip = await getActiveTrip()
    const [option] = await db
      .select({ id: dateOptions.id })
      .from(dateOptions)
      .where(and(eq(dateOptions.id, dateOptionId), eq(dateOptions.tripYearId, trip?.id ?? '')))
    if (!option) throw new Error('That date option no longer exists')
    if (trip?.startDate) throw new Error('Dates are already locked')
    await setDateResponse(member.id, dateOptionId, status)
    revalidatePath('/dates')
    revalidatePath('/')
  })
}

export async function lockDateOption(dateOptionId: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const trip = await getActiveTrip()
    if (!trip) throw new Error('No active trip')
    await lockDates(admin.id, trip.id, dateOptionId)
    revalidatePath('/', 'layout')
  })
}

export async function unlockTripDates() {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const trip = await getActiveTrip()
    if (!trip) throw new Error('No active trip')
    await unlockDates(admin.id, trip.id)
    revalidatePath('/', 'layout')
  })
}
