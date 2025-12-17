import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, isEmailTestMode, getTestRecipient } from '@/lib/email'
import { formatDateInLA } from '@/lib/permits'
import { generatePermitReminderICS, generateICSFilename } from '@/lib/ics'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { TripYear, Site } from '@/lib/types'

/**
 * POST /api/permit-reminders/[id]/send
 *
 * Manually send a specific permit reminder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testMode = isEmailTestMode()
    const testRecipient = getTestRecipient()

    // Fetch the reminder with site data
    const { data: reminderData, error: reminderError } = await supabase
      .from('permit_reminders')
      .select(`
        *,
        site:sites(*)
      `)
      .eq('id', id)
      .single()

    if (reminderError || !reminderData) {
      return NextResponse.json(
        { success: false, error: 'Permit reminder not found' },
        { status: 404 }
      )
    }

    const reminder = reminderData as { id: string; trip_year_id: string; permit_open_datetime: string; reminder_datetime: string; site: Site }

    // Fetch trip year
    const { data: tripYearData } = await supabase
      .from('trip_years')
      .select('*')
      .eq('id', reminder.trip_year_id)
      .single()

    const tripYear = tripYearData as TripYear | null

    // Fetch members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('email, name')
      .eq('is_active', true)

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

    const memberList = members || []
    const allRecipientEmails = memberList.map(m => m.email)
    const memberNames = memberList.map(m => m.name)

    // Determine recipients
    let recipients: string[]
    let wouldHaveSentTo: string[] = []

    if (testMode) {
      if (!testRecipient) {
        return NextResponse.json(
          { success: false, error: 'EMAIL_TEST_MODE is enabled but EMAIL_TEST_RECIPIENT is not set' },
          { status: 500 }
        )
      }
      recipients = [testRecipient]
      wouldHaveSentTo = memberNames
    } else {
      recipients = allRecipientEmails
    }

    // Format dates
    const permitOpenFormatted = formatDateInLA(reminder.permit_open_datetime)
    let tripDatesFormatted = 'TBD'
    if (tripYear?.final_start_date) {
      const tripStart = new Date(tripYear.final_start_date)
      const tripEnd = tripYear.final_end_date
        ? new Date(tripYear.final_end_date)
        : null

      tripDatesFormatted = tripEnd
        ? `${tripStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${tripEnd.getDate()}, ${tripStart.getFullYear()}`
        : tripStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

    // Calculate days until permits open
    const reminderTime = new Date(reminder.reminder_datetime)
    const permitOpenTime = new Date(reminder.permit_open_datetime)
    const msPerDay = 24 * 60 * 60 * 1000
    const daysUntilOpen = Math.round((permitOpenTime.getTime() - reminderTime.getTime()) / msPerDay)

    // Create email
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
    const icsBuffer = Buffer.from(icsContent, 'utf-8')

    // Dynamic subject based on days until open
    const timeText = daysUntilOpen === 1 ? 'TOMORROW' : `in ${daysUntilOpen} days`
    const subject = testMode
      ? `[TEST] Permits for ${reminder.site.name} open ${timeText}!`
      : `Permits for ${reminder.site.name} open ${timeText}!`

    // Send email with ICS attachment
    const emailResult = await sendEmail({
      to: recipients,
      subject,
      react: emailComponent,
      attachments: [{
        filename: icsFilename,
        content: icsBuffer,
      }],
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: emailResult.error },
        { status: 500 }
      )
    }

    // Update status if not in test mode
    if (!testMode) {
      await supabase
        .from('permit_reminders')
        .update({ status: 'reminder_sent' })
        .eq('id', id)

      await supabase.from('reminders_log').insert({
        reminder_type: 'permit_opening',
        reference_id: id,
        recipient_count: allRecipientEmails.length,
        email_subject: subject,
      })
    }

    return NextResponse.json({
      success: true,
      testMode,
      message: testMode
        ? `Test email sent to ${testRecipient}`
        : `Email sent to ${recipients.length} recipients`,
      wouldHaveSentTo: wouldHaveSentTo.length > 0 ? wouldHaveSentTo : undefined,
    })
  } catch (error) {
    console.error('Error in POST /api/permit-reminders/[id]/send:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
