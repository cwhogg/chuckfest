import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey) {
  console.warn('RESEND_API_KEY not set - emails will not be sent')
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

// Test mode configuration
export const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true'
export const EMAIL_TEST_RECIPIENT = process.env.EMAIL_TEST_RECIPIENT || ''

/**
 * Check if email test mode is enabled
 */
export function isEmailTestMode(): boolean {
  return EMAIL_TEST_MODE
}

/**
 * Get the test recipient email, or null if not configured
 */
export function getTestRecipient(): string | null {
  if (!EMAIL_TEST_MODE) return null
  if (!EMAIL_TEST_RECIPIENT) {
    console.warn('EMAIL_TEST_MODE is true but EMAIL_TEST_RECIPIENT is not set')
    return null
  }
  return EMAIL_TEST_RECIPIENT
}

export interface EmailAttachment {
  filename: string
  content: string // Base64 encoded content
  contentType?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  react: React.ReactElement
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!resend) {
    console.error('Resend client not initialized - RESEND_API_KEY missing')
    return {
      success: false,
      error: 'Email service not configured'
    }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `ChuckfestAI <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      react: options.react,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })),
    })

    if (error) {
      console.error('Resend error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    console.log('Email sent successfully:', data?.id)
    return {
      success: true,
      id: data?.id
    }
  } catch (err) {
    console.error('Error sending email:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Send emails to multiple recipients (batched)
 */
export async function sendBatchEmails(
  recipients: string[],
  subject: string,
  react: React.ReactElement
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[]
  }

  // Resend supports up to 100 recipients per batch
  // For now, send to all at once (BCC style via 'to' array)
  if (recipients.length === 0) {
    return results
  }

  const result = await sendEmail({
    to: recipients,
    subject,
    react
  })

  if (result.success) {
    results.sent = recipients.length
  } else {
    results.failed = recipients.length
    if (result.error) {
      results.errors.push(result.error)
    }
  }

  return results
}
