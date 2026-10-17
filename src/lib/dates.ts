import { addDays } from './permits'

export type DateWindow = { startDate: string; endDate: string }
export type Blackout = { startDate: string; endDate: string }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Day of week (0 = Sunday) for a YYYY-MM-DD date. */
export function weekday(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** "Wed Jun 3" */
export function shortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${WEEKDAYS[weekday(isoDate)]} ${MONTHS[m - 1]} ${d}`
}

/** "Jun 3 – 7", "Jun 29 – Jul 3", or "Jul 4" for a single day */
export function rangeLabel({ startDate, endDate }: DateWindow): string {
  const [, sm, sd] = startDate.split('-').map(Number)
  const [, em, ed] = endDate.split('-').map(Number)
  if (startDate === endDate) return `${MONTHS[sm - 1]} ${sd}`
  return sm === em ? `${MONTHS[sm - 1]} ${sd} – ${ed}` : `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}`
}

export function overlaps(a: DateWindow, b: Blackout): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate
}

/**
 * Candidate trip windows: every `startWeekday` between `from` and `to` (inclusive),
 * each `nights` long, dropping any window that touches a blackout range.
 */
export function generateWindows(
  opts: { from: string; to: string; startWeekday: number; nights: number },
  blackouts: Blackout[] = [],
): DateWindow[] {
  let start = opts.from
  while (weekday(start) !== opts.startWeekday) start = addDays(start, 1)
  const windows: DateWindow[] = []
  for (; ; start = addDays(start, 7)) {
    const endDate = addDays(start, opts.nights)
    if (endDate > opts.to) break
    const w = { startDate: start, endDate }
    if (!blackouts.some((b) => overlaps(w, b))) windows.push(w)
  }
  return windows
}

export type DateTally = { yes: number; maybe: number; no: number }

/** Rank windows: most "yes", then most "maybe", then fewest "no", then earliest. */
export function rankWindows<T extends DateWindow & DateTally>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no || a.startDate.localeCompare(b.startDate),
  )
}
