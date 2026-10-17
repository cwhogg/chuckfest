import 'server-only'
import { Resend } from 'resend'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { notifications } from '@/db/schema'

/**
 * The one place messages leave the app. Every send is logged in `notifications`,
 * and a (dedupeKey, channel) pair is sent at most once, so a retried job never
 * double-sends.
 *
 * Env controls:
 * - EMAILS_DISABLED=true  kill switch: log as skipped, send nothing (email and SMS)
 * - EMAIL_TEST_MODE=true  send every email to EMAIL_TEST_RECIPIENT instead
 * - SMS_ENABLED=true      texts go out via Twilio; otherwise they are logged as skipped
 */

type Base = {
  kind: string
  dedupeKey: string
  memberId?: string | null
}

export type EmailMessage = Base & { to: string; subject: string; html: string; text?: string }
export type SmsMessage = Base & { to: string; body: string }
export type SendResult = { status: 'sent' | 'skipped' | 'failed' | 'duplicate'; error?: string }

const flag = (name: string) => process.env[name] === 'true'

let resend: Resend | undefined
function resendClient() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  resend ??= new Resend(key)
  return resend
}

/** Claim the (dedupeKey, channel) slot. Returns false if it was already used. */
async function claim(msg: Base, channel: 'email' | 'sms', recipient: string, subject?: string) {
  const rows = await db
    .insert(notifications)
    .values({
      kind: msg.kind,
      dedupeKey: msg.dedupeKey,
      memberId: msg.memberId ?? null,
      recipient,
      channel,
      subject: subject ?? null,
      status: 'sent',
    })
    .onConflictDoNothing()
    .returning({ id: notifications.id })
  return rows[0]?.id
}

async function finish(id: string, status: 'sent' | 'skipped' | 'failed', error?: string) {
  await db
    .update(notifications)
    .set({ status, error: error ?? null })
    .where(eq(notifications.id, id))
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const testMode = flag('EMAIL_TEST_MODE')
  const to = testMode ? process.env.EMAIL_TEST_RECIPIENT : msg.to
  if (!to) return { status: 'failed', error: 'EMAIL_TEST_RECIPIENT is not set' }

  const id = await claim(msg, 'email', to, msg.subject)
  if (!id) return { status: 'duplicate' }

  if (flag('EMAILS_DISABLED')) {
    await finish(id, 'skipped', 'kill switch on')
    return { status: 'skipped' }
  }

  try {
    const { error } = await resendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ChuckFest <onboarding@resend.dev>',
      to,
      subject: testMode ? `[TEST → ${msg.to}] ${msg.subject}` : msg.subject,
      html: msg.html,
      text: msg.text,
    })
    if (error) throw new Error(error.message)
    return { status: 'sent' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await finish(id, 'failed', message)
    return { status: 'failed', error: message }
  }
}

export async function sendSms(msg: SmsMessage): Promise<SendResult> {
  const id = await claim(msg, 'sms', msg.to)
  if (!id) return { status: 'duplicate' }

  if (flag('EMAILS_DISABLED') || !flag('SMS_ENABLED')) {
    await finish(id, 'skipped', 'SMS not enabled')
    return { status: 'skipped' }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from) {
    await finish(id, 'failed', 'Twilio is not configured')
    return { status: 'failed', error: 'Twilio is not configured' }
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: msg.to, From: from, Body: msg.body }),
    })
    if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`)
    return { status: 'sent' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await finish(id, 'failed', message)
    return { status: 'failed', error: message }
  }
}
