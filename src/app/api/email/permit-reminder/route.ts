import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { formatDateInLA } from '@/lib/permits'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { PermitReminder, Site, TripYear, Member } from '@/lib/types'

/**
 * POST /api/email/permit-reminder
 *
 * Send permit reminder email to all active members
 * Body: { permitReminderId: string, testEmail?: string }
 *
 * If testEmail is provided, only send to that address (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { permitReminderId, testEmail } = body

    if (!permitReminderId) {
      return NextResponse.json(
        { success: false, error: 'permitReminderId is required' },
        { status: 400 }
      )
    }

    // Fetch the permit reminder with related data
    const { data: reminderData, error: reminderError } = await supabase
      .from('permit_reminders')
      .select(`
        *,
        site:sites(*),
        trip_year:trip_years(*)
      `)
      .eq('id', permitReminderId)
      .single()

    if (reminderError || !reminderData) {
      return NextResponse.json(
        { success: false, error: 'Permit reminder not found' },
        { status: 404 }
      )
    }

    const reminder = reminderData as PermitReminder & { site: Site; trip_year: TripYear }

    // Determine recipients
    let recipients: string[]

    if (testEmail) {
      // Test mode - only send to specified email
      recipients = [testEmail]
    } else {
      // Production mode - fetch all active members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('email')
        .eq('is_active', true)

      if (membersError) {
        throw membersError
      }

      recipients = (members as Pick<Member, 'email'>[]).map(m => m.email)
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients found' },
        { status: 400 }
      )
    }

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

    // Send the email
    const subject = `Permits for ${reminder.site.name} open TOMORROW!`

    const result = await sendEmail({
      to: recipients,
      subject,
      react: emailComponent,
    })

    if (!result.success) {
      console.error('Failed to send permit reminder email:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send email: ${result.error}`,
        },
        { status: 500 }
      )
    }

    // Update reminder status (only if not a test)
    if (!testEmail) {
      await supabase
        .from('permit_reminders')
        .update({ status: 'reminder_sent' })
        .eq('id', permitReminderId)

      // Log to reminders_log
      await supabase.from('reminders_log').insert({
        reminder_type: 'permit_opening',
        reference_id: permitReminderId,
        recipient_count: recipients.length,
        email_subject: subject,
      })
    }

    return NextResponse.json({
      success: true,
      message: testEmail
        ? `Test email sent to ${testEmail}`
        : `Email sent to ${recipients.length} recipients`,
      emailId: result.id,
      recipientCount: recipients.length,
    })
  } catch (error) {
    console.error('Error in POST /api/email/permit-reminder:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
