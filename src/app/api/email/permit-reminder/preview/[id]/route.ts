import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/components'
import { supabase } from '@/lib/supabase'
import { formatDateInLA } from '@/lib/permits'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { PermitReminder, Site, TripYear } from '@/lib/types'

/**
 * GET /api/email/permit-reminder/preview/[id]
 *
 * Render the permit reminder email as HTML for preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch the permit reminder with related data
    const { data: reminderData, error: reminderError } = await supabase
      .from('permit_reminders')
      .select(`
        *,
        site:sites(*),
        trip_year:trip_years(*)
      `)
      .eq('id', id)
      .single()

    if (reminderError || !reminderData) {
      return new NextResponse(
        `<html><body><h1>Permit reminder not found</h1><p>ID: ${id}</p></body></html>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    const reminder = reminderData as PermitReminder & { site: Site; trip_year: TripYear }

    // Format dates for the email
    const permitOpenFormatted = formatDateInLA(reminder.permit_open_datetime)
    const tripStart = new Date(reminder.trip_year.final_start_date!)
    const tripEnd = reminder.trip_year.final_end_date
      ? new Date(reminder.trip_year.final_end_date)
      : null

    const tripDatesFormatted = tripEnd
      ? `${tripStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${tripEnd.getDate()}, ${tripStart.getFullYear()}`
      : tripStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    // Create the email component
    const emailComponent = PermitReminderEmail({
      siteName: reminder.site.name,
      siteRegion: reminder.site.region || undefined,
      permitOpenDatetime: permitOpenFormatted,
      tripDates: tripDatesFormatted,
      permitUrl: reminder.site.permit_url || undefined,
      distanceMiles: reminder.site.distance_miles || undefined,
      elevationGainFt: reminder.site.elevation_gain_ft || undefined,
      peakElevationFt: reminder.site.peak_elevation_ft || undefined,
      permitNotes: reminder.site.permit_notes || undefined,
      permitCost: reminder.site.permit_cost || undefined,
    })

    // Render to HTML
    const html = await render(emailComponent)

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error rendering email preview:', error)
    return new NextResponse(
      `<html><body><h1>Error rendering email</h1><pre>${error instanceof Error ? error.message : 'Unknown error'}</pre></body></html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }
}
