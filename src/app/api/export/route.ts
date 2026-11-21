import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  attendance,
  auditLog,
  comments,
  dateOptions,
  dateResponses,
  lotteryEntries,
  members,
  notifications,
  permitAttempts,
  permitWindows,
  sessions,
  sites,
  siteVotes,
} from '@/db/schema'
import { getActiveTrip } from '@/server/trips'

// Read-only usage export for the owner's admin app (github.com/cwhogg/admin).
// Auth: `Authorization: Bearer $ADMIN_EXPORT_TOKEN`, closed when unset.
// Members appear by first name only; no emails, phones, emergency contacts,
// IPs, user agents, comment text or audit details leave the app.

const MAX_DAYS = 90

function authorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_EXPORT_TOKEN
  const auth = request.headers.get('authorization') ?? ''
  if (!expected || !auth.startsWith('Bearer ')) return false
  const a = Buffer.from(auth.slice('Bearer '.length))
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const day = (col: unknown) => sql<string>`to_char(${col} at time zone 'UTC', 'YYYY-MM-DD')`
const count = sql<number>`count(*)::int`

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const days = Math.min(MAX_DAYS, Math.max(1, Number(request.nextUrl.searchParams.get('days')) || 7))
  const since = new Date(Date.now() - days * 86400000)

  const [memberRows, lastSeen, logins, votesByDay, commentsByDay, dateRespByDay, attendanceByDay, actions, recentActions, notes] =
    await Promise.all([
      db.select({ id: members.id, name: members.name, role: members.role, isActive: members.isActive, createdAt: members.createdAt }).from(members),
      db
        .select({ memberId: sessions.userId, lastSeen: sql<string>`max(${sessions.updatedAt})` })
        .from(sessions)
        .groupBy(sessions.userId),
      db.select({ day: day(sessions.createdAt), n: count }).from(sessions).where(gte(sessions.createdAt, since)).groupBy(day(sessions.createdAt)),
      db.select({ day: day(siteVotes.createdAt), n: count }).from(siteVotes).where(gte(siteVotes.createdAt, since)).groupBy(day(siteVotes.createdAt)),
      db.select({ day: day(comments.createdAt), n: count }).from(comments).where(gte(comments.createdAt, since)).groupBy(day(comments.createdAt)),
      db
        .select({ day: day(dateResponses.updatedAt), n: count })
        .from(dateResponses)
        .where(gte(dateResponses.updatedAt, since))
        .groupBy(day(dateResponses.updatedAt)),
      db
        .select({ day: day(attendance.updatedAt), n: count })
        .from(attendance)
        .where(gte(attendance.updatedAt, since))
        .groupBy(day(attendance.updatedAt)),
      db
        .select({ action: auditLog.action, n: count })
        .from(auditLog)
        .where(gte(auditLog.createdAt, since))
        .groupBy(auditLog.action),
      db
        .select({ action: auditLog.action, memberId: auditLog.memberId, createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(gte(auditLog.createdAt, since))
        .orderBy(desc(auditLog.createdAt))
        .limit(200),
      db
        .select({
          kind: notifications.kind,
          channel: notifications.channel,
          status: notifications.status,
          error: notifications.error,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(gte(notifications.createdAt, since))
        .orderBy(desc(notifications.createdAt))
        .limit(500),
    ])

  const firstName = new Map(memberRows.map((m) => [m.id, m.name.split(/\s+/)[0]]))
  const seen = new Map(lastSeen.map((s) => [s.memberId, s.lastSeen]))

  const trip = await getActiveTrip()
  let current = null
  if (trip) {
    const opts = await db.select().from(dateOptions).where(eq(dateOptions.tripYearId, trip.id))
    const [dateResp, votes, att, windows, lotteries, site] = await Promise.all([
      opts.length
        ? db
            .select({ dateOptionId: dateResponses.dateOptionId, memberId: dateResponses.memberId, status: dateResponses.status })
            .from(dateResponses)
            .where(inArray(dateResponses.dateOptionId, opts.map((o) => o.id)))
        : Promise.resolve([]),
      db
        .select({ memberId: siteVotes.memberId, siteId: siteVotes.siteId, site: sites.name })
        .from(siteVotes)
        .innerJoin(sites, eq(sites.id, siteVotes.siteId))
        .where(eq(siteVotes.tripYearId, trip.id)),
      db.select({ memberId: attendance.memberId, status: attendance.status }).from(attendance).where(eq(attendance.tripYearId, trip.id)),
      db
        .select({ outcome: permitAttempts.outcome, n: count })
        .from(permitAttempts)
        .innerJoin(permitWindows, eq(permitWindows.id, permitAttempts.windowId))
        .where(eq(permitWindows.tripYearId, trip.id))
        .groupBy(permitAttempts.outcome),
      db
        .select({ lottery: lotteryEntries.lotteryName, result: lotteryEntries.result, closesOn: lotteryEntries.closesOn, resultsOn: lotteryEntries.resultsOn })
        .from(lotteryEntries)
        .where(eq(lotteryEntries.tripYearId, trip.id)),
      trip.siteId ? db.select({ name: sites.name }).from(sites).where(eq(sites.id, trip.siteId)) : Promise.resolve([]),
    ])

    const tally = new Map<string, number>()
    for (const v of votes) tally.set(v.site, (tally.get(v.site) ?? 0) + 1)

    current = {
      year: trip.year,
      stage: trip.stage,
      startDate: trip.startDate,
      endDate: trip.endDate,
      site: site[0]?.name ?? null,
      deadlines: { datePoll: trip.datePollDeadline, sitePoll: trip.sitePollDeadline, attendance: trip.attendanceDeadline },
      maxSiteVotes: trip.maxSiteVotes,
      datePoll: opts.map((o) => {
        const r = dateResp.filter((x) => x.dateOptionId === o.id)
        return {
          start: o.startDate,
          end: o.endDate,
          yes: r.filter((x) => x.status === 'yes').length,
          maybe: r.filter((x) => x.status === 'maybe').length,
          no: r.filter((x) => x.status === 'no').length,
        }
      }),
      respondedToDates: new Set(dateResp.map((r) => r.memberId)).size,
      votedOnSites: new Set(votes.map((v) => v.memberId)).size,
      siteTally: [...tally.entries()].map(([site, votes]) => ({ site, votes })).sort((a, b) => b.votes - a.votes),
      attendance: {
        in: att.filter((a) => a.status === 'in').length,
        maybe: att.filter((a) => a.status === 'maybe').length,
        out: att.filter((a) => a.status === 'out').length,
      },
      permitAttempts: windows,
      lotteries,
    }
  }

  return NextResponse.json({
    app: 'chuckfest',
    generatedAt: new Date().toISOString(),
    window: { days, since: since.toISOString() },
    members: memberRows.map((m) => ({
      firstName: firstName.get(m.id),
      role: m.role,
      isActive: m.isActive,
      joined: m.createdAt,
      lastSeen: seen.get(m.id) ?? null,
    })),
    daily: { logins, siteVotes: votesByDay, comments: commentsByDay, dateResponses: dateRespByDay, attendance: attendanceByDay },
    actions,
    recentActions: recentActions.map((a) => ({ action: a.action, by: a.memberId ? firstName.get(a.memberId) ?? null : null, at: a.createdAt })),
    notifications: notes,
    currentTrip: current,
  })
}
