import { beforeEach, describe, expect, it, vi } from 'vitest'

const sent: { channel: string; to: string; kind: string; dedupeKey: string }[] = []
vi.mock('@/server/notify', () => ({
  sendEmail: vi.fn(async (m) => {
    sent.push({ channel: 'email', to: m.to, kind: m.kind, dedupeKey: m.dedupeKey })
    return { status: 'sent' }
  }),
  sendSms: vi.fn(async (m) => {
    sent.push({ channel: 'sms', to: m.to, kind: m.kind, dedupeKey: m.dedupeKey })
    return { status: 'sent' }
  }),
}))

import { freshDb, seedMember, seedSite } from './db'
import type { Db } from '@/db'
import { runScheduledJobs } from '@/server/jobs'
import { addAttempt, syncPermitWindows, getPermitPlan } from '@/server/permits'
import { chooseSite, createTrip, generateDateOptions, getDatePoll, lockDates, setDateResponse, setStage, updateTripSettings } from '@/server/trips'

let db: Db
beforeEach(async () => {
  db = await freshDb()
  sent.length = 0
})

describe('permit alarms', () => {
  it('alerts admins and slot holders at 3 days, 1 day and 15 minutes', async () => {
    const admin = await seedMember(db, { role: 'admin', email: 'admin@x.com', phone: '+15555550100' })
    const vol = await seedMember(db, { email: 'vol@x.com' })
    await seedMember(db, { email: 'other@x.com' })
    const site = await seedSite(db, { name: 'Ediza Lake', permitAdvanceDays: 182 })
    const trip = await createTrip(admin.id, 2027)
    await lockDates(admin.id, trip.id, null, { startDate: '2027-07-14', endDate: '2027-07-18' })
    await chooseSite(admin.id, trip.id, site.id)
    await syncPermitWindows(admin.id, trip.id)
    const plan = await getPermitPlan(trip.id)
    await addAttempt(admin.id, plan.windows[0].window.id, vol.id)
    // Opens 2027-01-13 07:00 PST = 15:00Z

    await runScheduledJobs(new Date('2027-01-09T15:00:00Z')) // 4 days out: nothing
    expect(sent).toHaveLength(0)

    await runScheduledJobs(new Date('2027-01-10T15:02:00Z')) // 3-day alarm
    expect(sent.map((s) => `${s.channel}:${s.to}`).sort()).toEqual(['email:admin@x.com', 'email:vol@x.com', 'sms:+15555550100'])

    sent.length = 0
    await runScheduledJobs(new Date('2027-01-13T14:46:00Z')) // 15-minute alarm (1-day already past its 6h grace)
    expect(sent.filter((s) => s.channel === 'email').map((s) => s.dedupeKey).every((k) => k.includes(':15:'))).toBe(true)
    expect(sent.filter((s) => s.channel === 'email')).toHaveLength(2)
  })
})

describe('poll nudges', () => {
  it('nudges only members who have not answered, at 9am Pacific 3 days before the deadline', async () => {
    const admin = await seedMember(db, { role: 'admin', email: 'a@x.com' })
    const done = await seedMember(db, { email: 'done@x.com' })
    await seedMember(db, { email: 'late@x.com' })
    const trip = await createTrip(admin.id, 2027)
    await setStage(admin.id, trip.id, 'dates')
    await updateTripSettings(admin.id, trip.id, { datePollDeadline: '2027-03-10' })
    await generateDateOptions(admin.id, trip.id, { from: '2027-06-01', to: '2027-06-30', startWeekday: 3, nights: 4 })
    const poll = await getDatePoll(trip.id, done.id)
    await setDateResponse(done.id, poll.options[0].id, 'yes')

    await runScheduledJobs(new Date('2027-03-07T17:05:00Z')) // 09:05 PST on Mar 7
    expect(sent.map((s) => s.to).sort()).toEqual(['a@x.com', 'late@x.com'])
  })
})
