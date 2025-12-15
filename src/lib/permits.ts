import { subDays, setHours, setMinutes, setSeconds, setMilliseconds, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { supabase } from './supabase'
import type { Site, TripYear, PermitReminder, PermitReminderInsert } from './types'

const LA_TIMEZONE = 'America/Los_Angeles'

/**
 * Parse a time string like "07:00" into hours and minutes
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours: hours || 7, minutes: minutes || 0 }
}

/**
 * Set a specific time on a date in LA timezone, then convert to UTC
 */
function setTimeInLA(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTimeString(timeStr)

  // Convert the date to LA timezone
  const laDate = toZonedTime(date, LA_TIMEZONE)

  // Set the time components
  let adjusted = setHours(laDate, hours)
  adjusted = setMinutes(adjusted, minutes)
  adjusted = setSeconds(adjusted, 0)
  adjusted = setMilliseconds(adjusted, 0)

  // Convert back to UTC
  return fromZonedTime(adjusted, LA_TIMEZONE)
}

/**
 * Calculate when permits open for a given site and trip start date
 *
 * @param site - The site with permit rules
 * @param tripStartDate - The date the trip starts
 * @returns Date object representing when permits open (in UTC, but calculated for LA timezone)
 */
export function calculatePermitOpenDatetime(site: Site, tripStartDate: Date): Date {
  const openTime = site.permit_open_time || '07:00'
  const tripYear = tripStartDate.getFullYear()

  switch (site.permit_type) {
    case 'rolling': {
      if (!site.permit_advance_days) {
        console.warn(`Site ${site.name} has rolling permits but no permit_advance_days set`)
        // Default to 180 days if not specified
        const advanceDays = 180
        const openDate = subDays(tripStartDate, advanceDays)
        return setTimeInLA(openDate, openTime)
      }

      const openDate = subDays(tripStartDate, site.permit_advance_days)
      return setTimeInLA(openDate, openTime)
    }

    case 'fixed_date': {
      if (!site.permit_fixed_open_date) {
        throw new Error(`Site ${site.name} has fixed_date permits but no permit_fixed_open_date set`)
      }

      // Parse "MM-DD" format
      const [month, day] = site.permit_fixed_open_date.split('-').map(Number)

      // Determine which year to use
      // If the fixed date is before the trip date in the same year, use the trip year
      // Otherwise, use the year before (for permits that open late in the year for next year's trips)
      let openYear = tripYear
      const fixedDateThisYear = new Date(tripYear, month - 1, day)

      // If the trip is early in the year and fixed date would be after trip, use previous year
      if (fixedDateThisYear > tripStartDate) {
        openYear = tripYear - 1
      }

      const openDate = new Date(openYear, month - 1, day)
      return setTimeInLA(openDate, openTime)
    }

    case 'lottery': {
      if (!site.permit_lottery_open) {
        throw new Error(`Site ${site.name} has lottery permits but no permit_lottery_open set`)
      }

      // Parse "MM-DD" format
      const [month, day] = site.permit_lottery_open.split('-').map(Number)

      // Lottery typically opens in the year before the trip
      // e.g., for summer 2025 trips, lottery opens in Feb 2025 or late 2024
      let lotteryYear = tripYear
      const lotteryDateThisYear = new Date(tripYear, month - 1, day)

      // If lottery date would be after trip start, use previous year
      if (lotteryDateThisYear > tripStartDate) {
        lotteryYear = tripYear - 1
      }

      const openDate = new Date(lotteryYear, month - 1, day)
      return setTimeInLA(openDate, openTime)
    }

    default:
      throw new Error(`Unknown permit type: ${site.permit_type} for site ${site.name}`)
  }
}

/**
 * Calculate when to send a reminder (24 hours before permits open)
 *
 * @param permitOpenDatetime - When permits open
 * @returns Date object for when to send the reminder
 */
export function calculateReminderDatetime(permitOpenDatetime: Date): Date {
  return subDays(permitOpenDatetime, 1)
}

/**
 * Generate permit reminder objects for a trip year and list of sites
 *
 * @param tripYear - The trip year (must have final_start_date set)
 * @param sites - Array of sites to generate reminders for
 * @returns Array of PermitReminderInsert objects ready to insert
 */
export function generatePermitReminders(
  tripYear: TripYear,
  sites: Site[]
): PermitReminderInsert[] {
  if (!tripYear.final_start_date) {
    throw new Error('Trip year must have final_start_date set to generate permit reminders')
  }

  const tripStartDate = parseISO(tripYear.final_start_date)
  const now = new Date()
  const reminders: PermitReminderInsert[] = []

  for (const site of sites) {
    // Skip sites without permit type defined
    if (!site.permit_type) {
      console.log(`Skipping ${site.name}: no permit_type defined`)
      continue
    }

    try {
      const permitOpenDatetime = calculatePermitOpenDatetime(site, tripStartDate)

      // Skip if permit open date is in the past
      if (permitOpenDatetime < now) {
        console.log(`Skipping ${site.name}: permits already opened on ${permitOpenDatetime.toISOString()}`)
        continue
      }

      const reminderDatetime = calculateReminderDatetime(permitOpenDatetime)

      reminders.push({
        trip_year_id: tripYear.id,
        site_id: site.id,
        target_trip_date: tripYear.final_start_date,
        permit_open_datetime: permitOpenDatetime.toISOString(),
        reminder_datetime: reminderDatetime.toISOString(),
        status: 'pending'
      })

      console.log(`Generated reminder for ${site.name}: opens ${permitOpenDatetime.toISOString()}, remind ${reminderDatetime.toISOString()}`)
    } catch (error) {
      console.error(`Error generating reminder for ${site.name}:`, error)
    }
  }

  return reminders
}

/**
 * Get upcoming permit reminders from the database
 *
 * @param days - Number of days to look ahead (default 30)
 * @returns Array of PermitReminder objects with site details
 */
export async function getUpcomingReminders(days: number = 30): Promise<(PermitReminder & { site: Site })[]> {
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('permit_reminders')
    .select(`
      *,
      site:sites(*)
    `)
    .eq('status', 'pending')
    .gte('reminder_datetime', now.toISOString())
    .lte('reminder_datetime', futureDate.toISOString())
    .order('reminder_datetime', { ascending: true })

  if (error) {
    console.error('Error fetching upcoming reminders:', error)
    throw error
  }

  return data as (PermitReminder & { site: Site })[]
}

/**
 * Get reminders that are due to be sent now
 *
 * @returns Array of PermitReminder objects that should be sent
 */
export async function getDueReminders(): Promise<(PermitReminder & { site: Site })[]> {
  const now = new Date()

  const { data, error } = await supabase
    .from('permit_reminders')
    .select(`
      *,
      site:sites(*)
    `)
    .eq('status', 'pending')
    .lte('reminder_datetime', now.toISOString())
    .order('reminder_datetime', { ascending: true })

  if (error) {
    console.error('Error fetching due reminders:', error)
    throw error
  }

  return data as (PermitReminder & { site: Site })[]
}

/**
 * Insert permit reminders into the database
 *
 * @param reminders - Array of PermitReminderInsert objects
 * @returns Array of inserted PermitReminder objects
 */
export async function insertPermitReminders(
  reminders: PermitReminderInsert[]
): Promise<PermitReminder[]> {
  if (reminders.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('permit_reminders')
    .insert(reminders)
    .select()

  if (error) {
    console.error('Error inserting permit reminders:', error)
    throw error
  }

  return data as PermitReminder[]
}

/**
 * Update a permit reminder's status
 *
 * @param id - The reminder ID
 * @param status - New status
 * @returns Updated PermitReminder
 */
export async function updateReminderStatus(
  id: string,
  status: PermitReminder['status']
): Promise<PermitReminder> {
  const { data, error } = await supabase
    .from('permit_reminders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating reminder status:', error)
    throw error
  }

  return data as PermitReminder
}

/**
 * Format a date for display in LA timezone
 */
export function formatDateInLA(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const laDate = toZonedTime(d, LA_TIMEZONE)

  return laDate.toLocaleString('en-US', {
    timeZone: LA_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}
