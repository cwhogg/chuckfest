import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { members, pastTripAttendees, pastTrips, sites } from '@/db/schema'

export async function listPastTrips() {
  const trips = await db
    .select({ trip: pastTrips, siteName: sites.name, siteLat: sites.latitude, siteLng: sites.longitude })
    .from(pastTrips)
    .leftJoin(sites, eq(sites.id, pastTrips.siteId))
    .orderBy(desc(pastTrips.year))
  const attendees = await db
    .select({ pastTripId: pastTripAttendees.pastTripId, memberId: members.id, name: members.name })
    .from(pastTripAttendees)
    .innerJoin(members, eq(members.id, pastTripAttendees.memberId))
    .orderBy(asc(members.name))
  return trips.map((t) => ({ ...t, attendees: attendees.filter((a) => a.pastTripId === t.trip.id) }))
}

export type MemberStats = { memberId: string; name: string; trips: number; miles: number; gainFt: number; years: number[]; streak: number }

/** Per-member totals across all past trips; streak = consecutive years up to their latest trip. */
export function memberStats(trips: Awaited<ReturnType<typeof listPastTrips>>): MemberStats[] {
  const byMember = new Map<string, MemberStats>()
  for (const t of trips) {
    for (const a of t.attendees) {
      const s = byMember.get(a.memberId) ?? { memberId: a.memberId, name: a.name, trips: 0, miles: 0, gainFt: 0, years: [], streak: 0 }
      s.trips += 1
      // Round trip: hike in and out.
      s.miles += (t.trip.hikeMiles ?? 0) * 2
      s.gainFt += t.trip.elevationGainFt ?? 0
      s.years.push(t.trip.year)
      byMember.set(a.memberId, s)
    }
  }
  for (const s of byMember.values()) {
    const years = new Set(s.years)
    let y = Math.max(...s.years)
    while (years.has(y)) {
      s.streak++
      y--
    }
    s.years.sort((a, b) => a - b)
    s.miles = Math.round(s.miles * 10) / 10
  }
  return [...byMember.values()].sort((a, b) => b.trips - a.trips || b.miles - a.miles || a.name.localeCompare(b.name))
}

export type PastTripInput = Omit<typeof pastTrips.$inferInsert, 'id' | 'createdAt' | 'legacyId'>

export async function savePastTrip(id: string | null, input: PastTripInput, attendeeIds: string[]) {
  const tripId = id
    ? (await db.update(pastTrips).set(input).where(eq(pastTrips.id, id)).returning())[0]?.id
    : (await db.insert(pastTrips).values(input).returning())[0].id
  if (!tripId) throw new Error('Unknown trip')
  await db.delete(pastTripAttendees).where(eq(pastTripAttendees.pastTripId, tripId))
  if (attendeeIds.length) await db.insert(pastTripAttendees).values(attendeeIds.map((memberId) => ({ pastTripId: tripId, memberId })))
  return tripId
}

export async function deletePastTrip(id: string) {
  await db.delete(pastTrips).where(eq(pastTrips.id, id))
}
