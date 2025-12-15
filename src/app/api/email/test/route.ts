import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import PermitReminderEmail from '@/emails/permit-reminder'

/**
 * POST /api/email/test
 *
 * Send a test email with sample data - no database required!
 * Body: { to: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email address "to" is required' },
        { status: 400 }
      )
    }

    // Create email with sample data
    const emailComponent = PermitReminderEmail({
      siteName: 'East Lake',
      siteRegion: 'Eastern Sierra - Hoover Wilderness',
      permitOpenDatetime: 'January 23, 2025 at 7:00 AM PT',
      tripDates: 'July 23-27, 2025',
      permitUrl: 'https://www.recreation.gov/permits/445856',
      distanceMiles: 4.4,
      elevationGainFt: 1576,
      peakElevationFt: 9476,
      permitNotes: 'Bear canister REQUIRED. Max group size 15. 50% quota reservable in advance, 50% available 3 days before.',
      permitCost: 8,
    })

    const result = await sendEmail({
      to,
      subject: '[TEST] Permits for East Lake open TOMORROW!',
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
      message: `Test email sent to ${to}`,
      emailId: result.id,
    })
  } catch (error) {
    console.error('Error sending test email:', error)
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
 * GET /api/email/test
 *
 * Preview the test email as HTML
 */
export async function GET() {
  const { render } = await import('@react-email/components')

  const emailComponent = PermitReminderEmail({
    siteName: 'East Lake',
    siteRegion: 'Eastern Sierra - Hoover Wilderness',
    permitOpenDatetime: 'January 23, 2025 at 7:00 AM PT',
    tripDates: 'July 23-27, 2025',
    permitUrl: 'https://www.recreation.gov/permits/445856',
    distanceMiles: 4.4,
    elevationGainFt: 1576,
    peakElevationFt: 9476,
    permitNotes: 'Bear canister REQUIRED. Max group size 15. 50% quota reservable in advance, 50% available 3 days before.',
    permitCost: 8,
  })

  const html = await render(emailComponent)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
