import 'server-only'
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  attendance,
  auditLog,
  blackoutDates,
  dateOptions,
  dateResponses,
  members,
  sites,
  siteVotes,
  tripBackupSites,
  tripYears,
  TRIP_STAGES,
  type DateResponse,
  type TripStage,
  type TripLogistics,
} from '@/db/schema'
import { generateWindows, rankWindows } from '@/lib/dates'

export type Trip = typeof tripYears.$inferSelect

export async function audit(memberId: string | null, action: string, details: Record<string, unknown> = {}) {
  await db.insert(auditLog).values({ memberId, action, details })
}

/** The trip being planned: the latest year that isn't archived, else the latest year. */
export async function getActiveTrip(): Promise<Trip | null> {
  const [open] = await db
    .select()
    .from(tripYears)
    .where(ne(tripYears.stage, 'archive'))
    .orderBy(desc(tripYears.year))
    .limit(1)
  if (open) return open
  const [latest] = await db.select().from(tripYears).orderBy(desc(tripYears.year)).limit(1)
  return latest ?? null
}

export async function getTrip(id: string): Promise<Trip | null> {
  const [trip] = await db.select().from(tripYears).where(eq(tripYears.id, id))
  return trip ?? null
}

export async function createTrip(actorId: string, year: number): Promise<Trip> {
  const [trip] = await db.insert(tripYears).values({ year }).returning()
  await audit(actorId, 'trip.create', { year })
  return trip
}

export async function setStage(actorId: string, tripId: string, stage: TripStage) {
  if (!TRIP_STAGES.includes(stage)) throw new Error('Unknown stage')
  await db.update(tripYears).set({ stage }).where(eq(tripYears.id, tripId))
  await audit(actorId, 'trip.stage', { tripId, stage })
}

export async function updateTripSettings(
  actorId: string,
  tripId: string,
  patch: Partial<Pick<Trip, 'datePollDeadline' | 'sitePollDeadline' | 'attendanceDeadline' | 'maxSiteVotes'>>,
) {
  await db.update(tripYears).set(patch).where(eq(tripYears.id, tripId))
  await audit(actorId, 'trip.settings', { tripId, ...patch })
}

export async function updateLogistics(actorId: string, tripId: string, logistics: TripLogistics) {
  await db.update(tripYears).set({ logistics }).where(eq(tripYears.id, tripId))
  await audit(actorId, 'trip.logistics', { tripId })
}

// ---------------------------------------------------------------------------
// Blackout dates
// ---------------------------------------------------------------------------

export async function listBlackouts() {
  return db.select().from(blackoutDates).orderBy(asc(blackoutDates.startDate))
}

export async function addBlackouts(actorId: string, ranges: { startDate: string; endDate: string; note?: string | null }[]) {
  const clean = ranges
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(r.endDate))
    .map((r) => (r.startDate <= r.endDate ? r : { ...r, startDate: r.endDate, endDate: r.startDate }))
  if (clean.length) await db.insert(blackoutDates).values(clean.map((r) => ({ ...r, note: r.note ?? null })))
  await audit(actorId, 'blackouts.add', { count: clean.length })
  return clean.length
}

export async function removeBlackout(actorId: string, id: string) {
  await db.delete(blackoutDates).where(eq(blackoutDates.id, id))
  await audit(actorId, 'blackouts.remove', { id })
}

// ---------------------------------------------------------------------------
// Date poll
// ---------------------------------------------------------------------------

export async function generateDateOptions(
  actorId: string,
  tripId: string,
  opts: { from: string; to: string; startWeekday: number; nights: number },
) {
  const blackouts = await listBlackouts()
  const windows = generateWindows(opts, blackouts)
  await db.delete(dateOptions).where(eq(dateOptions.tripYearId, tripId))
  if (windows.length) await db.insert(dateOptions).values(windows.map((w) => ({ ...w, tripYearId: tripId })))
  await audit(actorId, 'dates.generate', { tripId, ...opts, count: windows.length })
  return windows.length
}

export async function setDateResponse(memberId: string, dateOptionId: string, status: DateResponse) {
  await db
    .insert(dateResponses)
    .values({ memberId, dateOptionId, status })
    .onConflictDoUpdate({ target: [dateResponses.memberId, dateResponses.dateOptionId], set: { status } })
}

export async function getDatePoll(tripId: string, memberId: string) {
  const options = await db
    .select()
    .from(dateOptions)
    .where(eq(dateOptions.tripYearId, tripId))
    .orderBy(asc(dateOptions.startDate))
  const ids = options.map((o) => o.id)
  const responses = ids.length
    ? await db.select().from(dateResponses).where(inArray(dateResponses.dateOptionId, ids))
    : []
  const active = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.isActive, true)).orderBy(asc(members.name))

  const rows = options.map((o) => {
    const rs = responses.filter((r) => r.dateOptionId === o.id)
    const names = (s: DateResponse) => rs.filter((r) => r.status === s).map((r) => active.find((m) => m.id === r.memberId)?.name ?? '?')
    return {
      ...o,
      yes: rs.filter((r) => r.status === 'yes').length,
      maybe: rs.filter((r) => r.status === 'maybe').length,
      no: rs.filter((r) => r.status === 'no').length,
      yesNames: names('yes'),
      maybeNames: names('maybe'),
      noNames: names('no'),
      mine: rs.find((r) => r.memberId === memberId)?.status ?? null,
    }
  })
  const responded = new Set(responses.map((r) => r.memberId))
  return {
    options: rows,
    ranked: rankWindows(rows),
    missing: active.filter((m) => !responded.has(m.id)),
    memberCount: active.length,
  }
}

export async function lockDates(actorId: string, tripId: string, dateOptionId: string | null, manual?: { startDate: string; endDate: string }) {
  let range = manual
  if (dateOptionId) {
    const [o] = await db.select().from(dateOptions).where(and(eq(dateOptions.id, dateOptionId), eq(dateOptions.tripYearId, tripId)))
    if (!o) throw new Error('Unknown date option')
    range = { startDate: o.startDate, endDate: o.endDate }
  }
  if (!range) throw new Error('No dates given')
  await db.update(tripYears).set({ startDate: range.startDate, endDate: range.endDate }).where(eq(tripYears.id, tripId))
  await audit(actorId, 'dates.lock', { tripId, ...range })
}

export async function unlockDates(actorId: string, tripId: string) {
  await db.update(tripYears).set({ startDate: null, endDate: null }).where(eq(tripYears.id, tripId))
  await audit(actorId, 'dates.unlock', { tripId })
}

// ---------------------------------------------------------------------------
// Site votes and choice
// ---------------------------------------------------------------------------

export async function voteForSite(memberId: string, tripId: string, siteId: string) {
  const [trip] = await db.select({ max: tripYears.maxSiteVotes }).from(tripYears).where(eq(tripYears.id, tripId))
  if (!trip) throw new Error('Unknown trip')
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(siteVotes)
    .where(and(eq(siteVotes.tripYearId, tripId), eq(siteVotes.memberId, memberId)))
  if (count >= trip.max) throw new Error(`You've used all ${trip.max} votes. Remove one to vote for this site.`)
  await db.insert(siteVotes).values({ tripYearId: tripId, memberId, siteId }).onConflictDoNothing()
}

export async function removeVote(memberId: string, tripId: string, siteId: string) {
  await db
    .delete(siteVotes)
    .where(and(eq(siteVotes.tripYearId, tripId), eq(siteVotes.memberId, memberId), eq(siteVotes.siteId, siteId)))
}

export async function getVotes(tripId: string) {
  return db
    .select({ siteId: siteVotes.siteId, memberId: siteVotes.memberId, name: members.name })
    .from(siteVotes)
    .innerJoin(members, eq(members.id, siteVotes.memberId))
    .where(eq(siteVotes.tripYearId, tripId))
}

export async function chooseSite(actorId: string, tripId: string, siteId: string | null, backupIds: string[] = []) {
  await db.update(tripYears).set({ siteId }).where(eq(tripYears.id, tripId))
  await db.delete(tripBackupSites).where(eq(tripBackupSites.tripYearId, tripId))
  const backups = backupIds.filter((id) => id && id !== siteId)
  if (backups.length) {
    await db.insert(tripBackupSites).values(backups.map((id, i) => ({ tripYearId: tripId, siteId: id, rank: i + 1 })))
  }
  await audit(actorId, 'site.choose', { tripId, siteId, backups })
}

export async function getBackups(tripId: string) {
  return db
    .select({ rank: tripBackupSites.rank, site: sites })
    .from(tripBackupSites)
    .innerJoin(sites, eq(sites.id, tripBackupSites.siteId))
    .where(eq(tripBackupSites.tripYearId, tripId))
    .orderBy(asc(tripBackupSites.rank))
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function setAttendance(memberId: string, tripId: string, status: 'in' | 'maybe' | 'out', notes?: string | null) {
  await db
    .insert(attendance)
    .values({ memberId, tripYearId: tripId, status, notes: notes ?? null })
    .onConflictDoUpdate({ target: [attendance.tripYearId, attendance.memberId], set: { status, notes: notes ?? null } })
}

export async function getAttendance(tripId: string) {
  const active = await db.select({ id: members.id, name: members.name }).from(members).where(eq(members.isActive, true)).orderBy(asc(members.name))
  const rows = await db.select().from(attendance).where(eq(attendance.tripYearId, tripId))
  return active.map((m) => {
    const r = rows.find((x) => x.memberId === m.id)
    return { ...m, status: r?.status ?? null, notes: r?.notes ?? null }
  })
}
