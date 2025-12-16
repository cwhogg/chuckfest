/**
 * Date utilities for Chuckfest trip planning
 *
 * Chuckfest trips are always Wednesday-Sunday (5 days)
 * Valid date range: June 1 through August 14 each year
 */

export interface DateOption {
  startDate: Date
  endDate: Date
  label: string
}

/**
 * Generates all possible Wednesday-Sunday trip windows
 * between June 1 and August 14 for a given year
 */
export function generateDateOptions(year: number): DateOption[] {
  const options: DateOption[] = []

  // Start from June 1
  const rangeStart = new Date(year, 5, 1) // June 1 (months are 0-indexed)
  // End by August 14 (trip must END by Aug 14, so last start is Aug 10)
  const rangeEnd = new Date(year, 7, 14) // August 14

  // Find the first Wednesday on or after June 1
  let current = new Date(rangeStart)
  const dayOfWeek = current.getDay()
  // Wednesday is day 3
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7
  current.setDate(current.getDate() + daysUntilWednesday)

  // Generate all Wednesday-Sunday windows
  while (true) {
    const startDate = new Date(current)
    const endDate = new Date(current)
    endDate.setDate(endDate.getDate() + 4) // Wednesday + 4 = Sunday

    // Check if the end date is within range
    if (endDate > rangeEnd) {
      break
    }

    // Format label like "Jun 4-8" or "Jul 16-20"
    const label = formatDateRange(startDate, endDate)

    options.push({
      startDate,
      endDate,
      label
    })

    // Move to next Wednesday
    current.setDate(current.getDate() + 7)
  }

  return options
}

/**
 * Format a date range as "Jun 4-8" or "Jun 28-Jul 2"
 */
function formatDateRange(start: Date, end: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const startMonth = months[start.getMonth()]
  const endMonth = months[end.getMonth()]
  const startDay = start.getDate()
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`
  } else {
    return `${startMonth} ${startDay}-${endMonth} ${endDay}`
  }
}

/**
 * Format a date as YYYY-MM-DD for database storage
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
