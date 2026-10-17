import { expect, it } from 'vitest'
import { parseBlackouts } from '@/lib/blackouts'

it('parses single days, ranges, US dates, notes and CSV', () => {
  const text = [
    'start_date,end_date,note',
    '2027-07-04',
    '2027-08-10 to 2027-08-20, Ian\'s wedding',
    '7/10/2027 - 7/12/2027',
    '2027-06-20,2027-06-18,"Reunion"',
    'nothing here',
  ].join('\n')
  expect(parseBlackouts(text)).toEqual([
    { startDate: '2027-07-04', endDate: '2027-07-04', note: null },
    { startDate: '2027-08-10', endDate: '2027-08-20', note: "Ian's wedding" },
    { startDate: '2027-07-10', endDate: '2027-07-12', note: null },
    { startDate: '2027-06-18', endDate: '2027-06-20', note: 'Reunion' },
  ])
})
