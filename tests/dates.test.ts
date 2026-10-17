import { describe, expect, it } from 'vitest'
import { generateWindows, rangeLabel, rankWindows, shortDate, weekday } from '@/lib/dates'

describe('generateWindows', () => {
  const summer = { from: '2027-06-01', to: '2027-08-31', startWeekday: 3, nights: 4 }

  it('makes Wed–Sun windows across the summer', () => {
    const w = generateWindows(summer)
    expect(w[0]).toEqual({ startDate: '2027-06-02', endDate: '2027-06-06' })
    expect(w.at(-1)).toEqual({ startDate: '2027-08-25', endDate: '2027-08-29' })
    expect(w.every((x) => weekday(x.startDate) === 3 && weekday(x.endDate) === 0)).toBe(true)
    expect(w).toHaveLength(13)
  })

  it('drops windows that touch a blackout range', () => {
    const w = generateWindows(summer, [
      { startDate: '2027-07-04', endDate: '2027-07-04' },
      { startDate: '2027-08-10', endDate: '2027-08-20' },
    ])
    const starts = w.map((x) => x.startDate)
    expect(starts).not.toContain('2027-06-30') // Jun 30 – Jul 4
    expect(starts).not.toContain('2027-08-11')
    expect(starts).not.toContain('2027-08-18')
    expect(starts).toContain('2027-07-07')
    expect(w).toHaveLength(10)
  })
})

describe('labels', () => {
  it('formats dates and ranges', () => {
    expect(shortDate('2027-06-02')).toBe('Wed Jun 2')
    expect(rangeLabel({ startDate: '2027-06-02', endDate: '2027-06-06' })).toBe('Jun 2 – 6')
    expect(rangeLabel({ startDate: '2027-06-30', endDate: '2027-07-04' })).toBe('Jun 30 – Jul 4')
    expect(rangeLabel({ startDate: '2027-07-04', endDate: '2027-07-04' })).toBe('Jul 4')
  })
})

describe('rankWindows', () => {
  it('orders by yes, then maybe, then fewest no, then date', () => {
    const rows = [
      { startDate: '2027-06-09', endDate: '2027-06-13', yes: 5, maybe: 1, no: 0 },
      { startDate: '2027-06-02', endDate: '2027-06-06', yes: 5, maybe: 1, no: 2 },
      { startDate: '2027-06-16', endDate: '2027-06-20', yes: 6, maybe: 0, no: 3 },
      { startDate: '2027-06-23', endDate: '2027-06-27', yes: 5, maybe: 1, no: 0 },
    ]
    expect(rankWindows(rows).map((r) => r.startDate)).toEqual([
      '2027-06-16',
      '2027-06-09',
      '2027-06-23',
      '2027-06-02',
    ])
  })
})
