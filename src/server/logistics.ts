import 'server-only'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { gearClaims, gearItems, members, rideRiders, rides } from '@/db/schema'

// ---------------------------------------------------------------------------
// Shared gear
// ---------------------------------------------------------------------------

export const DEFAULT_GEAR = ['Stove + fuel', 'Water filter', 'Bear canister', 'Tent', 'First aid kit', 'Satellite messenger', 'Water purification tabs', 'Group cook pot']

export async function listGear(tripId: string) {
  const items = await db.select().from(gearItems).where(eq(gearItems.tripYearId, tripId)).orderBy(asc(gearItems.createdAt))
  const claims = await db
    .select({ gearItemId: gearClaims.gearItemId, memberId: gearClaims.memberId, quantity: gearClaims.quantity, name: members.name })
    .from(gearClaims)
    .innerJoin(members, eq(members.id, gearClaims.memberId))
    .innerJoin(gearItems, eq(gearItems.id, gearClaims.gearItemId))
    .where(eq(gearItems.tripYearId, tripId))
  return items.map((item) => {
    const itemClaims = claims.filter((c) => c.gearItemId === item.id)
    const have = itemClaims.reduce((n, c) => n + c.quantity, 0)
    return { ...item, claims: itemClaims, have, short: Math.max(0, item.quantityNeeded - have) }
  })
}

export async function addGearItem(tripId: string, name: string, quantityNeeded = 1) {
  const clean = name.trim().slice(0, 100)
  if (!clean) throw new Error('Name the item')
  await db.insert(gearItems).values({ tripYearId: tripId, name: clean, quantityNeeded: Math.max(1, Math.min(20, quantityNeeded)) })
}

export async function seedDefaultGear(tripId: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(gearItems).where(eq(gearItems.tripYearId, tripId))
  if (n > 0) return
  await db.insert(gearItems).values(DEFAULT_GEAR.map((name) => ({ tripYearId: tripId, name })))
}

export async function removeGearItem(tripId: string, itemId: string) {
  await db.delete(gearItems).where(and(eq(gearItems.id, itemId), eq(gearItems.tripYearId, tripId)))
}

export async function setGearClaim(memberId: string, itemId: string, quantity: number) {
  if (quantity <= 0) {
    await db.delete(gearClaims).where(and(eq(gearClaims.gearItemId, itemId), eq(gearClaims.memberId, memberId)))
    return
  }
  await db
    .insert(gearClaims)
    .values({ gearItemId: itemId, memberId, quantity })
    .onConflictDoUpdate({ target: [gearClaims.gearItemId, gearClaims.memberId], set: { quantity } })
}

// ---------------------------------------------------------------------------
// Rides
// ---------------------------------------------------------------------------

export async function listRides(tripId: string) {
  const all = await db
    .select({ ride: rides, driverName: members.name })
    .from(rides)
    .innerJoin(members, eq(members.id, rides.driverId))
    .where(eq(rides.tripYearId, tripId))
    .orderBy(asc(rides.createdAt))
  const riders = await db
    .select({ rideId: rideRiders.rideId, memberId: rideRiders.memberId, name: members.name })
    .from(rideRiders)
    .innerJoin(members, eq(members.id, rideRiders.memberId))
    .innerJoin(rides, eq(rides.id, rideRiders.rideId))
    .where(eq(rides.tripYearId, tripId))
  return all.map(({ ride, driverName }) => {
    const r = riders.filter((x) => x.rideId === ride.id)
    return { ...ride, driverName, riders: r, seatsLeft: ride.seats - r.length }
  })
}

export async function offerRide(memberId: string, tripId: string, input: { seats: number; departureCity?: string | null; departureTime?: string | null; notes?: string | null }) {
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 8) throw new Error('Seats must be between 1 and 8')
  const [existing] = await db.select().from(rides).where(and(eq(rides.tripYearId, tripId), eq(rides.driverId, memberId)))
  const values = { seats: input.seats, departureCity: input.departureCity?.trim() || null, departureTime: input.departureTime?.trim() || null, notes: input.notes?.trim() || null }
  if (existing) await db.update(rides).set(values).where(eq(rides.id, existing.id))
  else await db.insert(rides).values({ ...values, tripYearId: tripId, driverId: memberId })
}

export async function cancelRide(memberId: string, rideId: string) {
  await db.delete(rides).where(and(eq(rides.id, rideId), eq(rides.driverId, memberId)))
}

/** Take a seat (leaving any other car first), or leave this one. */
export async function setRiding(memberId: string, tripId: string, rideId: string, on: boolean) {
  const all = await listRides(tripId)
  const ride = all.find((r) => r.id === rideId)
  if (!ride) throw new Error('That ride no longer exists')
  if (!on) {
    await db.delete(rideRiders).where(and(eq(rideRiders.rideId, rideId), eq(rideRiders.memberId, memberId)))
    return
  }
  if (ride.driverId === memberId) throw new Error("You're driving this car")
  if (ride.seatsLeft <= 0 && !ride.riders.some((r) => r.memberId === memberId)) throw new Error('That car is full')
  for (const r of all) {
    if (r.riders.some((x) => x.memberId === memberId)) {
      await db.delete(rideRiders).where(and(eq(rideRiders.rideId, r.id), eq(rideRiders.memberId, memberId)))
    }
  }
  await db.insert(rideRiders).values({ rideId, memberId })
}
