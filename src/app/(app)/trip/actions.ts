'use server'

import { revalidatePath } from 'next/cache'
import { ATTENDANCE, type Attendance } from '@/db/schema'
import { memberOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import { getActiveTrip, setAttendance } from '@/server/trips'
import { addComment } from '@/server/sites'
import { addGearItem, cancelRide, offerRide, setGearClaim, setRiding } from '@/server/logistics'

async function ctx() {
  const member = await memberOrThrow()
  const trip = await getActiveTrip()
  if (!trip) throw new Error('No trip is being planned')
  return { member, trip }
}

const done = () => {
  revalidatePath('/trip')
  revalidatePath('/')
}

export async function setMyAttendance(status: Attendance) {
  return attempt(async () => {
    if (!ATTENDANCE.includes(status)) throw new Error('Unknown answer')
    const { member, trip } = await ctx()
    await setAttendance(member.id, trip.id, status)
    done()
  })
}

export async function claimGear(itemId: string, quantity: number) {
  return attempt(async () => {
    const { member } = await ctx()
    await setGearClaim(member.id, itemId, Math.max(0, Math.min(10, Math.round(quantity))))
    done()
  })
}

export async function suggestGear(formData: FormData) {
  return attempt(async () => {
    const { trip } = await ctx()
    await addGearItem(trip.id, String(formData.get('name') ?? ''), Number(formData.get('quantity') ?? 1) || 1)
    done()
  })
}

export async function saveRide(formData: FormData) {
  return attempt(async () => {
    const { member, trip } = await ctx()
    await offerRide(member.id, trip.id, {
      seats: Number(formData.get('seats')),
      departureCity: String(formData.get('departureCity') ?? ''),
      departureTime: String(formData.get('departureTime') ?? ''),
      notes: String(formData.get('notes') ?? ''),
    })
    done()
  })
}

export async function dropRide(rideId: string) {
  return attempt(async () => {
    const { member } = await ctx()
    await cancelRide(member.id, rideId)
    done()
  })
}

export async function toggleSeat(rideId: string, on: boolean) {
  return attempt(async () => {
    const { member, trip } = await ctx()
    await setRiding(member.id, trip.id, rideId, on)
    done()
  })
}

export async function postTripComment(formData: FormData) {
  return attempt(async () => {
    const { member, trip } = await ctx()
    await addComment(member.id, { tripYearId: trip.id }, String(formData.get('body') ?? ''))
    revalidatePath('/trip')
  })
}
