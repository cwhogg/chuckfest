'use server'

import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { dateOptions } from '@/db/schema'
import { TRIP_STAGES, type TripStage, type TripLogistics } from '@/db/schema'
import { adminOrThrow } from '@/server/session'
import { attempt } from '@/server/result'
import {
  addBlackouts,
  archiveTrip,
  chooseSite,
  createTrip,
  generateDateOptions,
  getActiveTrip,
  removeBlackout,
  setStage,
  updateLogistics,
  updateTripSettings,
} from '@/server/trips'
import { parseBlackouts } from '@/lib/blackouts'
import { sendPollInvites, deliver, appUrl } from '@/server/jobs'
import { decisionLocked, type PollKind } from '@/emails/messages'
import { listMembers, personalLinkFor } from '@/server/members'
import { seedDefaultGear, removeGearItem } from '@/server/logistics'
import { getSite } from '@/server/sites'
import { rangeLabel } from '@/lib/dates'

const all = () => revalidatePath('/', 'layout')

async function trip() {
  const t = await getActiveTrip()
  if (!t) throw new Error('Create a trip first')
  return t
}

const txt = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null
const isoDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)

export async function startTrip(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const year = Number(formData.get('year'))
    if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Pick a valid year')
    await createTrip(admin.id, year)
    all()
  })
}

export async function changeStage(stage: TripStage) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    if (!TRIP_STAGES.includes(stage)) throw new Error('Unknown stage')
    const t = await trip()
    if (stage === 'archive') await archiveTrip(admin.id, t.id)
    else await setStage(admin.id, t.id, stage)
    all()
  })
}

export async function saveTripSettings(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const t = await trip()
    const maxVotes = Number(formData.get('maxSiteVotes'))
    await updateTripSettings(admin.id, t.id, {
      datePollDeadline: isoDate(txt(formData, 'datePollDeadline')),
      sitePollDeadline: isoDate(txt(formData, 'sitePollDeadline')),
      attendanceDeadline: isoDate(txt(formData, 'attendanceDeadline')),
      maxSiteVotes: Number.isInteger(maxVotes) && maxVotes >= 1 && maxVotes <= 20 ? maxVotes : t.maxSiteVotes,
    })
    all()
  })
}

export async function makeDateOptions(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const t = await trip()
    const from = isoDate(txt(formData, 'from'))
    const to = isoDate(txt(formData, 'to'))
    const startWeekday = Number(formData.get('startWeekday'))
    const nights = Number(formData.get('nights'))
    if (!from || !to || from > to) throw new Error('Pick a valid date range')
    if (!(startWeekday >= 0 && startWeekday <= 6) || !(nights >= 1 && nights <= 10)) throw new Error('Check the start day and trip length')
    const [{ n: existing }] = await db.select({ n: sql<number>`count(*)::int` }).from(dateOptions).where(eq(dateOptions.tripYearId, t.id))
    if (existing > 0 && formData.get('confirmReplace') !== 'on') throw new Error('Tick the box to confirm replacing the current options and answers.')
    const n = await generateDateOptions(admin.id, t.id, { from, to, startWeekday, nights })
    all()
    return `${n} date options created. Existing answers were cleared.`
  })
}

export async function importBlackouts(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    let text = String(formData.get('text') ?? '')
    const file = formData.get('file')
    if (file instanceof File && file.size > 0) {
      if (file.size > 200_000) throw new Error('That file is too large')
      text += `\n${await file.text()}`
    }
    const ranges = parseBlackouts(text)
    if (!ranges.length) throw new Error('No dates found. Use YYYY-MM-DD or MM/DD/YYYY, one per line.')
    const n = await addBlackouts(admin.id, ranges)
    all()
    return `Added ${n} blackout ${n === 1 ? 'range' : 'ranges'}. Regenerate date options to apply them.`
  })
}

export async function deleteBlackout(id: string) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    await removeBlackout(admin.id, id)
    all()
  })
}

export async function saveSiteChoice(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const t = await trip()
    const siteId = txt(formData, 'siteId')
    const backups = formData.getAll('backupId').map(String).filter(Boolean)
    await chooseSite(admin.id, t.id, siteId, [...new Set(backups)])
    all()
  })
}

export async function invite(kind: PollKind, onlyMissing: boolean) {
  return attempt(async () => {
    await adminOrThrow()
    const n = await sendPollInvites(kind, { onlyMissing })
    return `Sent to ${n} ${n === 1 ? 'member' : 'members'}.`
  })
}

/** Tell everyone a decision is locked in. */
export async function announce(kind: 'dates' | 'site' | 'permit') {
  return attempt(async () => {
    await adminOrThrow()
    const t = await trip()
    let detail = ''
    if (kind === 'dates') {
      if (!t.startDate || !t.endDate) throw new Error('Lock the dates first')
      detail = rangeLabel({ startDate: t.startDate, endDate: t.endDate })
    } else {
      const site = t.siteId ? await getSite(t.siteId) : null
      if (!site) throw new Error('Choose the site first')
      detail = site.name
    }
    const people = await listMembers()
    const stamp = new Date().toISOString().slice(0, 16)
    for (const m of people) {
      const link = appUrl(`${await personalLinkFor(m.id)}&next=/`)
      await deliver(m, decisionLocked(kind, t.year, detail, link), `announce_${kind}`, `announce:${kind}:${t.id}:${m.id}:${stamp}`)
    }
    return `Announced to ${people.length} members.`
  })
}

export async function saveLogistics(formData: FormData) {
  return attempt(async () => {
    const admin = await adminOrThrow()
    const t = await trip()
    const keys: (keyof TripLogistics)[] = ['trailhead', 'parking', 'shuttle', 'nightBefore', 'permitPickup', 'meetTime', 'notes']
    const logistics: TripLogistics = {}
    for (const k of keys) {
      const v = txt(formData, k)
      if (v) logistics[k] = v.slice(0, 1000)
    }
    await updateLogistics(admin.id, t.id, logistics)
    all()
  })
}

export async function addDefaultGear() {
  return attempt(async () => {
    await adminOrThrow()
    await seedDefaultGear((await trip()).id)
    all()
  })
}

export async function deleteGear(itemId: string) {
  return attempt(async () => {
    await adminOrThrow()
    await removeGearItem((await trip()).id, itemId)
    all()
  })
}
