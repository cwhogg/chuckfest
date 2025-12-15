import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, isEmailTestMode, getTestRecipient } from '@/lib/email'
import { getDueReminders, formatDateInLA } from '@/lib/permits'
import PermitReminderEmail from '@/emails/permit-reminder'
import type { TripYear } from '@/lib/types'

/**
 * POST /api/cron/check-reminders/test
 *
 * Manual test endpoint for the cron job.
 * Only works in development mode - does NOT require CRON_SECRET.
 *
 * Body (optional):
 *   - dryRun: boolean - if true, don't actually send emails or update status
 *   - testEmail: string - if provided, send all emails to this address instead
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    )
  }

  const startTime = Date.now()

  let dryRun = false
  let testEmail: string | null = null

  try {
    const body = await request.json()
    dryRun = body?.dryRun === true
    testEmail = body?.testEmail || null
  } catch {
    // No body is fine
  }

  // Check env-based test mode if no explicit testEmail provided
  const envTestMode = isEmailTestMode()
  const envTestRecipient = getTestRecipient()

  // Use env test recipient if no explicit testEmail and env test mode is enabled
  if (!testEmail && envTestMode && envTestRecipient) {
    testEmail = envTestRecipient
  }

  console.log(`Test cron job started (dryRun: ${dryRun}, testEmail: ${testEmail || 'none'}, envTestMode: ${envTestMode})`)

  const results = {
    checked: true,
    timestamp: new Date().toISOString(),
    mode: dryRun ? 'dry-run' : 'live',
    testMode: envTestMode || !!testEmail,
    testEmail: testEmail || undefined,
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

    // Determine actual recipients based on test mode
    let recipients: string[]
    if (testEmail) {
      recipients = [testEmail]
      results.wouldHaveSentTo = memberNames
      console.log(`TEST MODE: Would send to ${memberList.length} members: ${memberNames.join(', ')}`)
      console.log(`TEST MODE: Actually sending to: ${testEmail}`)
    } else {
      recipients = allRecipientEmails
      console.log(`Sending to ${recipients.length} recipients`)
    }

    if (recipients.length === 0) {
      results.errors.push('No recipients found')
      return NextResponse.json(results)
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

        if (dryRun) {
          console.log(`[DRY RUN] Would send reminder for ${siteName}`)
          results.details.push({ site: siteName, success: true })
          results.remindersSent++
          continue
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

        const subject = testEmail
          ? `[TEST] Permits for ${siteName} open TOMORROW!`
          : `Permits for ${siteName} open TOMORROW!`

        // Send email
        const emailResult = await sendEmail({
          to: recipients,
          subject,
          react: emailComponent,
        })

        if (emailResult.success) {
          // Only update status if not using testEmail
          if (!testEmail) {
            await supabase
              .from('permit_reminders')
              .update({ status: 'reminder_sent' })
              .eq('id', reminder.id)

            await supabase.from('reminders_log').insert({
              reminder_type: 'permit_opening',
              reference_id: reminder.id,
              recipient_count: recipients.length,
              email_subject: subject,
            })
          }

          results.remindersSent++
          results.details.push({ site: siteName, success: true })
          console.log(`Sent reminder for ${siteName}`)
        } else {
          const errorMsg = `Failed to send: ${emailResult.error}`
          results.errors.push(`${siteName}: ${errorMsg}`)
          results.details.push({ site: siteName, success: false, error: errorMsg })
          console.error(`Failed to send for ${siteName}:`, emailResult.error)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(`${siteName}: ${errorMsg}`)
        results.details.push({ site: siteName, success: false, error: errorMsg })
        console.error(`Error processing ${siteName}:`, err)
      }
    }

    const duration = Date.now() - startTime
    console.log(`Test cron completed in ${duration}ms`)

    return NextResponse.json(results)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Test cron failed:', errorMsg)

    results.errors.push(errorMsg)
    return NextResponse.json(results, { status: 500 })
  }
}

/**
 * GET /api/cron/check-reminders/test
 *
 * Check what the cron would do without sending anything
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test endpoint not available in production' },
      { status: 403 }
    )
  }

  try {
    const dueReminders = await getDueReminders()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      dueReminders: dueReminders.map(r => ({
        id: r.id,
        site: r.site.name,
        reminderDatetime: r.reminder_datetime,
        permitOpenDatetime: r.permit_open_datetime,
        status: r.status,
      })),
      count: dueReminders.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
