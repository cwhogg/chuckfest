import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { getDueReminders, formatDateInLA } from '@/lib/permits'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { TripYear } from '@/lib/types'

/**
 * GET /api/cron/check-reminders
 *
 * Vercel Cron Job endpoint - runs daily to check and send due permit reminders.
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Schedule: 0 14 * * * (14:00 UTC = 6am PT / 7am PT)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized cron request attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('Cron job started: check-reminders')

  const results = {
    checked: true,
    timestamp: new Date().toISOString(),
    remindersSent: 0,
    remindersFound: 0,
    errors: [] as string[],
    details: [] as { site: string; success: boolean; error?: string }[],
  }

  try {
    // Get all due reminders
    const dueReminders = await getDueReminders()
    results.remindersFound = dueReminders.length

    console.log(`Found ${dueReminders.length} due reminders`)

    if (dueReminders.length === 0) {
      console.log('No due reminders to send')
      return NextResponse.json(results)
    }

    // Fetch all active members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('email')
      .eq('is_active', true)

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

    const recipients = members?.map(m => m.email) || []

    if (recipients.length === 0) {
      console.warn('No active members to send reminders to')
      results.errors.push('No active members found')
      return NextResponse.json(results)
    }

    console.log(`Sending to ${recipients.length} recipients`)

    // Process each reminder
    for (const reminder of dueReminders) {
      const siteName = reminder.site.name

      try {
        // Fetch trip year data
        const { data: tripYearData } = await supabase
          .from('trip_years')
          .select('*')
          .eq('id', reminder.trip_year_id)
          .single()

        const tripYear = tripYearData as TripYear | null

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
        })

        const subject = `Permits for ${siteName} open TOMORROW!`

        // Send email
        const emailResult = await sendEmail({
          to: recipients,
          subject,
          react: emailComponent,
        })

        if (emailResult.success) {
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

          results.remindersSent++
          results.details.push({ site: siteName, success: true })
          console.log(`Sent reminder for ${siteName}`)
        } else {
          const errorMsg = `Failed to send email for ${siteName}: ${emailResult.error}`
          results.errors.push(errorMsg)
          results.details.push({ site: siteName, success: false, error: emailResult.error })
          console.error(errorMsg)
        }
      } catch (err) {
        const errorMsg = `Error processing ${siteName}: ${err instanceof Error ? err.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        results.details.push({ site: siteName, success: false, error: errorMsg })
        console.error(errorMsg)
      }
    }

    const duration = Date.now() - startTime
    console.log(`Cron job completed in ${duration}ms. Sent ${results.remindersSent}/${results.remindersFound} reminders`)

    return NextResponse.json(results)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Cron job failed:', errorMsg)

    results.errors.push(errorMsg)
    return NextResponse.json(results, { status: 500 })
  }
}
