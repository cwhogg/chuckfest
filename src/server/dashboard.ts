import 'server-only'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { attendance, dateOptions, dateResponses, permitAttempts, permitWindows, sites, siteVotes, type TripStage } from '@/db/schema'
import type { Trip } from './trips'

export type Todo = { key: string; label: string; href: string; due?: string | null }

export async function getTodos(trip: Trip, memberId: string): Promise<Todo[]> {
  const todos: Todo[] = []

  if (trip.stage === 'dates' && !trip.startDate) {
    const opts = await db.select({ id: dateOptions.id }).from(dateOptions).where(eq(dateOptions.tripYearId, trip.id))
    if (opts.length) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(dateResponses)
        .where(and(eq(dateResponses.memberId, memberId), inArray(dateResponses.dateOptionId, opts.map((o) => o.id))))
      if (n < opts.length) {
        todos.push({
          key: 'dates',
          label: n === 0 ? 'Mark which dates work for you' : `Answer the last ${opts.length - n} date options`,
          href: '/dates',
          due: trip.datePollDeadline,
        })
      }
    }
  }

  if (trip.stage === 'site' && !trip.siteId) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(siteVotes)
      .where(and(eq(siteVotes.tripYearId, trip.id), eq(siteVotes.memberId, memberId)))
    if (n < trip.maxSiteVotes) {
      todos.push({
        key: 'sites',
        label: n === 0 ? `Vote for up to ${trip.maxSiteVotes} sites` : `You have ${trip.maxSiteVotes - n} site votes left`,
        href: '/sites',
        due: trip.sitePollDeadline,
      })
    }
  }

  if (['permits', 'group', 'trip'].includes(trip.stage)) {
    const [row] = await db
      .select({ status: attendance.status })
      .from(attendance)
      .where(and(eq(attendance.tripYearId, trip.id), eq(attendance.memberId, memberId)))
    if (!row) todos.push({ key: 'attendance', label: "Tell the group if you're in", href: '/trip', due: trip.attendanceDeadline })
  }

  const slots = await db
    .select({ siteName: sites.name, opensAt: permitWindows.opensAt })
    .from(permitAttempts)
    .innerJoin(permitWindows, eq(permitWindows.id, permitAttempts.windowId))
    .innerJoin(sites, eq(sites.id, permitWindows.siteId))
    .where(and(eq(permitAttempts.memberId, memberId), eq(permitAttempts.outcome, 'pending'), eq(permitWindows.tripYearId, trip.id)))
  for (const s of slots) {
    if (s.opensAt > new Date()) {
      todos.push({ key: `slot-${s.siteName}`, label: `You have a permit-day slot for ${s.siteName}`, href: '/permits' })
    }
  }

  return todos
}

export const STAGE_LABELS: Record<TripStage, string> = {
  kickoff: 'Kickoff',
  dates: 'Pick dates',
  site: 'Pick site',
  permits: 'Get permits',
  group: 'Confirm group',
  trip: 'Trip',
  archive: 'Archive',
}
