import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, isEmailTestMode, getTestRecipient } from '@/lib/email'
import { formatDateInLA } from '@/lib/permits'
import { generatePermitReminderICS, generateICSFilename } from '@/lib/ics'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { PermitReminder, Site, TripYear } from '@/lib/types'

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

    // Check for env-based test mode
    const envTestMode = isEmailTestMode()
    const envTestRecipient = getTestRecipient()

    // Fetch all active members with names
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('email, name')
      .eq('is_active', true)

    if (membersError) {
      throw membersError
    }

    const memberList = members || []
    const allRecipientEmails = memberList.map(m => m.email)
    const memberNames = memberList.map(m => m.name)

    // Determine recipients based on test modes
    let recipients: string[]
    let wouldHaveSentTo: string[] = []
    let isTestMode = false

    if (testEmail) {
      // Explicit testEmail parameter takes precedence
      recipients = [testEmail]
      isTestMode = true
    } else if (envTestMode) {
      // Env-based test mode
      if (!envTestRecipient) {
        return NextResponse.json(
          { success: false, error: 'EMAIL_TEST_MODE is enabled but EMAIL_TEST_RECIPIENT is not set' },
          { status: 500 }
        )
      }
      recipients = [envTestRecipient]
      wouldHaveSentTo = memberNames
      isTestMode = true
      console.log(`TEST MODE: Would send to ${memberList.length} members: ${memberNames.join(', ')}`)
      console.log(`TEST MODE: Actually sending to: ${envTestRecipient}`)
    } else {
      // Production mode
      recipients = allRecipientEmails
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

    // Calculate days until permits open (from reminder time to permit open time)
    const reminderTime = new Date(reminder.reminder_datetime)
    const permitOpenTime = new Date(reminder.permit_open_datetime)
    const msPerDay = 24 * 60 * 60 * 1000
    const daysUntilOpen = Math.round((permitOpenTime.getTime() - reminderTime.getTime()) / msPerDay)

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
      daysUntilOpen,
    })

    // Generate ICS calendar file
    const icsContent = generatePermitReminderICS({
      siteName: reminder.site.name,
      permitOpenTime,
      permitUrl: reminder.site.permit_url,
      siteId: reminder.site.id,
    })
    const icsFilename = generateICSFilename(reminder.site.name)

    // Send the email with dynamic subject based on days until open
    const timeText = daysUntilOpen === 1 ? 'TOMORROW' : `in ${daysUntilOpen} days`
    const subject = isTestMode
      ? `[TEST] Permits for ${reminder.site.name} open ${timeText}!`
      : `Permits for ${reminder.site.name} open ${timeText}!`

    const result = await sendEmail({
      to: recipients,
      subject,
      react: emailComponent,
      attachments: [{
        filename: icsFilename,
        content: Buffer.from(icsContent, 'utf-8'),
        type: 'text/calendar',
      }],
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

    // Update reminder status (only if not in any test mode)
    if (!isTestMode) {
      await supabase
        .from('permit_reminders')
        .update({ status: 'reminder_sent' })
        .eq('id', permitReminderId)

      // Log to reminders_log
      await supabase.from('reminders_log').insert({
        reminder_type: 'permit_opening',
        reference_id: permitReminderId,
        recipient_count: allRecipientEmails.length,
        email_subject: subject,
      })
    }

    return NextResponse.json({
      success: true,
      testMode: isTestMode,
      message: isTestMode
        ? `Test email sent to ${recipients[0]}`
        : `Email sent to ${recipients.length} recipients`,
      emailId: result.id,
      recipientCount: isTestMode ? allRecipientEmails.length : recipients.length,
      actualRecipients: recipients.length,
      wouldHaveSentTo: wouldHaveSentTo.length > 0 ? wouldHaveSentTo : undefined,
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
