import { beforeEach, describe, expect, it } from 'vitest'
import { freshDb, seedMember, seedSite } from './db'
import type { Db } from '@/db'
import {
  addBlackouts,
  chooseSite,
  createTrip,
  generateDateOptions,
  getActiveTrip,
  getAttendance,
  getBackups,
  getDatePoll,
  getVotes,
  removeVote,
  setAttendance,
  setDateResponse,
  setStage,
  voteForSite,
} from '@/server/trips'

let db: Db
beforeEach(async () => {
  db = await freshDb()
})

describe('trips', () => {
  it('active trip skips archived years', async () => {
    const admin = await seedMember(db, { role: 'admin' })
    const t26 = await createTrip(admin.id, 2026)
    await setStage(admin.id, t26.id, 'archive')
    await createTrip(admin.id, 2027)
    expect((await getActiveTrip())?.year).toBe(2027)
  })

  it('date poll respects blackouts and tallies responses', async () => {
    const admin = await seedMember(db, { role: 'admin', name: 'Admin' })
    const a = await seedMember(db, { name: 'Ann' })
    await seedMember(db, { name: 'Bob' })
    const trip = await createTrip(admin.id, 2027)
    await addBlackouts(admin.id, [{ startDate: '2027-07-04', endDate: '2027-07-04' }])
    const n = await generateDateOptions(admin.id, trip.id, { from: '2027-06-01', to: '2027-07-31', startWeekday: 3, nights: 4 })
    expect(n).toBe(7) // 8 Wed–Sun windows that end by Jul 31, minus Jun 30 – Jul 4

    const poll = await getDatePoll(trip.id, a.id)
    await setDateResponse(a.id, poll.options[1].id, 'yes')
    await setDateResponse(a.id, poll.options[1].id, 'maybe') // change of mind
    await setDateResponse(admin.id, poll.options[1].id, 'yes')

    const after = await getDatePoll(trip.id, a.id)
    expect(after.options[1]).toMatchObject({ yes: 1, maybe: 1, mine: 'maybe', yesNames: ['Admin'] })
    expect(after.ranked[0].id).toBe(poll.options[1].id)
    expect(after.missing.map((m) => m.name)).toEqual(['Bob'])
  })

  it('caps site votes per member', async () => {
    const m = await seedMember(db)
    const trip = await createTrip(m.id, 2027)
    const sites = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => seedSite(db, { name: `S${i}` })))
    for (const s of sites.slice(0, 5)) await voteForSite(m.id, trip.id, s.id)
    await expect(voteForSite(m.id, trip.id, sites[5].id)).rejects.toThrow(/all 5 votes/)
    await removeVote(m.id, trip.id, sites[0].id)
    await voteForSite(m.id, trip.id, sites[5].id)
    expect(await getVotes(trip.id)).toHaveLength(5)
  })

  it('records the chosen site with ranked backups', async () => {
    const m = await seedMember(db)
    const trip = await createTrip(m.id, 2027)
    const [a, b, c] = await Promise.all(['A', 'B', 'C'].map((name) => seedSite(db, { name })))
    await chooseSite(m.id, trip.id, a.id, [c.id, a.id, b.id])
    expect((await getBackups(trip.id)).map((x) => x.site.name)).toEqual(['C', 'B'])
  })

  it('attendance lists everyone, with unanswered as null', async () => {
    const a = await seedMember(db, { name: 'Ann' })
    await seedMember(db, { name: 'Bob' })
    await seedMember(db, { name: 'Cal', isActive: false })
    const trip = await createTrip(a.id, 2027)
    await setAttendance(a.id, trip.id, 'in')
    expect(await getAttendance(trip.id)).toMatchObject([
      { name: 'Ann', status: 'in' },
      { name: 'Bob', status: null },
    ])
  })
})
