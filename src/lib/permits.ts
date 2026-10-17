import { fromZonedTime } from 'date-fns-tz'

export const PERMIT_TZ = 'America/Los_Angeles'

/** Alarms before a permit window opens, in minutes: 3 days, 1 day, 15 minutes. */
export const PERMIT_ALARM_OFFSETS_MIN = [3 * 24 * 60, 24 * 60, 15] as const

export type PermitRules = {
  name: string
  permitType: 'rolling' | 'fixed_date' | 'lottery' | null
  permitAdvanceDays: number | null
  permitOpenTime: string | null
  permitFixedOpenDate: string | null // "MM-DD"
  permitLotteryOpen: string | null // "MM-DD"
}

/** Add days to a YYYY-MM-DD calendar date, returning YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

function parseTime(time: string | null): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? '')
  if (!match) return '07:00'
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

/** A wall-clock time on a calendar date in Pacific time, as a UTC instant. */
export function pacificInstant(isoDate: string, time: string | null): Date {
  return fromZonedTime(`${isoDate}T${parseTime(time)}:00`, PERMIT_TZ)
}

/**
 * The calendar date (Pacific) on which a "MM-DD" yearly date falls before a trip:
 * the trip's year if that date is on or before the trip start, else the year before.
 */
function yearlyDateBefore(monthDay: string, tripStart: string): string {
  const year = Number(tripStart.slice(0, 4))
  const sameYear = `${year}-${monthDay}`
  return sameYear <= tripStart ? sameYear : `${year - 1}-${monthDay}`
}

/**
 * When permits open for a site, for a trip starting on `tripStart` (YYYY-MM-DD).
 * Returns null when the site has no usable permit rules.
 */
export function permitOpensAt(site: PermitRules, tripStart: string): Date | null {
  const time = site.permitOpenTime
  switch (site.permitType) {
    case 'rolling': {
      if (!site.permitAdvanceDays) return null
      return pacificInstant(addDays(tripStart, -site.permitAdvanceDays), time)
    }
    case 'fixed_date': {
      if (!isMonthDay(site.permitFixedOpenDate)) return null
      return pacificInstant(yearlyDateBefore(site.permitFixedOpenDate, tripStart), time)
    }
    case 'lottery': {
      if (!isMonthDay(site.permitLotteryOpen)) return null
      return pacificInstant(yearlyDateBefore(site.permitLotteryOpen, tripStart), time)
    }
    default:
      return null
  }
}

function isMonthDay(value: string | null): value is string {
  return !!value && /^\d{2}-\d{2}$/.test(value)
}

/** The alarm times for a window that opens at `opensAt`, skipping any already past. */
export function permitAlarms(opensAt: Date, now: Date = new Date()) {
  return PERMIT_ALARM_OFFSETS_MIN.map((minutes) => ({
    minutesBefore: minutes,
    at: new Date(opensAt.getTime() - minutes * 60_000),
  })).filter((alarm) => alarm.at > now)
}

/** Human label for an alarm offset, e.g. "3 days", "1 day", "15 minutes". */
export function alarmLabel(minutesBefore: number): string {
  if (minutesBefore % (24 * 60) === 0) {
    const days = minutesBefore / (24 * 60)
    return `${days} day${days === 1 ? '' : 's'}`
  }
  if (minutesBefore % 60 === 0) {
    const hours = minutesBefore / 60
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${minutesBefore} minutes`
}
