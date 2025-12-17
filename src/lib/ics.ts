/**
 * ICS Calendar File Generation
 *
 * Generates .ics calendar files for permit reminders that work with
 * Google Calendar, Apple Calendar, and Outlook.
 */

/**
 * Format a Date object to ICS datetime format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate an ICS calendar file for a permit reminder
 *
 * Creates a 15-minute event that ENDS when permits open,
 * so the user has time to prepare before the permit window.
 */
export function generatePermitReminderICS({
  siteName,
  permitOpenTime,
  permitUrl,
  siteId,
}: {
  siteName: string
  permitOpenTime: Date
  permitUrl?: string | null
  siteId?: string
}): string {
  // Event starts 15 minutes before permits open
  const eventStart = new Date(permitOpenTime.getTime() - 15 * 60 * 1000)
  // Event ends when permits open
  const eventEnd = permitOpenTime

  // Generate unique ID for the event
  const uid = `permit-${siteId || Date.now()}-${permitOpenTime.getTime()}@chuckfestai.com`

  // Current timestamp for DTSTAMP
  const now = new Date()

  const description = escapeICSText(
    `Permits for ${siteName} are opening!\\n\\n` +
    `Go to ${permitUrl || 'Recreation.gov'} to secure your spot.\\n\\n` +
    `Tips:\\n` +
    `- Log in to recreation.gov in advance\\n` +
    `- Have payment info ready\\n` +
    `- Know your group size and entry date`
  )

  const location = permitUrl || 'https://recreation.gov'

  // Build the ICS content
  // Note: Line breaks in ICS must be CRLF (\r\n)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChuckfestAI//Permit Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(eventStart)}`,
    `DTEND:${formatICSDate(eventEnd)}`,
    `SUMMARY:Permits Open - ${escapeICSText(siteName)}`,
    `DESCRIPTION:${description}`,
    `URL:${location}`,
    // Alarm at event start (when the 15-min prep window begins)
    'BEGIN:VALARM',
    'TRIGGER:PT0M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Permits opening in 15 minutes for ${escapeICSText(siteName)}!`,
    'END:VALARM',
    // Second alarm 5 minutes before permits open
    'BEGIN:VALARM',
    'TRIGGER:PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Permits opening in 5 minutes for ${escapeICSText(siteName)}!`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.join('\r\n')
}

/**
 * Generate a filename for the ICS file
 */
export function generateICSFilename(siteName: string): string {
  const sanitized = siteName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `permit-reminder-${sanitized}.ics`
}
