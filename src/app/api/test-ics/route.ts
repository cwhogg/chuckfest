import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { generatePermitReminderICS, generateICSFilename } from '@/lib/ics'

/**
 * GET /api/test-ics?email=your@email.com
 *
 * Test endpoint to verify ICS attachments are working
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email query param required' }, { status: 400 })
  }

  // Generate a test ICS file for tomorrow at 7am Pacific
  const testPermitTime = new Date()
  testPermitTime.setDate(testPermitTime.getDate() + 1)
  testPermitTime.setHours(7, 0, 0, 0)

  const icsContent = generatePermitReminderICS({
    siteName: 'Test Site',
    permitOpenTime: testPermitTime,
    permitUrl: 'https://recreation.gov',
  })

  const icsFilename = generateICSFilename('Test Site')
  const icsBuffer = Buffer.from(icsContent, 'utf-8')

  console.log('=== ICS ATTACHMENT TEST ===')
  console.log('ICS filename:', icsFilename)
  console.log('ICS content length:', icsContent.length)
  console.log('ICS buffer length:', icsBuffer.length)
  console.log('ICS content preview:', icsContent.substring(0, 200))
  console.log('Sending to:', email)

  // Create a simple React element for the email body
  const { Html, Body, Container, Text } = await import('@react-email/components')
  const React = await import('react')

  const TestEmail = React.createElement(
    Html,
    null,
    React.createElement(
      Body,
      null,
      React.createElement(
        Container,
        null,
        React.createElement(Text, null, 'This email should have an ICS calendar attachment.'),
        React.createElement(Text, null, 'Check your email client for the attached .ics file.'),
        React.createElement(Text, null, `Permit opens: ${testPermitTime.toISOString()}`)
      )
    )
  )

  const attachments = [{
    filename: icsFilename,
    content: icsBuffer,
  }]

  console.log('Attachments being sent:', JSON.stringify(attachments.map(a => ({
    filename: a.filename,
    contentLength: a.content.length,
    contentType: typeof a.content,
  }))))

  try {
    const result = await sendEmail({
      to: [email],
      subject: '[TEST] ICS Attachment Test',
      react: TestEmail,
      attachments,
    })

    console.log('Email send result:', JSON.stringify(result))

    return NextResponse.json({
      success: true,
      result,
      debug: {
        icsFilename,
        icsContentLength: icsContent.length,
        icsBufferLength: icsBuffer.length,
        attachmentsCount: attachments.length,
      }
    })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
