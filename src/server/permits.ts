import 'server-only'
import { and, asc, eq, gt, inArray } from 'drizzle-orm'
import { db } from '@/db'
import {
  lotteryEntries,
  members,
  permitAttempts,
  permitVolunteers,
  permitWindows,
  sites,
  tripBackupSites,
  tripYears,
  type PermitOutcome,
} from '@/db/schema'
import { permitOpensAt } from '@/lib/permits'
import { audit } from './trips'

/**
 * Create (or refresh) a permit window for the chosen site and each backup, for
 * the locked trip start date. Windows for sites no longer in the plan are removed
 * unless someone already logged an attempt on them.
 */
export async function syncPermitWindows(actorId: string, tripId: string) {
  const [trip] = await db.select().from(tripYears).where(eq(tripYears.id, tripId))
  if (!trip?.startDate) throw new Error('Lock the trip dates first')
  const backups = await db.select({ siteId: tripBackupSites.siteId }).from(tripBackupSites).where(eq(tripBackupSites.tripYearId, tripId))
  const siteIds = [trip.siteId, ...backups.map((b) => b.siteId)].filter((x): x is string => !!x)
  if (!siteIds.length) throw new Error('Choose a site first')

  const planSites = await db.select().from(sites).where(inArray(sites.id, siteIds))
  const skipped: string[] = []
  for (const site of planSites) {
    const opensAt = permitOpensAt(site, trip.startDate)
    if (!opensAt) {
      skipped.push(site.name)
      continue
    }
    await db
      .insert(permitWindows)
      .values({ tripYearId: tripId, siteId: site.id, targetStartDate: trip.startDate, opensAt })
      .onConflictDoUpdate({
        target: [permitWindows.tripYearId, permitWindows.siteId, permitWindows.targetStartDate],
        set: { opensAt },
      })
  }

  const existing = await db.select().from(permitWindows).where(eq(permitWindows.tripYearId, tripId))
  for (const w of existing) {
    const stale = !siteIds.includes(w.siteId) || w.targetStartDate !== trip.startDate
    if (!stale) continue
    const attempts = await db.select({ outcome: permitAttempts.outcome }).from(permitAttempts).where(eq(permitAttempts.windowId, w.id))
    if (attempts.every((a) => a.outcome === 'pending')) await db.delete(permitWindows).where(eq(permitWindows.id, w.id))
  }
  await audit(actorId, 'permits.sync', { tripId, skipped })
  return { skipped }
}

export async function getPermitPlan(tripId: string) {
  const windows = await db
    .select({ window: permitWindows, site: sites })
    .from(permitWindows)
    .innerJoin(sites, eq(sites.id, permitWindows.siteId))
    .where(eq(permitWindows.tripYearId, tripId))
    .orderBy(asc(permitWindows.opensAt))
  const windowIds = windows.map((w) => w.window.id)
  const attempts = windowIds.length
    ? await db
        .select({ attempt: permitAttempts, memberName: members.name })
        .from(permitAttempts)
        .leftJoin(members, eq(members.id, permitAttempts.memberId))
        .where(inArray(permitAttempts.windowId, windowIds))
        .orderBy(asc(permitAttempts.priority))
    : []
  const volunteers = await db
    .select({ id: members.id, name: members.name })
    .from(permitVolunteers)
    .innerJoin(members, eq(members.id, permitVolunteers.memberId))
    .where(eq(permitVolunteers.tripYearId, tripId))
  const admins = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(and(eq(members.role, 'admin'), eq(members.isActive, true)))

  // Chosen site first, then backups in rank order, then by opening time.
  const [trip] = await db.select({ siteId: tripYears.siteId }).from(tripYears).where(eq(tripYears.id, tripId))
  const ranks = await db.select().from(tripBackupSites).where(eq(tripBackupSites.tripYearId, tripId))
  const order = (siteId: string) => (siteId === trip?.siteId ? 0 : (ranks.find((r) => r.siteId === siteId)?.rank ?? 99))
  windows.sort((a, b) => order(a.site.id) - order(b.site.id) || a.window.opensAt.getTime() - b.window.opensAt.getTime())

  const secured = attempts.some((a) => a.attempt.outcome === 'got_it')
  return {
    windows: windows.map((w) => ({
      ...w,
      role: w.site.id === trip?.siteId ? ('chosen' as const) : ('backup' as const),
      attempts: attempts.filter((a) => a.attempt.windowId === w.window.id),
    })),
    volunteers,
    admins,
    secured,
  }
}

export async function addAttempt(actorId: string, windowId: string, memberId: string | null, notes?: string | null) {
  const current = await db.select({ p: permitAttempts.priority }).from(permitAttempts).where(eq(permitAttempts.windowId, windowId))
  const priority = current.reduce((max, r) => Math.max(max, r.p), 0) + 1
  await db.insert(permitAttempts).values({ windowId, memberId, priority, notes: notes ?? null })
  await audit(actorId, 'permits.attempt.add', { windowId, memberId })
}

export async function removeAttempt(actorId: string, attemptId: string) {
  await db.delete(permitAttempts).where(eq(permitAttempts.id, attemptId))
  await audit(actorId, 'permits.attempt.remove', { attemptId })
}

/**
 * Log a permit result. Admins can log any attempt; a member can log only their own
 * slot (they're the one at the keyboard on permit day).
 */
export async function recordOutcome(
  actor: { id: string; role: string },
  attemptId: string,
  outcome: PermitOutcome,
  confirmationNumber?: string | null,
) {
  const [a] = await db.select().from(permitAttempts).where(eq(permitAttempts.id, attemptId))
  if (!a) throw new Error('Unknown attempt')
  if (actor.role !== 'admin' && a.memberId !== actor.id) throw new Error('You can only log your own permit slot')
  await db
    .update(permitAttempts)
    .set({ outcome, confirmationNumber: confirmationNumber?.trim() || null })
    .where(eq(permitAttempts.id, attemptId))
  await audit(actor.id, 'permits.outcome', { attemptId, outcome })
}

export async function setVolunteer(memberId: string, tripId: string, on: boolean) {
  if (on) await db.insert(permitVolunteers).values({ memberId, tripYearId: tripId }).onConflictDoNothing()
  else await db.delete(permitVolunteers).where(and(eq(permitVolunteers.memberId, memberId), eq(permitVolunteers.tripYearId, tripId)))
}

/** Everyone who should hear permit alarms for a window: admins, plus whoever holds a slot. */
export async function alarmRecipients(windowId: string) {
  const admins = await db.select().from(members).where(and(eq(members.role, 'admin'), eq(members.isActive, true)))
  const slotHolders = await db
    .select({ m: members })
    .from(permitAttempts)
    .innerJoin(members, eq(members.id, permitAttempts.memberId))
    .where(and(eq(permitAttempts.windowId, windowId), eq(members.isActive, true)))
  const byId = new Map([...admins, ...slotHolders.map((s) => s.m)].map((m) => [m.id, m]))
  return [...byId.values()]
}

export async function upcomingWindows(now = new Date()) {
  return db
    .select({ window: permitWindows, site: sites })
    .from(permitWindows)
    .innerJoin(sites, eq(sites.id, permitWindows.siteId))
    .where(gt(permitWindows.opensAt, now))
}

// ---------------------------------------------------------------------------
// Lottery tracker
// ---------------------------------------------------------------------------

export type LotteryInput = {
  lotteryName: string
  siteId?: string | null
  memberId?: string | null
  datesRequested?: string | null
  closesOn?: string | null
  resultsOn?: string | null
  result?: 'not_entered' | 'entered' | 'won' | 'lost'
  notes?: string | null
}

export async function listLotteries(tripId: string) {
  return db
    .select({ entry: lotteryEntries, memberName: members.name, siteName: sites.name })
    .from(lotteryEntries)
    .leftJoin(members, eq(members.id, lotteryEntries.memberId))
    .leftJoin(sites, eq(sites.id, lotteryEntries.siteId))
    .where(eq(lotteryEntries.tripYearId, tripId))
    .orderBy(asc(lotteryEntries.closesOn), asc(lotteryEntries.lotteryName))
}

export async function saveLottery(actorId: string, tripId: string, input: LotteryInput, id?: string) {
  if (!input.lotteryName.trim()) throw new Error('Name the lottery')
  const values = { ...input, lotteryName: input.lotteryName.trim(), tripYearId: tripId }
  if (id) await db.update(lotteryEntries).set(values).where(eq(lotteryEntries.id, id))
  else await db.insert(lotteryEntries).values(values)
  await audit(actorId, id ? 'lottery.update' : 'lottery.add', { tripId, lotteryName: values.lotteryName })
}

export async function deleteLottery(actorId: string, id: string) {
  await db.delete(lotteryEntries).where(eq(lotteryEntries.id, id))
  await audit(actorId, 'lottery.delete', { id })
}
