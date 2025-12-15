import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, isEmailTestMode, getTestRecipient } from '@/lib/email'
import { getDueReminders, formatDateInLA } from '@/lib/permits'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { TripYear } from '@/lib/types'

/**
 * POST /api/admin/run-reminder-check
 *
 * Manually run the reminder check logic (same as cron job)
 * Respects EMAIL_TEST_MODE settings
 */
export async function POST() {
  const startTime = Date.now()
  const testMode = isEmailTestMode()
  const testRecipient = getTestRecipient()

  console.log(`Manual reminder check started (testMode: ${testMode})`)

  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    testMode,
    testRecipient: testMode ? testRecipient : undefined,
    remindersSent: 0,
    remindersFound: 0,
    errors: [] as string[],
    details: [] as { site: string; success: boolean; error?: string }[],
    wouldHaveSentTo: [] as string[],
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

    // Fetch all active members with names
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

    if (memberList.length === 0) {
      console.warn('No active members to send reminders to')
      results.errors.push('No active members found')
      return NextResponse.json(results)
    }

    // Determine actual recipients based on test mode
    let recipients: string[]
    if (testMode) {
      if (!testRecipient) {
        results.errors.push('EMAIL_TEST_MODE is enabled but EMAIL_TEST_RECIPIENT is not set')
        results.success = false
        return NextResponse.json(results, { status: 500 })
      }
      recipients = [testRecipient]
      results.wouldHaveSentTo = memberNames
      console.log(`TEST MODE: Would send to ${memberList.length} members: ${memberNames.join(', ')}`)
      console.log(`TEST MODE: Actually sending to: ${testRecipient}`)
    } else {
      recipients = allRecipientEmails
      console.log(`Sending to ${recipients.length} recipients`)
    }

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

        const subject = testMode
          ? `[TEST] Permits for ${siteName} open TOMORROW!`
          : `Permits for ${siteName} open TOMORROW!`

        // Send email
        const emailResult = await sendEmail({
          to: recipients,
          subject,
          react: emailComponent,
        })

        if (emailResult.success) {
          // Only update reminder status and log if NOT in test mode
          if (!testMode) {
            await supabase
              .from('permit_reminders')
              .update({ status: 'reminder_sent' })
              .eq('id', reminder.id)

            await supabase.from('reminders_log').insert({
              reminder_type: 'permit_opening',
              reference_id: reminder.id,
              recipient_count: allRecipientEmails.length,
              email_subject: subject,
            })
          }

          results.remindersSent++
          results.details.push({ site: siteName, success: true })
          console.log(`${testMode ? '[TEST] ' : ''}Sent reminder for ${siteName}`)
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
    console.log(`Manual reminder check completed in ${duration}ms. Sent ${results.remindersSent}/${results.remindersFound} reminders`)

    return NextResponse.json(results)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Manual reminder check failed:', errorMsg)

    results.success = false
    results.errors.push(errorMsg)
    return NextResponse.json(results, { status: 500 })
  }
}
