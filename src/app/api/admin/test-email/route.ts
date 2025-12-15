import { NextResponse } from 'next/server'
import { sendEmail, getTestRecipient } from '@/lib/email'
import PermitReminderEmail from '@/emails/permit-reminder'

/**
 * POST /api/admin/test-email
 *
 * Send a test permit reminder email to EMAIL_TEST_RECIPIENT
 */
export async function POST() {
  try {
    const testRecipient = getTestRecipient()

    if (!testRecipient) {
      return NextResponse.json(
        { success: false, error: 'EMAIL_TEST_RECIPIENT is not configured' },
        { status: 400 }
      )
    }

    // Create a sample email
    const emailComponent = PermitReminderEmail({
      siteName: 'Sample Wilderness Area',
      siteRegion: 'Sierra Nevada',
      permitOpenDatetime: 'January 15, 2026 at 7:00 AM PT',
      tripDates: 'July 15-19, 2026',
      permitUrl: 'https://recreation.gov',
      distanceMiles: 24,
      elevationGainFt: 4500,
      peakElevationFt: 12000,
      permitNotes: 'This is a test email from ChuckfestAI Admin.',
      permitCost: 15,
    })

    const result = await sendEmail({
      to: testRecipient,
      subject: '[TEST] ChuckfestAI - Sample Permit Reminder',
      react: emailComponent,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testRecipient}`,
      emailId: result.id
    })
  } catch (error) {
    console.error('Error in POST /api/admin/test-email:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
