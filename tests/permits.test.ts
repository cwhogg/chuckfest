import { describe, expect, it } from 'vitest'
import { addDays, alarmLabel, permitAlarms, permitOpensAt, type PermitRules } from '@/lib/permits'

const base: PermitRules = {
  name: 'Test',
  permitType: 'rolling',
  permitAdvanceDays: 182,
  permitOpenTime: '07:00',
  permitFixedOpenDate: null,
  permitLotteryOpen: null,
}

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
    expect(addDays('2027-01-15', -182)).toBe('2026-07-17')
  })
})

describe('permitOpensAt', () => {
  it('rolling: opens N days before at 7:00 Pacific (standard time in winter)', () => {
    // 2027-07-14 minus 182 days = 2027-01-13, PST (UTC-8)
    expect(permitOpensAt(base, '2027-07-14')?.toISOString()).toBe('2027-01-13T15:00:00.000Z')
  })

  it('rolling: uses PDT offset in summer', () => {
    // 2027-12-20 minus 182 days = 2027-06-21, PDT (UTC-7)
    expect(permitOpensAt(base, '2027-12-20')?.toISOString()).toBe('2027-06-21T14:00:00.000Z')
  })

  it('rolling without advance days returns null', () => {
    expect(permitOpensAt({ ...base, permitAdvanceDays: null }, '2027-07-14')).toBeNull()
  })

  it('fixed date in the same year as the trip', () => {
    const site = { ...base, permitType: 'fixed_date' as const, permitFixedOpenDate: '03-15' }
    expect(permitOpensAt(site, '2027-07-14')?.toISOString()).toBe('2027-03-15T14:00:00.000Z')
  })

  it('fixed date after the trip start falls in the previous year', () => {
    const site = { ...base, permitType: 'fixed_date' as const, permitFixedOpenDate: '11-01' }
    expect(permitOpensAt(site, '2027-07-14')?.toISOString()).toBe('2026-11-01T15:00:00.000Z')
  })

  it('lottery uses its open date and custom open time', () => {
    const site = {
      ...base,
      permitType: 'lottery' as const,
      permitLotteryOpen: '02-01',
      permitOpenTime: '8:30',
    }
    expect(permitOpensAt(site, '2027-07-14')?.toISOString()).toBe('2027-02-01T16:30:00.000Z')
  })

  it('bad or missing rules return null', () => {
    expect(permitOpensAt({ ...base, permitType: null }, '2027-07-14')).toBeNull()
    expect(
      permitOpensAt({ ...base, permitType: 'lottery', permitLotteryOpen: 'Feb 1' }, '2027-07-14'),
    ).toBeNull()
  })

  it('falls back to 07:00 on a malformed open time', () => {
    expect(permitOpensAt({ ...base, permitOpenTime: 'soon' }, '2027-07-14')?.toISOString()).toBe(
      '2027-01-13T15:00:00.000Z',
    )
  })
})

describe('permitAlarms', () => {
  const opens = new Date('2027-01-13T15:00:00.000Z')

  it('returns 3-day, 1-day and 15-minute alarms', () => {
    const alarms = permitAlarms(opens, new Date('2027-01-01T00:00:00Z'))
    expect(alarms.map((a) => a.at.toISOString())).toEqual([
      '2027-01-10T15:00:00.000Z',
      '2027-01-12T15:00:00.000Z',
      '2027-01-13T14:45:00.000Z',
    ])
  })

  it('skips alarms already in the past', () => {
    const alarms = permitAlarms(opens, new Date('2027-01-12T20:00:00Z'))
    expect(alarms.map((a) => a.minutesBefore)).toEqual([15])
  })

  it('labels offsets', () => {
    expect(alarmLabel(4320)).toBe('3 days')
    expect(alarmLabel(1440)).toBe('1 day')
    expect(alarmLabel(15)).toBe('15 minutes')
  })
})
