import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { attendance, dateOptions, dateResponses, lotteryEntries, members, permitAttempts, siteVotes, sites } from '@/db/schema'
import { addDays, alarmLabel, pacificInstant, permitAlarms } from '@/lib/permits'
import {
  emergencyTripPlan,
  lotteryReminder,
  permitAlarm,
  pollInvite,
  pollNudge,
  preTripBriefing,
  type Message,
  type PollKind,
} from '@/emails/messages'
import { sendEmail, sendSms } from './notify'
import { personalLinkFor } from './members'
import { alarmRecipients, upcomingWindows } from './permits'
import { getActiveTrip } from './trips'
import { siteOrigin } from '@/lib/site-url'

type Member = typeof members.$inferSelect

export function appUrl(path = '/') {
  return new URL(path, siteOrigin()).toString()
}

/** A one-tap link that signs the member in and lands on `next`. */
async function linkFor(member: Member, next: string) {
  return appUrl(`${await personalLinkFor(member.id)}&next=${encodeURIComponent(next)}`)
}

/** Deliver a message to a member on every channel they've opted into. */
export async function deliver(member: Member, msg: Message, kind: string, dedupeKey: string) {
  const results = []
  if (member.notifyEmail) {
    results.push(await sendEmail({ kind, dedupeKey, memberId: member.id, to: member.email, subject: msg.subject, html: msg.html, text: msg.text }))
  }
  if (member.notifySms && member.phone) {
    results.push(await sendSms({ kind, dedupeKey, memberId: member.id, to: member.phone, body: msg.sms }))
  }
  return results
}

const activeMembers = () => db.select().from(members).where(eq(members.isActive, true))

/** Members who haven't answered a poll yet. */
async function nonResponders(kind: PollKind, tripId: string): Promise<Member[]> {
  const everyone = await activeMembers()
  let answered: string[] = []
  if (kind === 'dates') {
    const opts = await db.select({ id: dateOptions.id }).from(dateOptions).where(eq(dateOptions.tripYearId, tripId))
    if (opts.length) {
      const rows = await db
        .selectDistinct({ m: dateResponses.memberId })
        .from(dateResponses)
        .where(inArray(dateResponses.dateOptionId, opts.map((o) => o.id)))
      answered = rows.map((r) => r.m)
    }
  } else if (kind === 'sites') {
    answered = (await db.selectDistinct({ m: siteVotes.memberId }).from(siteVotes).where(eq(siteVotes.tripYearId, tripId))).map((r) => r.m)
  } else {
    answered = (await db.select({ m: attendance.memberId }).from(attendance).where(eq(attendance.tripYearId, tripId))).map((r) => r.m)
  }
  return everyone.filter((m) => !answered.includes(m.id))
}

const POLL_PATH: Record<PollKind, string> = { dates: '/dates', sites: '/sites', attendance: '/trip' }

/** Admin action: invite everyone (or only non-responders) to a poll. */
export async function sendPollInvites(kind: PollKind, opts: { onlyMissing?: boolean } = {}) {
  const trip = await getActiveTrip()
  if (!trip) throw new Error('No active trip')
  const deadline = { dates: trip.datePollDeadline, sites: trip.sitePollDeadline, attendance: trip.attendanceDeadline }[kind]
  const targets = opts.onlyMissing ? await nonResponders(kind, trip.id) : await activeMembers()
  const stamp = new Date().toISOString().slice(0, 16) // allow a re-send later, block double clicks
  let sent = 0
  for (const m of targets) {
    const msg = pollInvite(kind, trip.year, deadline, await linkFor(m, POLL_PATH[kind]))
    await deliver(m, msg, `invite_${kind}`, `invite:${kind}:${trip.id}:${m.id}:${stamp}`)
    sent++
  }
  return sent
}

/** True when `now` is within the 6 hours after `at` (the job runs every 5 minutes). */
const due = (at: Date, now: Date) => now >= at && now.getTime() - at.getTime() < 6 * 3_600_000

export async function runScheduledJobs(now = new Date()) {
  const log: string[] = []

  // 1. Permit alarms: 3 days, 1 day and 15 minutes before each window opens.
  for (const { window, site } of await upcomingWindows(now)) {
    const recipients = await alarmRecipients(window.id)
    const slots = await db
      .select({ memberId: permitAttempts.memberId, priority: permitAttempts.priority })
      .from(permitAttempts)
      .where(eq(permitAttempts.windowId, window.id))
    for (const alarm of permitAlarms(window.opensAt, new Date(0))) {
      if (!(now >= alarm.at && now < window.opensAt)) continue
      if (alarm.minutesBefore > 15 && !due(alarm.at, now)) continue
      for (const m of recipients) {
        const slot = slots.find((s) => s.memberId === m.id)
        const msg = permitAlarm({
          siteName: site.name,
          opensAt: window.opensAt,
          whenLabel: alarmLabel(alarm.minutesBefore),
          entryPoint: site.permitEntryPoint,
          permitUrl: site.permitUrl,
          slot: slot ? `attempt #${slot.priority}` : null,
          planUrl: await linkFor(m, '/permits'),
        })
        await deliver(m, msg, 'permit_alarm', `permit:${window.id}:${alarm.minutesBefore}:${m.id}`)
      }
      log.push(`permit alarm ${site.name} -${alarm.minutesBefore}m → ${recipients.length}`)
    }
  }

  const trip = await getActiveTrip()
  if (!trip) return log

  // 2. Poll nudges at 9:00 Pacific, 3 days and 1 day before each deadline.
  const polls: [PollKind, string | null, boolean][] = [
    ['dates', trip.datePollDeadline, trip.stage === 'dates'],
    ['sites', trip.sitePollDeadline, trip.stage === 'site'],
    ['attendance', trip.attendanceDeadline, ['permits', 'group'].includes(trip.stage)],
  ]
  for (const [kind, deadline, open] of polls) {
    if (!deadline || !open) continue
    for (const daysBefore of [3, 1]) {
      if (!due(pacificInstant(addDays(deadline, -daysBefore), '09:00'), now)) continue
      const missing = await nonResponders(kind, trip.id)
      for (const m of missing) {
        const msg = pollNudge(kind, trip.year, deadline, await linkFor(m, POLL_PATH[kind]))
        await deliver(m, msg, `nudge_${kind}`, `nudge:${kind}:${trip.id}:${daysBefore}:${m.id}`)
      }
      log.push(`nudge ${kind} -${daysBefore}d → ${missing.length}`)
    }
  }

  // 3. Lottery reminders to admins, 3 days and 1 day before a lottery closes.
  const admins = (await activeMembers()).filter((m) => m.role === 'admin')
  const lotteries = await db.select().from(lotteryEntries).where(eq(lotteryEntries.tripYearId, trip.id))
  for (const l of lotteries) {
    if (!l.closesOn || l.result === 'won' || l.result === 'lost') continue
    for (const daysBefore of [3, 1]) {
      if (!due(pacificInstant(addDays(l.closesOn, -daysBefore), '09:00'), now)) continue
      for (const m of admins) {
        const msg = lotteryReminder(l.lotteryName, l.closesOn, await linkFor(m, '/permits'))
        await deliver(m, msg, 'lottery_reminder', `lottery:${l.id}:${daysBefore}:${m.id}`)
      }
      log.push(`lottery ${l.lotteryName} -${daysBefore}d`)
    }
  }

  // 4. Pre-trip briefing (7 days out) and emergency trip plans (day before).
  if (trip.startDate && trip.endDate && trip.siteId) {
    const [site] = await db.select().from(sites).where(eq(sites.id, trip.siteId))
    const going = await db
      .select({ m: members })
      .from(attendance)
      .innerJoin(members, eq(members.id, attendance.memberId))
      .where(and(eq(attendance.tripYearId, trip.id), eq(attendance.status, 'in')))
    const dates = { startDate: trip.startDate, endDate: trip.endDate }

    if (due(pacificInstant(addDays(trip.startDate, -7), '09:00'), now)) {
      for (const { m } of going) {
        const msg = preTripBriefing(trip.year, site.name, dates, await linkFor(m, '/trip'))
        await deliver(m, msg, 'pre_trip', `pretrip:${trip.id}:${m.id}`)
      }
      log.push(`pre-trip briefing → ${going.length}`)
    }

    if (due(pacificInstant(addDays(trip.startDate, -1), '12:00'), now)) {
      const names = going.map((g) => g.m.name)
      for (const { m } of going) {
        if (!m.emergencyContactEmail) continue
        const plan = emergencyTripPlan({
          memberName: m.name,
          contactName: m.emergencyContactName,
          siteName: site.name,
          area: site.area,
          dates,
          trailhead: trip.logistics.trailhead ?? site.permitEntryPoint,
          groupNames: names,
        })
        await sendEmail({ kind: 'trip_plan', dedupeKey: `tripplan:${trip.id}:${m.id}`, memberId: m.id, to: m.emergencyContactEmail, ...plan })
      }
      log.push('emergency trip plans sent')
    }
  }

  return log
}
