import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { getDueReminders, formatDateInLA } from '@/lib/permits'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { PermitReminder, Site, TripYear, Member } from '@/lib/types'

interface SendResult {
  reminderId: string
  siteName: string
  success: boolean
  error?: string
  recipientCount?: number
}

/**
 * POST /api/email/send-due-reminders
 *
 * Find all due reminders and send emails for each
 * This endpoint is designed to be called by a cron job
 *
 * Optional body: { dryRun: boolean } - if true, just report what would be sent
 */
export async function POST(request: NextRequest) {
  try {
    let dryRun = false

    try {
      const body = await request.json()
      dryRun = body?.dryRun === true
    } catch {
      // No body is fine
    }

    // Get all due reminders
    const dueReminders = await getDueReminders()

    if (dueReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No due reminders to send',
        sent: 0,
        results: [],
      })
    }

    // Fetch all active members (we'll send to the same list for each reminder)
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('email')
      .eq('is_active', true)

    if (membersError) {
      throw membersError
    }

    const recipients = (members as Pick<Member, 'email'>[]).map(m => m.email)

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active members to send to',
        sent: 0,
      })
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: `DRY RUN: Would send ${dueReminders.length} reminder(s) to ${recipients.length} recipients`,
        dryRun: true,
        reminders: dueReminders.map(r => ({
          id: r.id,
          siteName: r.site.name,
          permitOpenDatetime: r.permit_open_datetime,
        })),
        recipients,
      })
    }

    // Send each reminder
    const results: SendResult[] = []

    for (const reminder of dueReminders) {
      try {
        // We need to fetch the trip_year data since getDueReminders only includes site
        const { data: tripYearData } = await supabase
          .from('trip_years')
          .select('*')
          .eq('id', reminder.trip_year_id)
          .single()

        const tripYear = tripYearData as TripYear | null

        // Format dates for the email
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

        const subject = `Permits for ${reminder.site.name} open TOMORROW!`

        const result = await sendEmail({
          to: recipients,
          subject,
          react: emailComponent,
        })

        if (result.success) {
          // Update reminder status
          await supabase
            .from('permit_reminders')
            .update({ status: 'reminder_sent' })
            .eq('id', reminder.id)

          // Log to reminders_log
          await supabase.from('reminders_log').insert({
            reminder_type: 'permit_opening',
            reference_id: reminder.id,
            recipient_count: recipients.length,
            email_subject: subject,
          })

          results.push({
            reminderId: reminder.id,
            siteName: reminder.site.name,
            success: true,
            recipientCount: recipients.length,
          })
        } else {
          results.push({
            reminderId: reminder.id,
            siteName: reminder.site.name,
            success: false,
            error: result.error,
          })
        }
      } catch (err) {
        console.error(`Error sending reminder for ${reminder.site.name}:`, err)
        results.push({
          reminderId: reminder.id,
          siteName: reminder.site.name,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failCount === 0,
      message: `Sent ${successCount} of ${results.length} reminders`,
      sent: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error('Error in POST /api/email/send-due-reminders:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/send-due-reminders
 *
 * Check what reminders are due (without sending)
 */
export async function GET() {
  try {
    const dueReminders = await getDueReminders()

    return NextResponse.json({
      success: true,
      count: dueReminders.length,
      reminders: dueReminders.map(r => ({
        id: r.id,
        siteName: r.site.name,
        reminderDatetime: r.reminder_datetime,
        permitOpenDatetime: r.permit_open_datetime,
        status: r.status,
      })),
    })
  } catch (error) {
    console.error('Error in GET /api/email/send-due-reminders:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
